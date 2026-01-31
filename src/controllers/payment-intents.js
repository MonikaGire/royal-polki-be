const Stripe = require("stripe");
const InstanceRazorpay = require("../config/razorpay");
const crypto = require('crypto')

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const currency = process.env.CURRENCY;

const payment_intents = async (req, res) => {
	try {
		// Assuming req.body is already parsed
		const { amount } = req.body;

		const paymentIntent = await stripe.paymentIntents.create({
			amount: amount * 100, // Convert to cents
			currency: currency.toLowerCase(), // Convert currency to lowercase
		});

		return res.status(200).json({ client_secret: paymentIntent.client_secret });
	} catch (error) {
		return res.status(500).json({ success: false, message: error.message });
	}
};

const payment_intents_Razorpay = async (req, res) => {
	try {
		let { amount, currency } = req.body;

		// Ensure amount is a number and round to 2 decimals first
		amount = Number(amount) || 0;
		const amountInPaise = Math.round(amount * 100); // Convert to paise as integer

		const options = {
			amount: amountInPaise,
			currency: currency || "INR",
		};

		const order = await InstanceRazorpay.orders.create(options);

		return res.status(201).json({
			success: true,
			message: 'Success',
			data: order
		});
	} catch (error) {
		console.error('Razorpay error:', error);
		res.status(500).json({
			message: error.message,
			status: 500,
		});
	}
};
const paymentVerifyRazorpay = async (req, res) => {
  try {
    const {
      orderCreationId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    } = req.body;

    // Correct HMAC signature creation
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET)
      .update(`${orderCreationId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Transaction not legit!',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Internal Server Error',
      status: 500,
    });
  }
};


module.exports = { payment_intents, payment_intents_Razorpay, paymentVerifyRazorpay };
