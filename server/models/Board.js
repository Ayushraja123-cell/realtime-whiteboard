const mongoose = require('mongoose');

const VersionSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  name: { type: String, default: 'Snapshot' },
  elements: [{ type: mongoose.Schema.Types.Mixed }]
});

const BoardSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  name: { type: String, default: '' },
  owner: { type: String },
  thumbnail: { type: String },
  strokes: [{ type: mongoose.Schema.Types.Mixed }],
  versions: [VersionSchema]
});

module.exports = mongoose.model('Board', BoardSchema);
