const { Conversation, Message, Feedback } = require('../models/associations');
const { responseSuccess, responseError } = require('../utils/response');

exports.createConversation = async (req, res) => {
    try {
        const userId = req.user.id;

        const conversation = await Conversation.create({
            user_id: userId,
            title: null,
            is_active: true
        });

        return responseSuccess(res, 201, 'Conversation created successfully', {
            S11ConversationId: conversation.id,
            created_at: conversation.created_at
        });
    } catch (error) {
        return responseError(res, 500, 'Failed to create conversation', error.message);
    }
};

exports.fetchConversations = async (req, res) => {
    try {
        const userId = req.user.id;

        const conversations = await Conversation.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']]
        });

        const formattedConversations = conversations.map(conv => ({
            S11ConversationId: conv.id,
            title: conv.title,
            is_active: conv.is_active,
            created_at: conv.created_at,
            updated_at: conv.updated_at
        }));

        return responseSuccess(res, 200, 'Conversations fetched successfully', {
            S11Conversations: formattedConversations
        });
    } catch (error) {
        return responseError(res, 500, 'Failed to fetch conversations', error.message);
    }
};

exports.fetchConversation = async (req, res) => {
    try {
        const { S11ConversationId } = req.body;
        const userId = req.user.id;

        if (!S11ConversationId) {
            return responseError(res, 400, 'S11ConversationId is required');
        }

        const conversation = await Conversation.findByPk(S11ConversationId);

        if (!conversation) {
            return responseError(res, 404, 'Conversation not found');
        }

        if (conversation.user_id !== userId) {
            return responseError(res, 404, 'Conversation not found');
        }

        const messages = await Message.findAll({
            where: { conversation_id: S11ConversationId },
            order: [['created_at', 'ASC']]
        });

        const formattedMessages = messages.map(msg => ({
            S11MessageId: msg.id,
            role: msg.role,
            content: msg.content,
            created_at: msg.created_at
        }));

        return responseSuccess(res, 200, 'Messages fetched successfully', {
            S11Messages: formattedMessages
        });
    } catch (error) {
        return responseError(res, 500, 'Failed to fetch messages', error.message);
    }
};

exports.insertExpertFeedback = async (req, res) => {
    try {
        const {
            S11ExpertFeedback,
            S11ExpertFeedbackRating,
            S11ConversationId,
            S11MessageId
        } = req.body;
        const userId = req.user.id;

        if (!S11ConversationId || !S11MessageId || !S11ExpertFeedbackRating) {
            return responseError(res, 400, 'S11ConversationId, S11MessageId, and S11ExpertFeedbackRating are required');
        }

        const conversation = await Conversation.findByPk(S11ConversationId);

        if (!conversation) {
            return responseError(res, 404, 'Conversation not found');
        }

        if (conversation.user_id !== userId) {
            return responseError(res, 404, 'Conversation not found');
        }

        const message = await Message.findByPk(S11MessageId);

        if (!message) {
            return responseError(res, 404, 'Message not found');
        }

        await Feedback.create({
            feedback_content: S11ExpertFeedback || null,
            feedback_rating: S11ExpertFeedbackRating,
            conversation_id: S11ConversationId,
            message_id: S11MessageId,
            user_id: userId
        });

        return responseSuccess(res, 201, 'Feedback submitted successfully', { success: true });
    } catch (error) {
        return responseError(res, 500, 'Failed to submit feedback', error.message);
    }
};
