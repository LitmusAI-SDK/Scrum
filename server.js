const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const PUBLIC_DIR = path.join(__dirname, 'public');
const FUNCTIONS_DIR = path.join(__dirname, 'netlify', 'functions');
const FUNCTION_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;

function resolveFunctionPath(rawName) {
  const functionName = String(rawName || '').trim();
  if (!FUNCTION_NAME_PATTERN.test(functionName)) {
    return null;
  }

  const resolved = path.resolve(FUNCTIONS_DIR, `${functionName}.js`);
  if (!resolved.startsWith(`${FUNCTIONS_DIR}${path.sep}`)) {
    return null;
  }

  if (!fs.existsSync(resolved)) {
    return null;
  }

  return resolved;
}

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

app.all('/api/*', async (req, res) => {
  const functionPath = resolveFunctionPath(req.params[0]);
  if (!functionPath) {
    res.status(404).json({ error: 'Function not found.' });
    return;
  }

  try {
    delete require.cache[require.resolve(functionPath)];
    const loaded = require(functionPath);
    const handler = loaded && loaded.handler;
    if (typeof handler !== 'function') {
      res.status(500).json({ error: 'Function handler is invalid.' });
      return;
    }

    const event = {
      httpMethod: req.method,
      queryStringParameters: req.query,
      body: req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : null,
    };

    const response = await handler(event);

    const statusCode = Number(response && response.statusCode) || 200;
    res.status(statusCode).set((response && response.headers) || {});

    if (response && typeof response.body === 'string') {
      res.send(response.body);
      return;
    }

    res.json((response && response.body) || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Function error' });
  }
});

app.get('/*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
