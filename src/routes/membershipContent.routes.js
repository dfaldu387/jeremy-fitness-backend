const express = require('express');
const router = express.Router();

const {
    getMemberships,
    addUserMembership,
    getAllMemberships,
    cancelUserMembership
} = require('../controllers/membershipContent.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/getMemberships', verifyToken, getMemberships);
router.post('/addUserMembership', verifyToken, addUserMembership);
router.get('/getAllMemberships', verifyToken, getAllMemberships);
router.post('/cancelUserMembership', verifyToken, cancelUserMembership);

module.exports = router;
