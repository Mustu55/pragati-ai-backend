const express = require('express');
const { chat, getGovernanceBrief } = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Citizen Chatbot
router.post('/chat', protect, chat);

// Admin Governance Brief
router.get('/governance-brief', protect, authorize('admin', 'officer', 'department_head'), getGovernanceBrief);

module.exports = router;
