const { getSheetsClient, getSpreadsheetId } = require('./_sheets');
const { STATUS_ALIASES } = require('../../shared/workflow-constants');

const BOARD_RANGE = 'board!A2:E';
const ALLOWED_STATUSES = ['to do', 'in progress', 'in review', 'done', 'on hold'];

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
  return STATUS_ALIASES[normalized] || null;
}

function mapBoardRow(row = []) {
  return {
    date: row[0] || '',
    member: row[1] || '',
    ticket_id: row[2] || '',
    free_text: row[3] || '',
    status: normalizeStatus(row[4]) || 'to do',
  };
}

function extractTicketId(input) {
  const source = String(input || '');
  const match = source.match(/LITMUS-\d+/i);
  return match ? match[0].toUpperCase() : '';
}

function parseCellTextToRows(date, member, text) {
  const source = String(text || '').replace(/\r\n/g, '\n');
  if (!source.trim()) {
    return [];
  }

  const ticketId = extractTicketId(source);
  return [[date, member, ticketId, source, 'to do']];
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

function normalizeSheetRow(row = []) {
  const copy = row.slice(0, 5);
  while (copy.length < 5) {
    copy.push('');
  }
  return copy;
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
      const rows = (await readBoardRows(sheets, spreadsheetId)).map(mapBoardRow);

      if (date) {
        const filtered = rows.filter((row) => String(row.date || '').trim() === date);
        return response(200, {
          date,
          members: groupByMember(filtered),
        });
      }

      const groupedRows = rows.reduce((result, row) => {
        const rowDate = String(row.date || '').trim();
        if (!rowDate) {
          return result;
        }

        if (!result[rowDate]) {
          result[rowDate] = [];
        }
        result[rowDate].push(row);
        return result;
      }, {});

      const dates = Object.keys(groupedRows).sort((left, right) => right.localeCompare(left));
      const byDate = {};
      dates.forEach((rowDate) => {
        byDate[rowDate] = {
          date: rowDate,
          members: groupByMember(groupedRows[rowDate]),
        };
      });

      return response(200, {
        dates,
        by_date: byDate,
      });
    }

    if (event.httpMethod === 'POST') {
      const body = parseJsonBody(event);
      const date = String(body.date || '').trim();
      const member = String(body.member || '').trim();
      const ticketId = String(body.ticket_id || '').trim();
      const freeText = String(body.free_text || '').trim();
      const status = normalizeStatus(body.status || 'to do');

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

    if (event.httpMethod === 'PUT') {
      const body = parseJsonBody(event);
      const cells = Array.isArray(body.cells) ? body.cells : null;

      if (!cells || !cells.length) {
        return response(400, { error: 'Field "cells" must be a non-empty array.' });
      }

      const invalid = cells.find((cell) => {
        const date = String((cell || {}).date || '').trim();
        const member = String((cell || {}).member || '').trim();
        return !date || !member;
      });

      if (invalid) {
        return response(400, { error: 'Each cell requires "date" and "member".' });
      }

      const existingRows = (await readBoardRows(sheets, spreadsheetId)).map(normalizeSheetRow);
      const replaceKeys = new Set(
        cells.map((cell) => `${String(cell.date).trim()}:::${String(cell.member).trim()}`),
      );

      const keptRows = existingRows.filter((row) => {
        const key = `${String(row[0] || '').trim()}:::${String(row[1] || '').trim()}`;
        return !replaceKeys.has(key);
      });

      const replacementRows = [];
      cells.forEach((cell) => {
        const date = String(cell.date || '').trim();
        const member = String(cell.member || '').trim();
        const text = String(cell.text || '');
        replacementRows.push(...parseCellTextToRows(date, member, text));
      });

      const finalRows = [...keptRows, ...replacementRows];

      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: 'board!A2:E',
      });

      if (finalRows.length) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'board!A2:E',
          valueInputOption: 'RAW',
          requestBody: {
            values: finalRows,
          },
        });
      }

      return response(200, {
        updated_cells: cells.length,
        written_rows: replacementRows.length,
      });
    }

    return response(405, { error: `Method ${event.httpMethod} not allowed.` });
  } catch (error) {
    return response(500, { error: error.message || 'Internal server error.' });
  }
};
