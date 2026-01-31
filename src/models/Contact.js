const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: [true, 'fullName is required.'],
        },
        phone: {
            type: String,
            required: [true, 'phone is required.'],
        },
        gender: {
            type: String,
            required: [true, 'gender is required.'],
        },
        email: {
            type: String,
            // unique: true,
            required: [true, 'email is required.'],
        },
        message: {
            type: String,
            required: [true, 'message is required.'],
        }
    },
    {
        timestamps: true,
    }
);

const Contact = mongoose.models.Contact || mongoose.model('Contact', ContactSchema);
module.exports = Contact;
