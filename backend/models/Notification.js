const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: [
            'registration',
            'login_attempt',
            'post_creation',
            'comment',
            'like',
            'targeted_publication',
            'targeted_publication_reply'
        ]
    },
    message: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    },
    targetedPublicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TargetedPublication'
    },
    targetedPublicationGroupId: {
        type: String,
        default: ''
    },
    audience: {
        type: String,
        enum: ['system', 'admin', 'user'],
        default: 'system'
    },
    read: {
        type: Boolean,
        default: false
    },
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
