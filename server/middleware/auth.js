const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

function authenticateSocket(socket, next) {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication failed: Token missing'));
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication failed: Invalid token'));
    }

    // Attach the decoded token data to the socket for later use
    socket.decoded = decoded;
    // Continue with the connection
    next();
  });
}

module.exports = authenticateSocket;
