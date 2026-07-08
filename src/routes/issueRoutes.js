const express = require('express');
const { getIssues, getIssue, updateIssue } = require('../controllers/issueController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All issue routes are protected and restricted to admin/officer
router.use(protect);
router.use(authorize('admin', 'officer', 'department_head'));

router.get('/', getIssues);
router.get('/:id', getIssue);
router.put('/:id', updateIssue);

module.exports = router;
