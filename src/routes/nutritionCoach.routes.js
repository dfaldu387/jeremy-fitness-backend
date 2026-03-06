const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
    askNutrition,
    fetchLastSevenDaysConversations,
    fetchConversationById,
    addToFavorites,
    removeFromFavorites,
    getFavorites,
    getChatHistory,
} = require('../controllers/nutritionCoach.controller');

router.post('/askNutrition', verifyToken, askNutrition);
router.get('/fetchLastSevenDaysConversations', verifyToken, fetchLastSevenDaysConversations);
router.post('/fetchConversationById', verifyToken, fetchConversationById);
router.post('/addToFavorites', verifyToken, addToFavorites);
router.post('/removeFromFavorites', verifyToken, removeFromFavorites);
router.get('/getFavorites', verifyToken, getFavorites);
router.get('/getChatHistory', verifyToken, getChatHistory);

module.exports = router;
