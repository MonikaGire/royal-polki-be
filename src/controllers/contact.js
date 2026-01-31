// controllers/userController.js

const Contact = require("../models/Contact");


const contactCreater = async (req, res) => {
  try {
    const { fullName, phone, gender, email, message } = req.body;
    await Contact.create({ fullName, phone, gender, email, message })

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

const allContactData = async (req, res) => {
  try {

    const data = await Contact.find().sort({ createdAt: -1 });

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
  contactCreater, allContactData
}