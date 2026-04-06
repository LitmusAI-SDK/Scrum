const { getSheetsClient, getSpreadsheetId } = require('./_sheets');

const BOARD_RANGE = 'board!A2:E';
const ALLOWED_STATUSES = ['todo', 'in prog', 'review', 'done', 'on hold'];

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

function parseJsonBody(event) {
  if (!event.body) {
    return {};
  }

  try {
    return JSON.parse(event.body);
  } catch (error) {
    throw new Error('Request body must be valid JSON.');
  }
}

function normalizeStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  return ALLOWED_STATUSES.includes(normalized) ? normalized : null;
}

function mapBoardRow(row = []) {
  return {
    date: row[0] || '',
    member: row[1] || '',
    ticket_id: row[2] || '',
    free_text: row[3] || '',
    status: normalizeStatus(row[4]) || 'todo',
  };
}

function groupByMember(items) {
  return items.reduce((result, item) => {
    const member = item.member || 'Unassigned';
    if (!result[member]) {
      result[member] = [];
    }

    result[member].push(item);
    return result;
  }, {});
}

async function readBoardRows(sheets, spreadsheetId) {
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: BOARD_RANGE,
  });
  return result.data.values || [];
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return response(200, { ok: true });
  }

  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    if (event.httpMethod === 'GET') {
      const date = String((event.queryStringParameters || {}).date || '').trim();
      if (!date) {
        return response(400, { error: 'Query parameter "date" is required (YYYY-MM-DD).' });
      }

      const rows = await readBoardRows(sheets, spreadsheetId);
      const filtered = rows
        .filter((row) => String(row[0] || '').trim() === date)
        .map(mapBoardRow);

      return response(200, {
        date,
        members: groupByMember(filtered),
      });
    }

    if (event.httpMethod === 'POST') {
      const body = parseJsonBody(event);
      const date = String(body.date || '').trim();
      const member = String(body.member || '').trim();
      const ticketId = String(body.ticket_id || '').trim();
      const freeText = String(body.free_text || '').trim();
      const status = normalizeStatus(body.status || 'todo');

      if (!date) {
        return response(400, { error: 'Field "date" is required.' });
      }

      if (!member) {
        return response(400, { error: 'Field "member" is required.' });
      }

      if (!ticketId && !freeText) {
        return response(400, { error: 'Provide either "ticket_id" or "free_text".' });
      }

      if (!status) {
        return response(400, {
          error: `Field "status" must be one of: ${ALLOWED_STATUSES.join(', ')}.`,
        });
      }

      const row = [date, member, ticketId, freeText, status];
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'board!A:E',
        valueInputOption: 'RAW',
        requestBody: {
          values: [row],
        },
      });

      return response(201, mapBoardRow(row));
    }

    return response(405, { error: `Method ${event.httpMethod} not allowed.` });
  } catch (error) {
    return response(500, { error: error.message || 'Internal server error.' });
  }
};