const mongoose = require('mongoose');

const DealerSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: [true, 'fullName is required.'],
        },
        phone: {
            type: String,
            required: [true, 'phone is required.'],
        },
        company: {
            type: String,
            required: [true, 'company is required.'],
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

const Dealer = mongoose.models.Dealer || mongoose.model('Dealer', DealerSchema);
module.exports = Dealer;
