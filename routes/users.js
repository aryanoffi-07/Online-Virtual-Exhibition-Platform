const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Exhibit = require('../models/Exhibit');
const { protect } = require('../middleware/auth');

// GET /api/users/profile — get own profile + their exhibits
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const exhibits = await Exhibit.find({ creator: req.user.id }).sort({ createdAt: -1 });
    res.json({ user, exhibits });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/users/profile — update own profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, bio, profilePicLink } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (profilePicLink !== undefined) user.profilePicLink = profilePicLink;

    await user.save();
    res.json({ message: 'Profile updated', user: { id: user._id, name: user.name, bio: user.bio, profilePicLink: user.profilePicLink, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/users/:id — public profile of a user
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -isBanned');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const exhibits = await Exhibit.find({ creator: req.params.id, status: 'approved' })
      .sort({ createdAt: -1 });
    res.json({ user, exhibits });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
