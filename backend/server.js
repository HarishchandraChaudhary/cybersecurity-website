const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File storage fallback
const dataFile = path.join(__dirname, 'contacts.json');
let useFileStorage = false;

// Initialize file storage
const initFileStorage = () => {
    if (!fs.existsSync(dataFile)) {
        fs.writeFileSync(dataFile, JSON.stringify([], null, 2));
    }
    useFileStorage = true;
    console.log('📁 Using file storage fallback');
};

// File storage functions
const saveToFile = (contact) => {
    try {
        const contacts = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        const newContact = {
            id: Date.now().toString(),
            ...contact,
            createdAt: new Date().toISOString()
        };
        contacts.push(newContact);
        fs.writeFileSync(dataFile, JSON.stringify(contacts, null, 2));
        return newContact;
    } catch (error) {
        throw error;
    }
};

const getFromFile = () => {
    try {
        return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    } catch (error) {
        return [];
    }
};

// Database connection with automatic fallback
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cybersecurity_website';
        
        console.log('🔗 Attempting MongoDB connection...');
        console.log('📍 URI:', mongoURI.replace(/\/\/.*@/, '//***:***@'));
        
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // 5 second timeout
            connectTimeoutMS: 5000,
        });
        
        console.log('✅ MongoDB Connected Successfully');
        console.log('📂 Database:', mongoose.connection.name);
        
    } catch (error) {
        console.error('❌ MongoDB Connection Failed:', error.message);
        console.log('🔄 Falling back to file storage...');
        initFileStorage();
    }
};

// Connect to database
connectDB();

// MongoDB Schema
const contactSchema = new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phoneNumber: { type: String, required: true, trim: true },
    serviceType: { 
        type: String, 
        required: true,
        enum: [
            'Web Application Security Audits',
            'PCI DSS Gap Assessments',
            'Cloud Security Assessments',
            'Security Awareness Training'
        ]
    },
    message: { type: String, required: true, trim: true },
    termsAccepted: { type: Boolean, required: true }
}, { timestamps: true });

const Contact = mongoose.model('Contact', contactSchema);

// Health check
app.get('/api/health', (req, res) => {
    const dbStatus = useFileStorage ? 'file-storage' : 
        (mongoose.connection.readyState === 1 ? 'mongodb-connected' : 'mongodb-disconnected');
    
    res.json({
        status: 'Server running',
        storage: dbStatus,
        timestamp: new Date().toISOString()
    });
});

// Contact form submission
app.post('/api/contacts', async (req, res) => {
    try {
        console.log('📧 Contact form submission:', req.body);
        
        // Validate required fields
        const { firstName, lastName, email, phoneNumber, serviceType, message, termsAccepted } = req.body;
        
        if (!firstName || !lastName || !email || !phoneNumber || !serviceType || !message || !termsAccepted) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Use file storage if MongoDB is not available
        if (useFileStorage || mongoose.connection.readyState !== 1) {
            console.log('📁 Saving to file storage');
            const contact = saveToFile(req.body);
            console.log('✅ Contact saved to file:', contact.id);
            
            return res.status(201).json({
                success: true,
                message: 'Thank you! Our team will get back to you within 24 hours.',
                storage: 'file'
            });
        }

        // Use MongoDB
        console.log('💾 Saving to MongoDB');
        const contact = new Contact(req.body);
        const savedContact = await contact.save();
        console.log('✅ Contact saved to MongoDB:', savedContact._id);
        
        res.status(201).json({
            success: true,
            message: 'Thank you! Our team will get back to you within 24 hours.',
            contactId: savedContact._id,
            storage: 'mongodb'
        });

    } catch (error) {
        console.error('❌ Error saving contact:', error);
        
        // Try file storage as fallback
        try {
            if (!useFileStorage) {
                console.log('🔄 MongoDB failed, trying file storage fallback...');
                initFileStorage();
                const contact = saveToFile(req.body);
                
                return res.status(201).json({
                    success: true,
                    message: 'Thank you! Our team will get back to you within 24 hours.',
                    storage: 'file-fallback'
                });
            }
        } catch (fileError) {
            console.error('❌ File storage also failed:', fileError);
        }
        
        res.status(500).json({
            success: false,
            message: 'Error saving contact. Please try again.'
        });
    }
});

// Get contacts
app.get('/api/contacts', async (req, res) => {
    try {
        if (useFileStorage || mongoose.connection.readyState !== 1) {
            const contacts = getFromFile();
            return res.json({ success: true, contacts, storage: 'file' });
        }
        
        const contacts = await Contact.find().sort({ createdAt: -1 });
        res.json({ success: true, contacts, storage: 'mongodb' });
        
    } catch (error) {
        console.error('❌ Error fetching contacts:', error);
        res.status(500).json({ success: false, message: 'Error fetching contacts' });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📧 Contact API: http://localhost:${PORT}/api/contacts`);
    console.log(`💾 Storage: ${useFileStorage ? 'File Storage' : 'MongoDB'}`);
    console.log('===============================================\n');
});
