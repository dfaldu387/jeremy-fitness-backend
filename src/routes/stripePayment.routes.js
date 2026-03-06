const express = require('express');
const router = express.Router();
const {
    createPaymentIntent,
    retrievePaymentIntent,
    getProductData
} = require('../controllers/stripePayment.controller');

router.post('/createPaymentIntent', createPaymentIntent);
router.post('/retrievePaymentIntent', retrievePaymentIntent);
router.get('/getProductData/:id', getProductData);

module.exports = router;
