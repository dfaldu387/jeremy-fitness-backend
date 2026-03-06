const express = require("express");
const router = express.Router();
const {
    getMembershipGiveaways,
    checkAndUpdateFollow,
    addAddressForGiveaway,
} = require("../controllers/giveaways.controller");
const { verifyToken } = require("../middleware/auth.middleware");

router.get('/membership', verifyToken, getMembershipGiveaways);
router.post('/checkAndUpdateFollow', verifyToken, checkAndUpdateFollow);
router.post('/addAddressForGiveaway', verifyToken, addAddressForGiveaway);

module.exports = router;
