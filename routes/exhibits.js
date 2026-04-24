const express = require('express');
const router = express.Router();
const Exhibit = require('../models/Exhibit');
const Comment = require('../models/Comment');
const { protect, creatorOnly } = require('../middleware/auth');

// GET /api/exhibits — browse all approved exhibits (with search + filter + sort)
router.get('/', async (req, res) => {
  try {
    const { category, search, sortBy, page = 1, limit = 12 } = req.query;
    const match = { status: 'approved' };

    if (category && ['Art', 'Photography'].includes(category)) {
      match.category = category;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Build aggregation pipeline
    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'users',
          localField: 'creator',
          foreignField: '_id',
          as: 'creator_info'
        }
      },
      { $unwind: '$creator_info' }
    ];

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      pipeline.push({
        $match: {
          $or: [
            { title: searchRegex },
            { description: searchRegex },
            { tags: { $in: [searchRegex] } },
            { 'creator_info.name': searchRegex }
          ]
        }
      });
    }

    pipeline.push({
      $addFields: {
        likeCount: { $size: { $ifNull: ['$likes', []] } }
      }
    });

    let sortObj = { createdAt: -1 };
    if (sortBy === 'likes') sortObj = { likeCount: -1, createdAt: -1 };
    if (sortBy === 'shares') sortObj = { shareCount: -1, createdAt: -1 };
    
    pipeline.push({ $sort: sortObj });

    const totalPipeline = [...pipeline, { $count: 'total' }];
    const totalRes = await Exhibit.aggregate(totalPipeline);
    const total = totalRes.length > 0 ? totalRes[0].total : 0;

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limitNum });

    pipeline.push({
      $project: {
        title: 1,
        description: 1,
        category: 1,
        mediaLink: 1,
        mediaType: 1,
        creator: '$creator_info',
        likes: 1,
        shareCount: 1,
        tags: 1,
        createdAt: 1,
        likeCount: 1
      }
    });

    const exhibits = await Exhibit.aggregate(pipeline);

    res.json({ 
      exhibits, 
      total, 
      page: parseInt(page), 
      pages: Math.ceil(total / limitNum) 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/exhibits/:id — single exhibit detail
router.get('/:id', async (req, res) => {
  try {
    const exhibit = await Exhibit.findById(req.params.id)
      .populate('creator', 'name profilePicLink bio role');
    if (!exhibit) return res.status(404).json({ message: 'Exhibit not found' });
    res.json(exhibit);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/exhibits — create exhibit (creator only)
router.post('/', protect, creatorOnly, async (req, res) => {
  try {
    const { title, description, category, mediaLink, mediaType, tags } = req.body;
    if (!title || !description || !category || !mediaLink) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const exhibit = await Exhibit.create({
      title, description, category, mediaLink,
      mediaType: mediaType || 'image',
      tags: tags || [],
      creator: req.user.id,
      status: 'pending'
    });

    res.status(201).json({ message: 'Exhibit submitted for approval', exhibit });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/exhibits/:id — edit own exhibit (creator)
router.put('/:id', protect, creatorOnly, async (req, res) => {
  try {
    const exhibit = await Exhibit.findById(req.params.id);
    if (!exhibit) return res.status(404).json({ message: 'Exhibit not found' });
    if (exhibit.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to edit this exhibit' });
    }

    const { title, description, category, mediaLink, mediaType, tags } = req.body;
    exhibit.title = title || exhibit.title;
    exhibit.description = description || exhibit.description;
    exhibit.category = category || exhibit.category;
    exhibit.mediaLink = mediaLink || exhibit.mediaLink;
    exhibit.mediaType = mediaType || exhibit.mediaType;
    exhibit.tags = tags || exhibit.tags;
    exhibit.status = 'pending'; // re-submit for approval after edit

    await exhibit.save();
    res.json({ message: 'Exhibit updated and re-submitted for approval', exhibit });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/exhibits/:id — delete (own creator or admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const exhibit = await Exhibit.findById(req.params.id);
    if (!exhibit) return res.status(404).json({ message: 'Exhibit not found' });

    const isOwner = exhibit.creator.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Exhibit.findByIdAndDelete(req.params.id);
    await Comment.deleteMany({ exhibit: req.params.id });
    res.json({ message: 'Exhibit deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/exhibits/:id/like — toggle like
router.post('/:id/like', protect, async (req, res) => {
  try {
    const exhibit = await Exhibit.findById(req.params.id);
    if (!exhibit) return res.status(404).json({ message: 'Exhibit not found' });

    const idx = exhibit.likes.indexOf(req.user.id);
    if (idx === -1) {
      exhibit.likes.push(req.user.id);
    } else {
      exhibit.likes.splice(idx, 1);
    }
    await exhibit.save();
    res.json({ likes: exhibit.likes.length, liked: idx === -1 });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/exhibits/:id/comment — add comment
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Comment cannot be empty' });

    const exhibit = await Exhibit.findById(req.params.id);
    if (!exhibit) return res.status(404).json({ message: 'Exhibit not found' });

    const comment = await Comment.create({ exhibit: req.params.id, author: req.user.id, text });
    await comment.populate('author', 'name profilePicLink');
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/exhibits/:id/comments
router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ exhibit: req.params.id })
      .populate('author', 'name profilePicLink')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/exhibits/:id/share — increment share count
router.post('/:id/share', async (req, res) => {
  try {
    const exhibit = await Exhibit.findByIdAndUpdate(
      req.params.id, { $inc: { shareCount: 1 } }, { new: true }
    );
    if (!exhibit) return res.status(404).json({ message: 'Exhibit not found' });
    res.json({ shareCount: exhibit.shareCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
