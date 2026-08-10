const TargetedPublication = require('../models/TargetedPublication');
const User = require('../models/User');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');
const { uploadToFirebase } = require('../utils/firebaseStorage');
const crypto = require('crypto');

const buildFrontendUrl = (path = '') => {
    const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
    return `${baseUrl.replace(/\/$/, '')}${path}`;
};

const buildPublicationGroupId = (publication) => {
    if (publication.publicationGroupId) {
        return publication.publicationGroupId;
    }

    const createdAt = publication.createdAt ? new Date(publication.createdAt) : new Date(0);
    const minuteBucket = `${createdAt.getFullYear()}-${createdAt.getMonth()}-${createdAt.getDate()}-${createdAt.getHours()}-${createdAt.getMinutes()}`;

    return [
        publication.text || '',
        publication.imageUrl || '',
        publication.createdBy?.toString?.() || publication.createdBy || '',
        minuteBucket
    ].join('::');
};

const getPublicationsByGroupId = async (groupId) => {
    const publications = await TargetedPublication.find({});
    return publications.filter((publication) => buildPublicationGroupId(publication) === groupId);
};

const parseTargetEmails = (body) => {
    if (Array.isArray(body.targetEmails)) {
        return body.targetEmails;
    }

    if (typeof body.targetEmails === 'string') {
        try {
            const parsed = JSON.parse(body.targetEmails);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return body.targetEmails
                .split(',')
                .map((email) => email.trim())
                .filter(Boolean);
        }
    }

    if (typeof body.targetEmail === 'string' && body.targetEmail.trim()) {
        return [body.targetEmail.trim()];
    }

    return [];
};

