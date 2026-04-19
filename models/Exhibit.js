const mongoose = require('mongoose');

const exhibitSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: String, enum: ['Art', 'Photography'], required: true },
  mediaLink: { type: String, required: true },
  mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  shareCount: { type: Number, default: 0 },
  tags: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Exhibit', exhibitSchema);
