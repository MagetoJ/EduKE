const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    console.log('Auth middleware: No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Auth middleware: Token verification failed', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission for this resource' });
    }

    next();
  };
};

const requireFeature = (feature) => {
  return (req, res, next) => {
    // TODO: Implement feature checking logic
    next();
  };
};

module.exports = { authenticateToken, authorizeRole, requireFeature };