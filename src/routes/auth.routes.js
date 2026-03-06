const express = require('express');
const router = express.Router();

const { signup,
    login,
    authMe,
    sendOtp,
    verifyOtp,
    addUserDataCollection,
    updatePassword,
    updateNameOrEmail,
    forgotPassword,
    verifyForgotPasswordOtp,
    resetPasswordAfterOtp,
    uploadProfilePicture,
    getProfilePicture,
} = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

router.get('/me', verifyToken, authMe);
router.post('/signup', signup);
router.post('/login', login);
router.post('/sendOtp', sendOtp);
router.post('/verifyOtp', verifyOtp);
router.post('/addUserDataCollection', addUserDataCollection);
router.post('/updatePassword', verifyToken, updatePassword);
router.put('/updateNameOrEmail', verifyToken, updateNameOrEmail);
router.post('/forgotPassword', forgotPassword);
router.post('/verifyForgotPasswordOtp', verifyForgotPasswordOtp);
router.post('/resetPasswordAfterOtp', resetPasswordAfterOtp);
router.post('/uploadProfilePicture', verifyToken, upload.single('profile_picture'), uploadProfilePicture);
router.get('/getProfilePicture', verifyToken, getProfilePicture);

module.exports = router;