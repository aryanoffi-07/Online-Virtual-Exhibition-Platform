const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Exhibit = require('../models/Exhibit');
const Comment = require('../models/Comment');
const { protect, adminOnly } = require('../middleware/auth');

// All admin routes require auth + admin role
router.use(protect, adminOnly);

// GET /api/admin/stats — dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalExhibits = await Exhibit.countDocuments();
    const pendingExhibits = await Exhibit.countDocuments({ status: 'pending' });
    const approvedExhibits = await Exhibit.countDocuments({ status: 'approved' });
    const rejectedExhibits = await Exhibit.countDocuments({ status: 'rejected' });
    const totalComments = await Comment.countDocuments();
    res.json({ totalUsers, totalExhibits, pendingExhibits, approvedExhibits, rejectedExhibits, totalComments });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/admin/users — all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/admin/users/:id — change role or ban/unban
router.put('/users/:id', async (req, res) => {
  try {
    const { role, isBanned } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (role && ['visitor', 'creator', 'admin'].includes(role)) user.role = role;
    if (isBanned !== undefined) user.isBanned = isBanned;

    await user.save();
    res.json({ message: 'User updated', user: { id: user._id, name: user.name, role: user.role, isBanned: user.isBanned } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }
    await User.findByIdAndDelete(req.params.id);
    await Exhibit.deleteMany({ creator: req.params.id });
    res.json({ message: 'User and their exhibits deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/admin/exhibits — all exhibits (all statuses)
router.get('/exhibits', async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const exhibits = await Exhibit.find(query)
      .populate('creator', 'name email')
      .sort({ createdAt: -1 });
    res.json(exhibits);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/admin/exhibits/:id/approve
router.put('/exhibits/:id/approve', async (req, res) => {
  try {
    const exhibit = await Exhibit.findByIdAndUpdate(
      req.params.id, { status: 'approved' }, { new: true }
    );
    if (!exhibit) return res.status(404).json({ message: 'Exhibit not found' });
    res.json({ message: 'Exhibit approved', exhibit });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/admin/exhibits/:id/reject
router.put('/exhibits/:id/reject', async (req, res) => {
  try {
    const exhibit = await Exhibit.findByIdAndUpdate(
      req.params.id, { status: 'rejected' }, { new: true }
    );
    if (!exhibit) return res.status(404).json({ message: 'Exhibit not found' });
    res.json({ message: 'Exhibit rejected', exhibit });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/admin/exhibits/:id
router.delete('/exhibits/:id', async (req, res) => {
  try {
    await Exhibit.findByIdAndDelete(req.params.id);
    await Comment.deleteMany({ exhibit: req.params.id });
    res.json({ message: 'Exhibit deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
