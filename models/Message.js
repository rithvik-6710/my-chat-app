const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  text: { type: String, required: true },
  username: { type: String, default: 'Anonymous' },
  socketId: { type: String },
  room: { type: String, default: 'global' }
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
