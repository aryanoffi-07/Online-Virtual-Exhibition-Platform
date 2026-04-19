const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  exhibit: { type: mongoose.Schema.Types.ObjectId, ref: 'Exhibit', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);
