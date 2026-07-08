const Complaint = require('../models/complaintModel');
const Issue = require('../models/issueModel');
const aiService = require('../services/aiService');
const logger = require('../utils/logger');

// @desc    Create new complaint
// @route   POST /api/complaints
// @access  Private (Citizen)
exports.createComplaint = async (req, res) => {
  try {
    const { title, description, location, category } = req.body;

    // Validate required fields
    if (!description || !location) {
      return res.status(400).json({ success: false, message: 'Description and location are required' });
    }

    let mediaUrl = null;
    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
    }

    // 1. AI Analysis
    let aiData = {
      category: category || 'Other',
      urgency: 'Medium',
      department: 'General',
      summary: description.substring(0, 100)
    };

    try {
      if (process.env.GEMINI_API_KEY) {
         aiData = await aiService.classifyComplaint(description);
         aiData.category = category || aiData.category; // prefer user-selected category
         
         if (req.file) {
             const imageAnalysis = await aiService.analyzeImage(req.file.path);
             if (imageAnalysis && imageAnalysis.severity === 'Critical') aiData.urgency = 'Critical';
         }
      }
    } catch (aiErr) {
      logger.warn(`AI Analysis failed, proceeding with fallback data. Error: ${aiErr.message}`);
    }

    // 2. Save Complaint
    const complaint = await Complaint.create({
      user: req.user.id,
      text: description,
      location: { address: location },
      mediaUrl,
      category: aiData.category,
      urgency: aiData.urgency,
      department: aiData.department,
      aiSummary: aiData.summary
    });

    // 3. Create Issue to group this complaint (simplistic 1:1 mapping for now)
    let priority = 'Medium';
    let impactScore = 50;
    if (aiData.urgency === 'Critical') { priority = 'Critical'; impactScore = 90; }
    else if (aiData.urgency === 'High') { priority = 'High'; impactScore = 75; }
    else if (aiData.urgency === 'Low') { priority = 'Low'; impactScore = 20; }

    const issue = await Issue.create({
      title: title || `${aiData.category} Issue at ${location}`,
      summary: aiData.summary,
      category: aiData.category,
      department: aiData.department,
      impactScore,
      priority,
      location: { address: location },
      duplicateCount: 1,
      linkedComplaints: [complaint._id]
    });

    complaint.linkedIssue = issue._id;
    await complaint.save();

    res.status(201).json({
      success: true,
      data: complaint
    });
  } catch (error) {
    logger.error(`Create Complaint Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Get all complaints for logged in user
// @route   GET /api/complaints/my
// @access  Private (Citizen)
exports.getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ user: req.user.id }).sort('-createdAt');
    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all complaints (Admin/Officer)
// @route   GET /api/complaints
// @access  Private (Officer/Admin)
exports.getComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find().populate('user', 'name email').sort('-createdAt');
    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
