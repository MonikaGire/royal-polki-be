const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment-intents");

router.post("/payment-intents", paymentController.payment_intents);

router.post("/razorpay/payment-intents", paymentController.payment_intents_Razorpay);

router.post("/razorpay/payment-verify", paymentController.paymentVerifyRazorpay);

module.exports = router;
