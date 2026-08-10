const mongoose = require('mongoose');

const targetedPublicationSchema = new mongoose.Schema({
    publicationGroupId: {
        type: String,
        default: ''
    },
    text: {
        type: String,
        trim: true,
        default: ''
    },
    imageUrl: {
        type: String,
        default: ''
    },
    targetUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    targetEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    responseChoice: {
        type: String,
        enum: ['yes', 'no', null],
        default: null
    },
    feedback: {
        type: String,
        trim: true,
        default: ''
    },
    respondedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('TargetedPublication', targetedPublicationSchema);
