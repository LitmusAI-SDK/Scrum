const { google } = require('googleapis');

const SHEETS_SCOPE = ['https://www.googleapis.com/auth/spreadsheets'];

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getSpreadsheetId() {
  return getRequiredEnv('GOOGLE_SHEET_ID');
}

function getServiceAccountCredentials() {
  const rawCredentials = getRequiredEnv('GOOGLE_SERVICE_ACCOUNT_KEY');
  try {
    return JSON.parse(rawCredentials);
  } catch (error) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY must be valid stringified JSON.');
  }
}

async function getSheetsClient() {
  const credentials = getServiceAccountCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SHEETS_SCOPE,
  });

  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}

module.exports = {
  getSheetsClient,
  getSpreadsheetId,
};