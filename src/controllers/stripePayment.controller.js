const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { responseSuccess, responseError } = require('../utils/response');

exports.createPaymentIntent = async (req, res) => {
    try {
        const { amount, currency } = req.body;

        if (!amount) {
            return responseError(res, 400, "Amount is required");
        }

        const paymentCurrency = currency || 'usd';
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: paymentCurrency,
            payment_method_types: ['card', 'us_bank_account', 'paypal'],
        });

        return responseSuccess(res, 200, "Payment intent created successfully", {
            payment_id: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            description: paymentIntent.description,
            created: paymentIntent.created,
            metadata: paymentIntent.metadata,
            next_action: paymentIntent.next_action || null,
            customer: paymentIntent.customer,
            livemode: paymentIntent.livemode,
            amount_details: paymentIntent.amount_details,
            clientSecret: paymentIntent.client_secret,
        });
    } catch (err) {
        return responseError(res, 500, err.message);
    }
};

exports.retrievePaymentIntent = async (req, res) => {
    const { paymentIntentId } = req.body;
    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        return responseSuccess(res, 200, "Payment intent retrieved successfully", { status: paymentIntent.status });
    } catch (err) {
        return responseError(res, 500, "Failed to retrieve payment intent", err.message);
    }
};

exports.getProductData = async (req, res) => {
    const productId = req.params.id;

    try {
        const product = await stripe.products.retrieve(productId);

        const prices = await stripe.prices.list({
            product: productId,
            active: true
        });

        return responseSuccess(res, 200, "Product data retrieved successfully", { product, prices });
    } catch (error) {
        return responseError(res, 500, error.message);
    }
};
