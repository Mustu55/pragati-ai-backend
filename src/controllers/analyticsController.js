const Complaint = require('../models/complaintModel');
const Issue = require('../models/issueModel');
const logger = require('../utils/logger');

// @desc    Get dashboard analytics
// @route   GET /api/analytics
// @access  Private (Admin/Officer)
exports.getAnalytics = async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const resolvedComplaints = await Complaint.countDocuments({ status: 'Resolved' });
    const pendingComplaints = totalComplaints - resolvedComplaints;

    const totalIssues = await Issue.countDocuments();
    const resolvedIssues = await Issue.countDocuments({ status: 'Resolved' });
    
    // Aggregation: Complaints by Category
    const categoryStats = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Aggregation: Issues by Priority
    const priorityStats = await Issue.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    const inProgress = await Issue.countDocuments({ status: 'In Progress' });

    res.status(200).json({
      success: true,
      data: {
        totalComplaints,
        resolvedComplaints,
        pendingComplaints,
        totalIssues,
        resolvedIssues,
        inProgress,
        avgResolutionTime: '3.2 days', // TODO: calculate from resolved timestamps
        categoryDistribution: categoryStats,
        priorityDistribution: priorityStats
      }
    });
  } catch (error) {
    logger.error(`Get Analytics Error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
