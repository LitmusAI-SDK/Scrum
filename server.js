const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.all('/api/*', async (req, res) => {
  const functionName = req.params[0];
  try {
    const handler = require(`./netlify/functions/${functionName}`).handler;
    const event = {
      httpMethod: req.method,
      queryStringParameters: req.query,
      body: req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : null,
    };
    const response = await handler(event);
    res.status(response.statusCode || 200).set(response.headers || {}).send(response.body);
  } catch (err) {
    console.error(err);
    res.status(500).send('Function error');
  }
});

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
