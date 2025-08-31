const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    serviceType: {
        type: String,
        required: [true, 'Service type is required'],
        enum: [
            'Web Application Security Audits',
            'PCI DSS Gap Assessments', 
            'Cloud Security Assessments',
            'Security Awareness Training'
        ]
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true,
        maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    termsAccepted: {
        type: Boolean,
        required: [true, 'Terms must be accepted'],
        validate: {
            validator: function(v) { return v === true; },
            message: 'Terms must be accepted'
        }
    },
    status: {
        type: String,
        enum: ['pending', 'contacted', 'completed'],
        default: 'pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Contact', contactSchema);
