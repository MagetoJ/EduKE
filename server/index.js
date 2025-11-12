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

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(PORT, () => {
  console.log(`Node.js backend running on http://localhost:${PORT}`);
});

module.exports = { app, db };
