const express = require('express');
const router = express.Router();

const {
    getDataByType,
    toggleFavourites,
    getFavouritesByType
} = require('../controllers/newsContent.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/getDataByType', verifyToken, getDataByType);
router.post("/toggleFavourites", verifyToken, toggleFavourites);
router.get("/getFavouritesByType", verifyToken, getFavouritesByType);

module.exports = router;
