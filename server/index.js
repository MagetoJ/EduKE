const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { publicRouter } = require('./routes/public');
const { secureRouter } = require('./routes/secure');
const { authenticateToken } = require('./middleware/auth');
const { db } = require('./database');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api', publicRouter);
app.use('/api', authenticateToken, secureRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) {
    return next(err);
  }
  const status = typeof err.status === 'number' ? err.status : 500;
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message || 'Internal server error' });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(PORT, () => {
  console.log(`Node.js backend running on http://localhost:${PORT}`);
});

module.exports = { app, db };
