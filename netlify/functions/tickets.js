const { getSheetsClient, getSpreadsheetId } = require('./_sheets');

const TICKETS_RANGE = 'tickets!A2:E';
const ALLOWED_STATUSES = ['todo', 'in prog', 'review', 'done', 'on hold'];

function buildHeaders() {
  return {
    'Content-Type': 'application/json',
  };
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: buildHeaders(),
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

function mapTicketRow(row = []) {
  return {
    id: row[0] || '',
    title: row[1] || '',
    description: row[2] || '',
    status: normalizeStatus(row[3]) || 'todo',
    created_at: row[4] || '',
  };
}

function computeNextTicketId(rows) {
  let maxTicketNumber = 0;

  rows.forEach((row) => {
    const match = String(row[0] || '').match(/^LITMUS-(\d+)$/i);
    if (!match) {
      return;
    }

    const value = Number.parseInt(match[1], 10);
    if (!Number.isNaN(value)) {
      maxTicketNumber = Math.max(maxTicketNumber, value);
    }
  });

  return `LITMUS-${String(maxTicketNumber + 1).padStart(3, '0')}`;
}

async function readTicketRows(sheets, spreadsheetId) {
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: TICKETS_RANGE,
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
      const rows = await readTicketRows(sheets, spreadsheetId);
      const tickets = rows.map(mapTicketRow);
      return response(200, tickets);
    }

    if (event.httpMethod === 'POST') {
      const body = parseJsonBody(event);
      const title = String(body.title || '').trim();
      const description = String(body.description || '').trim();
      const status = normalizeStatus(body.status || 'todo');

      if (!title) {
        return response(400, { error: 'Field "title" is required.' });
      }

      if (!status) {
        return response(400, {
          error: `Field "status" must be one of: ${ALLOWED_STATUSES.join(', ')}.`,
        });
      }

      const rows = await readTicketRows(sheets, spreadsheetId);
      const id = computeNextTicketId(rows);
      const createdAt = new Date().toISOString();
      const newRow = [id, title, description, status, createdAt];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'tickets!A:E',
        valueInputOption: 'RAW',
        requestBody: {
          values: [newRow],
        },
      });

      return response(201, mapTicketRow(newRow));
    }

    if (event.httpMethod === 'PATCH') {
      const body = parseJsonBody(event);
      const id = String(body.id || '').trim();
      const status = normalizeStatus(body.status);

      if (!id) {
        return response(400, { error: 'Field "id" is required.' });
      }

      if (!status) {
        return response(400, {
          error: `Field "status" must be one of: ${ALLOWED_STATUSES.join(', ')}.`,
        });
      }

      const rows = await readTicketRows(sheets, spreadsheetId);
      const rowIndex = rows.findIndex((row) => String(row[0] || '').trim() === id);

      if (rowIndex === -1) {
        return response(404, { error: `Ticket ${id} not found.` });
      }

      const targetRowNumber = rowIndex + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `tickets!D${targetRowNumber}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[status]],
        },
      });

      const updatedRow = rows[rowIndex].slice();
      updatedRow[3] = status;
      return response(200, mapTicketRow(updatedRow));
    }

    return response(405, { error: `Method ${event.httpMethod} not allowed.` });
  } catch (error) {
    return response(500, { error: error.message || 'Internal server error.' });
  }
};