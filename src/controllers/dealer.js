// controllers/userController.js

const Dealer = require("../models/Dealer");

const dealerCreater = async (req, res) => {
    try {
        const { fullName, phone, company, email, message } = req.body;
        await Dealer.create({ fullName, phone, company, email, message })

        res.status(201).json({
            success: true,
            message: 'We will get back to you shortly',
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
            status: 500,
        });
    }
};

const allDealerData = async (req, res) => {
    try {

        const data = await Dealer.find().sort({ createdAt: -1 });

        if (!data) {
            return res.status(400).json({
                success: false,
                message: 'Data not found',
            });
        }
        return res.status(201).json({
            success: true,
            message: 'Data found Successfully',
            data: data,
        });

    } catch (error) {
        res.status(500).json({
            message: error.message,
            status: 500,
        });
    }
};


module.exports = {
    dealerCreater, allDealerData
}