// @desc    Create targeted publications for one or more users
// @route   POST /api/targeted-publications/admin
// @access  Private/Admin
exports.createTargetedPublication = async (req, res) => {
    try {
        const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
        const targetEmails = [...new Set(
            parseTargetEmails(req.body)
                .map((email) => email.toLowerCase())
                .filter(Boolean)
        )];

        if (!text && !req.file) {
            return res.status(400).json({ message: 'Add text or an image before publishing.' });
        }

        if (targetEmails.length === 0) {
            return res.status(400).json({ message: 'Select at least one user email before publishing.' });
        }

        const targetUsers = await User.find({
            email: { $in: targetEmails },
            status: 'approved',
            role: 'user'
        }).select('name email');

        if (targetUsers.length !== targetEmails.length) {
            return res.status(404).json({ message: 'One or more selected users were not found.' });
        }

        let imageUrl = '';
        if (req.file) {
            imageUrl = await uploadToFirebase(req.file);
        }

        const publicationGroupId = crypto.randomUUID();
        const createdPublications = [];
        let emailFailures = 0;

        for (const targetUser of targetUsers) {
            const publication = await TargetedPublication.create({
                publicationGroupId,
                text,
                imageUrl,
                targetUser: targetUser._id,
                targetEmail: targetUser.email,
                createdBy: req.user._id
            });

            createdPublications.push(publication);

            await Notification.create({
                type: 'targeted_publication',
                message: 'A private publication has been shared with you.',
                userId: targetUser._id,
                targetedPublicationId: publication._id,
                targetedPublicationGroupId: publicationGroupId,
                audience: 'user'
            });

            try {
                await sendEmail({
                    email: targetUser.email,
                    subject: 'New Private Publication - HO SOCIAL',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; background: #ffffff;">
                            <h1 style="margin: 0 0 8px; font-size: 32px; font-weight: 900; text-transform: uppercase;">HO SOCIAL</h1>
                            <p style="margin: 0 0 24px; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #6b7280;">Private admin publication</p>
                            <p style="font-size: 16px; line-height: 1.7; color: #111827;">
                                Hello <strong>${targetUser.name}</strong>, a new private publication has been shared with you.
                            </p>
                            ${text ? `<div style="margin: 24px 0; padding: 16px; background: #f9fafb; border-left: 4px solid #111827; white-space: pre-wrap; color: #111827;">${text}</div>` : ''}
                            <a href="${buildFrontendUrl('/my-publications')}" style="display: inline-block; margin-top: 16px; padding: 14px 24px; background: #111827; color: #ffffff; text-decoration: none; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                                View Publication
                            </a>
                        </div>
                    `
                });
            } catch (error) {
                emailFailures += 1;
                console.error(`Targeted publication email failed for ${targetUser.email}:`, error.message);
            }
        }

        const populatedPublications = await TargetedPublication.find({
            _id: { $in: createdPublications.map((publication) => publication._id) }
        })
            .populate('targetUser', 'name email')
            .populate('createdBy', 'name email')
            .sort('-createdAt');

        res.status(201).json({
            message: emailFailures === 0
                ? `Publications sent to ${targetUsers.length} selected user${targetUsers.length > 1 ? 's' : ''}.`
                : `Publications saved, but ${emailFailures} email${emailFailures > 1 ? 's' : ''} could not be sent.`,
            emailSent: emailFailures === 0,
            publications: populatedPublications,
            emailFailures
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all targeted publications for admin review
// @route   GET /api/targeted-publications/admin
// @access  Private/Admin
exports.getAdminTargetedPublications = async (req, res) => {
    try {
        const publications = await TargetedPublication.find({})
            .populate('targetUser', 'name email')
            .populate('createdBy', 'name email')
            .sort('-createdAt');

        res.json(publications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a targeted publication group
// @route   PUT /api/targeted-publications/admin/group/:groupId
// @access  Private/Admin
exports.updateTargetedPublicationGroup = async (req, res) => {
    try {
        const groupId = decodeURIComponent(req.params.groupId);
        const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
        const publications = await getPublicationsByGroupId(groupId);

        if (publications.length === 0) {
            return res.status(404).json({ message: 'Targeted publication group not found.' });
        }

        if (!text && !req.file && !publications.some((publication) => publication.imageUrl)) {
            return res.status(400).json({ message: 'Add text or an image before saving.' });
        }

        let nextImageUrl = publications[0].imageUrl || '';
        if (req.file) {
            nextImageUrl = await uploadToFirebase(req.file);
        }

        const publicationIds = publications.map((publication) => publication._id);

        await TargetedPublication.updateMany(
            { _id: { $in: publicationIds } },
            {
                $set: {
                    text,
                    imageUrl: nextImageUrl
                }
            }
        );

        const updatedPublications = await TargetedPublication.find({ _id: { $in: publicationIds } })
            .populate('targetUser', 'name email')
            .populate('createdBy', 'name email')
            .sort('-createdAt');

        res.json({
            message: 'Targeted publication updated successfully.',
            publications: updatedPublications
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a targeted publication group
// @route   DELETE /api/targeted-publications/admin/group/:groupId
// @access  Private/Admin
exports.deleteTargetedPublicationGroup = async (req, res) => {
    try {
        const groupId = decodeURIComponent(req.params.groupId);
        const publications = await getPublicationsByGroupId(groupId);

        if (publications.length === 0) {
            return res.status(404).json({ message: 'Targeted publication group not found.' });
        }

        const publicationIds = publications.map((publication) => publication._id);

        await Notification.deleteMany({
            $or: [
                { targetedPublicationGroupId: groupId },
                { targetedPublicationId: { $in: publicationIds } }
            ]
        });

        await TargetedPublication.deleteMany({ _id: { $in: publicationIds } });

        res.json({ message: 'Targeted publication deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get targeted publications assigned to the logged-in user
// @route   GET /api/targeted-publications/user
// @access  Private
exports.getUserTargetedPublications = async (req, res) => {
    try {
        if (req.user.role !== 'user') {
            return res.status(403).json({ message: 'This view is only available for users.' });
        }

        const publications = await TargetedPublication.find({ targetUser: req.user._id })
            .populate('createdBy', 'name email')
            .sort('-createdAt');

        res.json(publications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Submit a yes/no response with feedback for a targeted publication
// @route   PATCH /api/targeted-publications/:id/respond
// @access  Private
exports.respondToTargetedPublication = async (req, res) => {
    try {
        if (req.user.role !== 'user') {
            return res.status(403).json({ message: 'Only users can respond to publications.' });
        }

        const responseChoice = typeof req.body.responseChoice === 'string'
            ? req.body.responseChoice.trim().toLowerCase()
            : '';
        const feedback = typeof req.body.feedback === 'string'
            ? req.body.feedback.trim()
            : '';

        if (!['yes', 'no'].includes(responseChoice)) {
            return res.status(400).json({ message: 'Choose Yes or No before submitting.' });
        }

        if (!feedback) {
            return res.status(400).json({ message: 'Feedback is required.' });
        }

        const publication = await TargetedPublication.findById(req.params.id);

        if (!publication) {
            return res.status(404).json({ message: 'Publication not found.' });
        }

        if (publication.targetUser.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You are not allowed to respond to this publication.' });
        }
        const isUpdate = Boolean(publication.responseChoice);

        publication.responseChoice = responseChoice;
        publication.feedback = feedback;
        publication.respondedAt = new Date();

        await publication.save();

        await Notification.create({
            type: 'targeted_publication_reply',
            message: isUpdate
                ? `${req.user.name} updated a private publication reply to "${responseChoice.toUpperCase()}".`
                : `${req.user.name} replied "${responseChoice.toUpperCase()}" to a private publication.`,
            userId: publication.createdBy,
            targetedPublicationId: publication._id,
            targetedPublicationGroupId: buildPublicationGroupId(publication),
            audience: 'admin'
        });

        const populatedPublication = await TargetedPublication.findById(publication._id)
            .populate('createdBy', 'name email');

        res.json({
            message: isUpdate ? 'Response updated successfully.' : 'Response submitted successfully.',
            publication: populatedPublication
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
