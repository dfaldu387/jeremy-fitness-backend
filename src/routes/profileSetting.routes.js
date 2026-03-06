const express = require('express');
const router = express.Router();

const {
    getProfileSetting,
    updateProfileSetting,
} = require('../controllers/profileSetting.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/getProfileSetting', verifyToken, getProfileSetting);
router.put('/updateProfileSetting', verifyToken, updateProfileSetting);

module.exports = router;
