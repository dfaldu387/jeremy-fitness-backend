const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { addPrivacyPolicy } = require('../controllers/privacyPolicy.controller');

router.post('/addPrivacyPolicy', verifyToken, addPrivacyPolicy);

module.exports = router;
