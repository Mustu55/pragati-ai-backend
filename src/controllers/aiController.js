const aiService = require('../services/aiService');
const Issue = require('../models/issueModel');
const Complaint = require('../models/complaintModel');
const logger = require('../utils/logger');

// @desc    Get AI Chatbot response
// @route   POST /api/ai/chat
// @access  Private (Citizen)
exports.chat = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const complaints = await Complaint.find({ user: req.user.id })
      .sort('-createdAt')
      .limit(5)
      .select('text category status location createdAt');

    const reply = await aiService.chat(message, {
      user: {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role
      },
      complaints
    });
    
    res.status(200).json({
      success: true,
      data: { reply }
    });
  } catch (error) {
    logger.error(`AI Chat Error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to get AI response' });
  }
};

// @desc    Generate Governance Brief
// @route   GET /api/ai/governance-brief
// @access  Private (Admin/Officer)
exports.getGovernanceBrief = async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({ success: true, data: { brief: "Gemini API key missing. Unable to generate brief." }});
    }

    // Fetch top issues to provide as context
    const topIssues = await Issue.find({ status: { $ne: 'Resolved' } })
      .sort('-impactScore')
      .limit(10)
      .select('title summary category impactScore priority duplicateCount');

    const briefText = await aiService.generateGovernanceBrief(topIssues);

    res.status(200).json({
      success: true,
      data: { brief: briefText }
    });
  } catch (error) {
    logger.error(`Governance Brief Error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to generate brief' });
  }
};
