require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

let Message;
try { Message = require('./models/Message'); } catch(e) { Message = null; }

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

let messageBuffer = [];
const MAX_BUFFER = 200;

io.on('connection', socket => {
  console.log('New client connected', socket.id);

  socket.on('join-room', (room, username) => {
    socket.join(room);
    socket.data.username = username || 'Anonymous';
    socket.data.room = room;
    console.log(`${socket.data.username} joined ${room}`);

    // Send room history
    if (process.env.MONGO_URI && Message) {
      Message.find({ room }).sort({ createdAt: 1 }).limit(200).exec()
        .then(messages => socket.emit('room-history', messages))
        .catch(err => console.error(err));
    } else {
      const history = messageBuffer.filter(m => m.room === room).slice(-100);
      socket.emit('room-history', history);
    }

    // Notify others
    socket.to(room).emit('user-joined', { id: socket.id, username: socket.data.username });
  });

  socket.on('send-message', async payload => {
    const room = payload.room || socket.data.room || 'global';
    const message = {
      text: payload.text,
      username: socket.data.username || payload.username || 'Anonymous',
      socketId: socket.id,
      room,
      createdAt: new Date()
    };

    if (process.env.MONGO_URI && Message) {
      try {
        const doc = await Message.create(message);
        io.to(room).emit('new-message', doc);
      } catch (err) {
        console.error('DB save error', err);
      }
    } else {
      messageBuffer.push(message);
      if (messageBuffer.length > MAX_BUFFER) messageBuffer.shift();
      io.to(room).emit('new-message', message);
    }
  });

  socket.on('typing', ({ room, isTyping }) => {
    const r = room || socket.data.room || 'global';
    socket.to(r).emit('typing', { username: socket.data.username, isTyping });
  });

  socket.on('disconnect', () => {
    const room = socket.data.room;
    if (room) socket.to(room).emit('user-left', { id: socket.id, username: socket.data.username });
    console.log('Client disconnected', socket.id);
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;

// ====== UPDATED: Listen on all network interfaces ======
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => {
      console.log('MongoDB connected');
      server.listen(PORT, '0.0.0.0', () => console.log(`Server running on ${PORT}`));
    })
    .catch(err => {
      console.error('MongoDB connection error', err);
      server.listen(PORT, '0.0.0.0', () => console.log(`Server running on ${PORT}`));
    });
} else {
  server.listen(PORT, '0.0.0.0', () => console.log(`Server running on ${PORT}`));
}
