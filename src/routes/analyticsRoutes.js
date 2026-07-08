const express = require('express');
const { getAnalytics } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('officer', 'admin'));

router.get('/', getAnalytics);

module.exports = router;
