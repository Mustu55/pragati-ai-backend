const express = require('express');
const { createComplaint, getMyComplaints, getComplaints } = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../utils/upload');

const router = express.Router();

// Citizen routes
router.post('/', protect, upload.single('media'), createComplaint);
router.get('/my', protect, getMyComplaints);

// Officer/Admin routes
router.get('/', protect, authorize('admin', 'officer', 'department_head'), getComplaints);

module.exports = router;
