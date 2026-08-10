const express = require('express');
const multer = require('multer');
const {
    createTargetedPublication,
    getAdminTargetedPublications,
    getUserTargetedPublications,
    respondToTargetedPublication,
    updateTargetedPublicationGroup,
    deleteTargetedPublicationGroup
} = require('../controllers/targetedPublicationController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }
});

router.use(protect);

router.get('/user', getUserTargetedPublications);
router.get('/admin', admin, getAdminTargetedPublications);
router.post('/admin', admin, upload.single('image'), createTargetedPublication);
router.put('/admin/group/:groupId', admin, upload.single('image'), updateTargetedPublicationGroup);
router.delete('/admin/group/:groupId', admin, deleteTargetedPublicationGroup);
router.patch('/:id/respond', respondToTargetedPublication);

module.exports = router;
