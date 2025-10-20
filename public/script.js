// ======= SOCKET.IO CONNECTION =======
const socket = io();

// ======= DOM ELEMENTS =======
const joinBtn = document.getElementById('joinBtn');
const usernameInput = document.getElementById('username');
const roomInput = document.getElementById('room');
const messagesDiv = document.getElementById('messages');
const typingDiv = document.getElementById('typing');
const msgForm = document.getElementById('msgForm');
const msgInput = document.getElementById('msgInput');

let username = null;
let currentRoom = null;
let typingTimeout;

// ======= HELPER FUNCTION TO ESCAPE HTML =======
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/\'/g, "&#039;");
}

// ======= FUNCTION TO ADD MESSAGE TO CHAT =======
function addMessage(msg, me = false) {
  const el = document.createElement('div');
  el.className = 'message' + (me ? ' me' : '');
  const time = new Date(msg.createdAt || Date.now()).toLocaleTimeString();
  el.innerHTML = `<strong>${msg.username}</strong> <small>${time}</small><div>${escapeHtml(msg.text)}</div>`;
  messagesDiv.appendChild(el);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ======= JOIN ROOM =======
joinBtn.addEventListener('click', () => {
  username = usernameInput.value.trim() || 'Anonymous';
  const room = roomInput.value.trim() || 'general';
  currentRoom = room;

  socket.emit('join-room', room, username);
  messagesDiv.innerHTML = '';
  document.querySelector(".chat").style.display = "block"; // show chat area
});

// ======= RECEIVE ROOM HISTORY =======
socket.on('room-history', messages => {
  messages.forEach(m => addMessage(m, m.socketId === socket.id));
});

// ======= RECEIVE NEW MESSAGE =======
socket.on('new-message', m => addMessage(m, m.socketId === socket.id));

// ======= TYPING INDICATOR =======
socket.on('typing', ({ username: u, isTyping }) => {
  typingDiv.textContent = isTyping ? `${u} is typing...` : '';
});

// ======= SEND MESSAGE =======
msgForm.addEventListener('submit', e => {
  e.preventDefault();
  const text = msgInput.value.trim();
  if (!text || !currentRoom) return alert('Join a room first');
  socket.emit('send-message', { room: currentRoom, text, username });
  msgInput.value = '';
  socket.emit('typing', { room: currentRoom, isTyping: false });
});

// ======= TYPING EVENT =======
msgInput.addEventListener('input', () => {
  if (!currentRoom) return;
  socket.emit('typing', { room: currentRoom, isTyping: true });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit('typing', { room: currentRoom, isTyping: false }), 1000);
});

// ======= USER JOINED/LEFT MESSAGES =======
socket.on('user-joined', ({ username }) => {
  const el = document.createElement('div');
  el.className = 'message system';
  el.textContent = `${username} joined the room`;
  messagesDiv.appendChild(el);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

socket.on('user-left', ({ username }) => {
  const el = document.createElement('div');
  el.className = 'message system';
  el.textContent = `${username} left the room`;
  messagesDiv.appendChild(el);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});
