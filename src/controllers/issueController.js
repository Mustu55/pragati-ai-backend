const Issue = require('../models/issueModel');
const Complaint = require('../models/complaintModel');
const logger = require('../utils/logger');
const aiService = require('../services/aiService'); // We will add clustering logic to this later if needed

const ISSUE_STATUS_TO_COMPLAINT_STATUS = {
  Open: 'Pending',
  'In Progress': 'Processing',
  Resolved: 'Resolved',
  Done: 'Resolved'
};

const normalizeIssueStatus = (status) => {
  if (!status) return undefined;
  return status === 'Done' ? 'Resolved' : status;
};

// @desc    Get all community issues
// @route   GET /api/issues
// @access  Private (Admin/Officer)
exports.getIssues = async (req, res) => {
  try {
    const issues = await Issue.find({
      linkedComplaints: { $exists: true, $not: { $size: 0 } }
    })
      .populate('assignedTo', 'name email')
      .sort('-impactScore'); // sort by priority

    res.status(200).json({
      success: true,
      count: issues.length,
      data: issues
    });
  } catch (error) {
    logger.error(`Get Issues Error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single issue with its linked complaints
// @route   GET /api/issues/:id
// @access  Private (Admin/Officer)
exports.getIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('linkedComplaints')
      .populate('assignedTo', 'name email');

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    res.status(200).json({
      success: true,
      data: issue
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update issue status or assignment
// @route   PUT /api/issues/:id
// @access  Private (Admin/Officer)
exports.updateIssue = async (req, res) => {
  try {
    const { status, assignedTo } = req.body;
    const normalizedStatus = normalizeIssueStatus(status);
    const update = {};

    if (normalizedStatus) update.status = normalizedStatus;
    if (assignedTo) update.assignedTo = assignedTo;
    
    const issue = await Issue.findByIdAndUpdate(
      req.params.id, 
      update,
      { new: true, runValidators: true }
    );

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    if (normalizedStatus && ISSUE_STATUS_TO_COMPLAINT_STATUS[normalizedStatus]) {
      await Complaint.updateMany(
        { _id: { $in: issue.linkedComplaints } },
        { status: ISSUE_STATUS_TO_COMPLAINT_STATUS[normalizedStatus] }
      );
    }

    res.status(200).json({
      success: true,
      data: issue
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
