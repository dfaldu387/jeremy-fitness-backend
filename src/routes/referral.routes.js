const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  getReferralData,
} = require('../controllers/referral.controller');

router.get('/getReferralData', verifyToken, getReferralData);

module.exports = router;
