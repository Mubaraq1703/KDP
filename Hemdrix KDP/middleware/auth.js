const jwt = require('jsonwebtoken');

/**
 * Authenticate middleware — reads JWT from HttpOnly cookie,
 * verifies it, and attaches decoded payload to req.user.
 */
const authenticate = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.clearCookie('token');
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
};

/**
 * Authorize middleware factory — restricts access to users with specific roles.
 * @param {...string} roles - Allowed role strings (e.g. 'ADMIN', 'WRITER')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}.`,
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
