const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');

// Submit contact form
router.post('/', async (req, res) => {
    try {
        console.log('📧 Contact form submission:', req.body);
        
        const {
            firstName,
            lastName,
            email,
            phoneNumber,
            serviceType,
            message,
            termsAccepted
        } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !phoneNumber || !serviceType || !message || !termsAccepted) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required',
                missingFields: {
                    firstName: !firstName,
                    lastName: !lastName,
                    email: !email,
                    phoneNumber: !phoneNumber,
                    serviceType: !serviceType,
                    message: !message,
                    termsAccepted: !termsAccepted
                }
            });
        }

        // Create new contact
        const contact = new Contact({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim().toLowerCase(),
            phoneNumber: phoneNumber.trim(),
            serviceType,
            message: message.trim(),
            termsAccepted
        });

        await contact.save();

        console.log('✅ Contact saved successfully:', contact._id);

        res.status(201).json({
            success: true,
            message: 'Thank you! Our team will get back to you within 24 hours.',
            contactId: contact._id
        });

    } catch (error) {
        console.error('❌ Contact form error:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors
            });
        }

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists in our system'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get all contacts (for testing)
router.get('/', async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        res.json({ 
            success: true, 
            count: contacts.length,
            contacts 
        });
    } catch (error) {
        console.error('❌ Get contacts error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching contacts' 
        });
    }
});

module.exports = router;
