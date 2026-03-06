const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
    askHAi,
    getConversations,
    getConversationById,
    deleteConversation,
    addToFavorites,
    removeFromFavorites,
    getFavorites,
} = require('../controllers/healthAI.controller');

// Main chat endpoint
router.post('/ask', verifyToken, askHAi);

// Conversation management (Chat History)
router.get('/conversations', verifyToken, getConversations);
router.post('/conversation', verifyToken, getConversationById);
router.delete('/conversation/:id', verifyToken, deleteConversation);

// Favorites management
router.post('/favorites/add', verifyToken, addToFavorites);
router.post('/favorites/remove', verifyToken, removeFromFavorites);
router.get('/favorites', verifyToken, getFavorites);

module.exports = router;
