const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const {JWT_SECRET} = require('./config');
const authenticateSocket = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;
const connectedSockets = [];
let currentPerformerIndex = 0;
let timer;

app.use(express.json());

// api for generating JWT token
app.post('/generateToken', (req, res) => {
  const {deviceId, deviceName} = req.body;

  if (!deviceId || !deviceName) {
    return res
      .status(400)
      .json({error: 'Missing deviceId or deviceName in the request body'});
  }

  // Payload to be included in the JWT
  const payload = {
    deviceId,
    deviceName,
  };

  // Sign the JWT token
  const token = jwt.sign(payload, JWT_SECRET);

  // Send the generated token back to the user
  res.json({token});
});

// Function to switch roles and notify clients
const switchRole = () => {
  if (connectedSockets.length === 0) return;

  // Switch role for the current performer
  io.to(connectedSockets[currentPerformerIndex].id).emit(
    'switchRole',
    'audience',
  );

  // Move to the next performer
  currentPerformerIndex = (currentPerformerIndex + 1) % connectedSockets.length;

  // Switch role for the new performer
  io.to(connectedSockets[currentPerformerIndex].id).emit(
    'switchRole',
    'performer',
  );

  // Set a timer for the next role switch after 2 minutes
  timer = setTimeout(() => {
    switchRole();
  }, 2 * 60 * 1000);
};

// Function to broadcast notification for next performer
const sendNotification = () => {
  if (connectedSockets.length === 0) return;
  let nextPerformerIndex =
    (currentPerformerIndex + 1) % connectedSockets.length;

  // broadcast notification
  io.emit(
    'notification',
    `Next performer will be Mr. ${connectedSockets[nextPerformerIndex].name}`,
  );

  // Set a timer for the next notification after 10s before 2 minutes
  setTimeout(() => {
    sendNotification();
  }, 2 * 60 * 1000 - 10 * 1000);
};

// WebSocket connection handling
io.use(authenticateSocket).on('connection', socket => {
  console.log('A user connected', socket.id, socket.decoded.deviceName);

  // Add the socket to the list of connected sockets
  connectedSockets.push({id: socket.id, name: socket.decoded.deviceName});

  // Emit the initial role to the connected client
  const initialRole = connectedSockets.length === 1 ? 'performer' : 'audience';
  socket.emit('initialRole', initialRole);

  // Disconnect event
  socket.on('disconnect', () => {
    console.log('User disconnected');

    // Remove the socket from the list of connected sockets
    const socketIndex = connectedSockets.findIndex(
      item => item.id === socket.id,
    );
    if (socketIndex !== -1) {
      connectedSockets.splice(socketIndex, 1);
    }

    // If the disconnecting user was the current performer, switch to the next performer
    if (socket.id === connectedSockets[currentPerformerIndex]) {
      switchRole();
    }
  });
});

// Start the initial role switch timer
setTimeout(() => {
  switchRole();
}, 2 * 60 * 1000);
setTimeout(() => {
  sendNotification();
}, 2 * 60 * 1000 - 10 * 1000);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
