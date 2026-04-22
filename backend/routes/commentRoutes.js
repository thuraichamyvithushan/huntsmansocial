const express = require('express');
const { addComment, getComments, getAdminNotifications, getUserNotifications } = require('../controllers/commentController');
const { protect, admin } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(protect);

router.post('/', addComment);
router.get('/admin/notifications', admin, getAdminNotifications);
router.get('/user/notifications', getUserNotifications);
router.get('/:postId', getComments);

module.exports = router;
