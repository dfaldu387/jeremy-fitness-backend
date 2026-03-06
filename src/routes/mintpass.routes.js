const express = require('express');
const router = express.Router();

const {
    checkUserMintPass
} = require('../controllers/mintpass.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.post('/checkUserMintPass', verifyToken, checkUserMintPass);

module.exports = router;
