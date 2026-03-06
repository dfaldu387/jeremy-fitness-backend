const {
    CoachConversation,
    CoachMessage,
    FavoriteMessage,
    WellnessPoints,
    UserLevel,
} = require('../models/coachAssociations');
const { responseSuccess, responseError } = require('../utils/response');
const { Op } = require('sequelize');

const getSevenDaysAgo = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    date.setHours(0, 0, 0, 0);
    return date;
};

/**
 * Health AI (HAi) System Prompt
 *
 * HAi is the main AI agent that acts as:
 * - Navigation guide of the application
 * - Information assistant
 * - Technical support agent
 * - Cross-coach router
 */
const healthAIPrompt = `
You are HAi (Health AI), the main AI assistant for the S11 Health & Wellness application.

ROLE & IDENTITY
- You are the primary AI agent and navigation guide for the entire S11 Platform.
- You function as an information assistant, navigation helper, and technical support agent.
- You are knowledgeable about health and wellness topics but are NOT a doctor or licensed healthcare professional.
- You must NEVER diagnose, treat, or cure any medical condition.

CORE RESPONSIBILITIES

1. HEALTH & WELLNESS INFORMATION
   - Answer general health and wellness related questions
   - Provide educational information about nutrition, fitness, and mental wellness
   - Always include appropriate disclaimers for health-related advice
   - If a question borders on medical advice, include: "I am not a licensed healthcare professional. For personalized medical advice, please consult a qualified healthcare provider."

2. APPLICATION NAVIGATION
   - Help users navigate to specific features within the S11 application
   - Provide direct links to app features when users ask how to access them
   - Guide users through app functionality and settings

3. COACH ROUTING & REFERRALS
   - Identify when questions should be directed to specialized coaches:
     * Nutrition questions → Nutrition Coach
     * Exercise/workout questions → Fitness Coach
     * Stress/anxiety/emotional questions → Mental Health Coach
   - When routing to a coach, indicate that the question has been forwarded
   - Provide the link to the appropriate coach chat

4. TECHNICAL SUPPORT
   - Help users troubleshoot app issues
   - Explain app features and how to use them
   - Guide users on settings changes
   - Help users report bugs or issues

5. PLATFORM INFORMATION
   - Explain S11 features, membership benefits, and wellness points system
   - Help users understand their level progression
   - Provide information about giveaways, referrals, and other platform features

AVAILABLE APP FEATURES & NAVIGATION LINKS
- Food Log / Food Entry: /app/nutrition/food-entry
- Food Image Analysis: /app/nutrition/food-analysis
- Recipe Generator: /app/nutrition/recipe-generator
- Meal Planner: /app/nutrition/meal-planner
- Grocery List: /app/nutrition/grocery-list
- Nutrition Dashboard: /app/nutrition/dashboard
- Nutrition Coach Chat: /app/coach/nutrition
- Fitness Coach Chat: /app/coach/fitness
- Mental Health Coach Chat: /app/coach/mental-health
- Profile Settings: /app/settings/profile
- Notification Settings: /app/settings/notifications
- Device Sync Settings: /app/settings/device-sync
- Membership: /app/membership
- Giveaways: /app/giveaways
- Referrals: /app/referrals
- Wellness Points & Levels: /app/wellness-points
- Chat History: /app/chat-history
- Favorites: /app/favorites

RESPONSE GUIDELINES
- Be friendly, helpful, and conversational
- Keep responses concise but informative
- When providing navigation help, always include the clickable link
- For health topics, balance being helpful with appropriate caution
- When referring to specialized coaches, explain why that coach is better suited

WELLNESS POINTS SYSTEM
Users earn Wellness Points (WPs) for:
- Starting conversations: 10 WPs
- Sending messages: 5 WPs
- Saving favorites: 3 WPs
Increased levels unlock special perks within the app.

IMPORTANT RULES
- Do NOT provide specific medical diagnoses or treatment plans
- Do NOT prescribe medications or supplements with dosages
- Always recommend consulting healthcare professionals for medical concerns
- Be transparent about being an AI assistant
- Maintain a supportive and non-judgmental tone

You must ALWAYS behave as HAi, the S11 Health AI assistant, and nothing else.
`;

const COACH_TYPE = 'hai';
const POINTS_CONFIG = {
    coach_conversation: 10,
    coach_message: 5,
    favorite_response: 3
};

const awardWellnessPoints = async (userId, actionType, referenceType = null, referenceId = null, description = null) => {
    const points = POINTS_CONFIG[actionType] || 0;
    if (points === 0) return null;

    const pointsRecord = await WellnessPoints.create({
        user_id: userId,
        points: points,
        action_type: actionType,
        action_description: description || `Earned points for ${actionType}`,
        reference_type: referenceType,
        reference_id: referenceId,
        coach_type: COACH_TYPE,
        multiplier: 1.00,
        final_points: points
    });

    let userLevel = await UserLevel.findOne({ where: { user_id: userId } });
    if (!userLevel) {
        userLevel = await UserLevel.create({ user_id: userId });
    }

    await userLevel.update({
        total_points: userLevel.total_points + points,
        hai_interactions: userLevel.hai_interactions + 1,
        last_activity_date: new Date()
    });

    const newLevel = Math.floor(userLevel.total_points / 100) + 1;
    if (newLevel > userLevel.current_level) {
        await userLevel.update({
            current_level: newLevel,
            points_to_next_level: (newLevel * 100) - userLevel.total_points
        });
    }

    return pointsRecord;
};

/**
 * Analyze message for coach referrals
 */
const analyzeForCoachReferral = (message) => {
    const nutritionKeywords = ['diet', 'food', 'meal', 'calorie', 'nutrition', 'recipe', 'eat', 'weight loss', 'weight gain', 'macro', 'protein', 'carb', 'fat', 'vitamin', 'supplement', 'grocery', 'cooking'];
    const fitnessKeywords = ['exercise', 'workout', 'training', 'gym', 'running', 'muscle', 'cardio', 'stretch', 'marathon', 'weight training', 'strength', 'fitness', 'yoga', 'pilates', 'sport', 'athletic'];
    const mentalHealthKeywords = ['stress', 'anxiety', 'depression', 'mental', 'therapy', 'mindfulness', 'meditation', 'emotional', 'mood', 'overwhelmed', 'sleep', 'insomnia', 'worry', 'panic', 'self-care', 'burnout'];

    const lowerMessage = message.toLowerCase();
    const referrals = [];

    if (nutritionKeywords.some(keyword => lowerMessage.includes(keyword))) {
        referrals.push({
            coach_type: 'nutrition',
            coach_name: 'Nutrition Coach',
            reason: 'Your question involves nutrition topics',
            link: '/app/coach/nutrition'
        });
    }
    if (fitnessKeywords.some(keyword => lowerMessage.includes(keyword))) {
        referrals.push({
            coach_type: 'fitness',
            coach_name: 'Fitness Coach',
            reason: 'Your question involves fitness or exercise topics',
            link: '/app/coach/fitness'
        });
    }
    if (mentalHealthKeywords.some(keyword => lowerMessage.includes(keyword))) {
        referrals.push({
            coach_type: 'mental_health',
            coach_name: 'Mental Health Coach',
            reason: 'Your question involves mental wellness topics',
            link: '/app/coach/mental-health'
        });
    }

    return referrals;
};

/**
 * Analyze message for navigation/feature recommendations
 */
const analyzeForNavigation = (message) => {
    const lowerMessage = message.toLowerCase();
    const navigations = [];

    if (lowerMessage.includes('log') && (lowerMessage.includes('food') || lowerMessage.includes('meal'))) {
        navigations.push({
            feature_name: 'Food Entry',
            link: '/app/nutrition/food-entry',
            description: 'Log your meals and track your daily food intake'
        });
    }

    if (lowerMessage.includes('scan') || lowerMessage.includes('analyze') || (lowerMessage.includes('photo') && lowerMessage.includes('food')) || lowerMessage.includes('image recognition')) {
        navigations.push({
            feature_name: 'Food Image Analysis',
            link: '/app/nutrition/food-analysis',
            description: 'Use AI to analyze food photos and get nutritional information'
        });
    }

    if (lowerMessage.includes('recipe')) {
        navigations.push({
            feature_name: 'Recipe Generator',
            link: '/app/nutrition/recipe-generator',
            description: 'Generate personalized recipes based on your preferences'
        });
    }

    if (lowerMessage.includes('meal plan') || lowerMessage.includes('weekly plan') || lowerMessage.includes('diet plan')) {
        navigations.push({
            feature_name: 'Meal Planner',
            link: '/app/nutrition/meal-planner',
            description: 'Create structured meal plans tailored to your goals'
        });
    }

    if (lowerMessage.includes('grocery') || lowerMessage.includes('shopping list')) {
        navigations.push({
            feature_name: 'Grocery List',
            link: '/app/nutrition/grocery-list',
            description: 'Manage your shopping list for meal ingredients'
        });
    }

    if (lowerMessage.includes('dashboard') || lowerMessage.includes('progress') || lowerMessage.includes('stats') || lowerMessage.includes('summary')) {
        navigations.push({
            feature_name: 'Nutrition Dashboard',
            link: '/app/nutrition/dashboard',
            description: 'View your nutrition progress and statistics'
        });
    }

    if (lowerMessage.includes('setting') || lowerMessage.includes('preference') || lowerMessage.includes('configure')) {
        if (lowerMessage.includes('notification') || lowerMessage.includes('alert') || lowerMessage.includes('reminder')) {
            navigations.push({
                feature_name: 'Notification Settings',
                link: '/app/settings/notifications',
                description: 'Manage your notification and reminder preferences'
            });
        } else if (lowerMessage.includes('device') || lowerMessage.includes('sync') || lowerMessage.includes('watch') || lowerMessage.includes('fitbit')) {
            navigations.push({
                feature_name: 'Device Sync Settings',
                link: '/app/settings/device-sync',
                description: 'Connect and sync your fitness devices'
            });
        } else if (lowerMessage.includes('profile') || lowerMessage.includes('account')) {
            navigations.push({
                feature_name: 'Profile Settings',
                link: '/app/settings/profile',
                description: 'Update your profile information'
            });
        }
    }

    if (lowerMessage.includes('membership') || lowerMessage.includes('subscribe') || (lowerMessage.includes('plan') && lowerMessage.includes('upgrade'))) {
        navigations.push({
            feature_name: 'Membership',
            link: '/app/membership',
            description: 'View and manage your membership subscription'
        });
    }

    if (lowerMessage.includes('giveaway') || lowerMessage.includes('prize') || lowerMessage.includes('win')) {
        navigations.push({
            feature_name: 'Giveaways',
            link: '/app/giveaways',
            description: 'Check out active giveaways and enter to win'
        });
    }

    if (lowerMessage.includes('referral') || lowerMessage.includes('invite') || lowerMessage.includes('friend')) {
        navigations.push({
            feature_name: 'Referrals',
            link: '/app/referrals',
            description: 'Invite friends and earn rewards'
        });
    }

    if (lowerMessage.includes('point') || lowerMessage.includes('level') || lowerMessage.includes('reward') || lowerMessage.includes('perk')) {
        navigations.push({
            feature_name: 'Wellness Points & Levels',
            link: '/app/wellness-points',
            description: 'View your wellness points and level progress'
        });
    }

    if (lowerMessage.includes('history') || lowerMessage.includes('past conversation') || lowerMessage.includes('previous chat')) {
        navigations.push({
            feature_name: 'Chat History',
            link: '/app/chat-history',
            description: 'View your past conversations with HAi and coaches'
        });
    }

    if (lowerMessage.includes('favorite') || lowerMessage.includes('saved') || lowerMessage.includes('bookmark')) {
        navigations.push({
            feature_name: 'Favorites',
            link: '/app/favorites',
            description: 'Access your saved favorite responses'
        });
    }

    return navigations;
};

/**
 * Check if message requires medical disclaimer
 */
const requiresDisclaimer = (message) => {
    const medicalKeywords = ['symptom', 'diagnose', 'diagnosis', 'treatment', 'medication', 'medicine', 'doctor', 'pain', 'disease', 'condition', 'illness', 'sick', 'prescription', 'dose', 'dosage', 'pregnant', 'pregnancy', 'blood pressure', 'diabetes', 'heart', 'cancer', 'surgery'];
    const lowerMessage = message.toLowerCase();
    return medicalKeywords.some(keyword => lowerMessage.includes(keyword));
};

/**
 * Call OpenAI API with Health AI prompt
 */
const askHealthAI = async (systemPrompt, userQuestion, conversationHistory = []) => {
    const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: userQuestion }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: messages,
            temperature: 0.7
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || 'OpenAI API error');
    }

    return data.choices[0].message.content;
};

/**
 * Main HAi chat endpoint
 * POST /api/hai/ask
 */
exports.askHAi = async (req, res) => {
    try {
        const { question, S11ConversationId } = req.body;
        const userId = req.user.id;

        if (!question) {
            return responseError(res, 400, 'Question is required');
        }

        let conversation;
        let isNewConversation = false;
        let conversationHistory = [];

        if (S11ConversationId) {
            const sevenDaysAgo = getSevenDaysAgo();

            conversation = await CoachConversation.findOne({
                where: {
                    id: S11ConversationId,
                    user_id: userId,
                    coach_type: COACH_TYPE,
                    is_deleted: false,
                    created_at: {
                        [Op.gte]: sevenDaysAgo
                    }
                }
            });

            if (!conversation) {
                return responseError(res, 404, 'Conversation not found or older than 7 days. Please start a new conversation.');
            }

            // Get conversation history for context
            const previousMessages = await CoachMessage.findAll({
                where: {
                    conversation_id: S11ConversationId,
                    is_deleted: false
                },
                order: [['created_at', 'ASC']],
                limit: 10
            });

            conversationHistory = previousMessages.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            }));
        } else {
            conversation = await CoachConversation.create({
                user_id: userId,
                coach_type: COACH_TYPE,
                title: question.substring(0, 50) + (question.length > 50 ? '...' : ''),
                is_active: true
            });
            isNewConversation = true;

            await awardWellnessPoints(userId, 'coach_conversation', 'conversation', conversation.id, 'Started conversation with HAi');
        }

        // Save user message
        const userMessage = await CoachMessage.create({
            conversation_id: conversation.id,
            user_id: userId,
            role: 'user',
            content: question,
            coach_type: COACH_TYPE
        });

        // Get AI response
        const aiAnswer = await askHealthAI(healthAIPrompt, question, conversationHistory);

        // Analyze for referrals and navigation
        const coachReferrals = analyzeForCoachReferral(question);
        const navigationSuggestions = analyzeForNavigation(question);
        const needsDisclaimer = requiresDisclaimer(question);

        // Save assistant message
        const assistantMessage = await CoachMessage.create({
            conversation_id: conversation.id,
            user_id: userId,
            role: 'hai',
            content: aiAnswer,
            coach_type: COACH_TYPE,
            has_tool_recommendation: navigationSuggestions.length > 0,
            tool_recommendation: navigationSuggestions.length > 0 ? navigationSuggestions : null,
            has_coach_referral: coachReferrals.length > 0,
            referred_coaches: coachReferrals.length > 0 ? coachReferrals : null,
            includes_disclaimer: needsDisclaimer
        });

        await conversation.update({ updated_at: new Date() });

        await awardWellnessPoints(userId, 'coach_message', 'message', assistantMessage.id, 'Sent message to HAi');

        return responseSuccess(res, 200, 'HAi response generated successfully', {
            agent: "HAi",
            agent_name: "Health AI",
            S11ConversationId: conversation.id,
            S11UserMessageId: userMessage.id,
            S11AssistantMessageId: assistantMessage.id,
            isNewConversation: isNewConversation,
            answer: aiAnswer,
            navigationSuggestions: navigationSuggestions.length > 0 ? navigationSuggestions : null,
            coachReferrals: coachReferrals.length > 0 ? coachReferrals : null,
            includesDisclaimer: needsDisclaimer,
            earnedWP: isNewConversation ? 15 : 5,
            created_at: assistantMessage.created_at
        });
    } catch (error) {
        return responseError(res, 500, 'HAi failed to respond', error.message);
    }
};

/**
 * Get last 7 days of HAi conversations (Chat History)
 * GET /api/hai/conversations
 */
exports.getConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        const sevenDaysAgo = getSevenDaysAgo();

        const whereClause = {
            user_id: userId,
            coach_type: COACH_TYPE,
            is_deleted: false,
            created_at: {
                [Op.gte]: sevenDaysAgo
            }
        };

        const totalCount = await CoachConversation.count({ where: whereClause });

        const conversations = await CoachConversation.findAll({
            where: whereClause,
            order: [['updated_at', 'DESC']],
            limit: limitNum,
            offset: offset,
            include: [{
                model: CoachMessage,
                as: 'messages',
                limit: 1,
                order: [['created_at', 'DESC']],
                attributes: ['content', 'created_at', 'role']
            }]
        });

        const formattedConversations = conversations.map(conv => ({
            S11ConversationId: conv.id,
            title: conv.title,
            last_message: conv.messages[0]?.content?.substring(0, 100) || null,
            last_message_role: conv.messages[0]?.role || null,
            created_at: conv.created_at,
            updated_at: conv.updated_at
        }));

        const totalPages = Math.ceil(totalCount / limitNum);

        return responseSuccess(res, 200, 'HAi conversations fetched successfully', {
            conversations: formattedConversations,
            pagination: {
                current_page: pageNum,
                per_page: limitNum,
                total_count: totalCount,
                total_pages: totalPages,
                has_next: pageNum < totalPages,
                has_prev: pageNum > 1
            }
        });
    } catch (error) {
        return responseError(res, 500, 'Failed to fetch HAi conversations', error.message);
    }
};

/**
 * Get specific conversation by ID with all messages
 * POST /api/hai/conversation
 */
exports.getConversationById = async (req, res) => {
    try {
        const { S11ConversationId, page = 1, limit = 50 } = req.body;
        const userId = req.user.id;

        if (!S11ConversationId) {
            return responseError(res, 400, 'S11ConversationId is required');
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        const sevenDaysAgo = getSevenDaysAgo();

        const conversation = await CoachConversation.findOne({
            where: {
                id: S11ConversationId,
                user_id: userId,
                coach_type: COACH_TYPE,
                is_deleted: false,
                created_at: {
                    [Op.gte]: sevenDaysAgo
                }
            }
        });

        if (!conversation) {
            return responseError(res, 404, 'Conversation not found or older than 7 days');
        }

        const totalCount = await CoachMessage.count({
            where: {
                conversation_id: S11ConversationId,
                is_deleted: false
            }
        });

        const messages = await CoachMessage.findAll({
            where: {
                conversation_id: S11ConversationId,
                is_deleted: false
            },
            order: [['created_at', 'ASC']],
            limit: limitNum,
            offset: offset,
            include: [{
                model: FavoriteMessage,
                as: 'favorites',
                where: { user_id: userId },
                required: false
            }]
        });

        const formattedMessages = messages.map(msg => ({
            S11MessageId: msg.id,
            role: msg.role,
            content: msg.content,
            is_favorited: msg.favorites && msg.favorites.length > 0,
            navigation_suggestions: msg.tool_recommendation,
            coach_referrals: msg.referred_coaches,
            includes_disclaimer: msg.includes_disclaimer,
            created_at: msg.created_at
        }));

        const totalPages = Math.ceil(totalCount / limitNum);

        return responseSuccess(res, 200, 'Conversation fetched successfully', {
            S11ConversationId: conversation.id,
            title: conversation.title,
            messages: formattedMessages,
            pagination: {
                current_page: pageNum,
                per_page: limitNum,
                total_count: totalCount,
                total_pages: totalPages,
                has_next: pageNum < totalPages,
                has_prev: pageNum > 1
            }
        });
    } catch (error) {
        return responseError(res, 500, 'Failed to fetch conversation', error.message);
    }
};

/**
 * Delete a conversation (soft delete)
 * DELETE /api/hai/conversation/:id
 */
exports.deleteConversation = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const conversation = await CoachConversation.findOne({
            where: {
                id: id,
                user_id: userId,
                coach_type: COACH_TYPE,
                is_deleted: false
            }
        });

        if (!conversation) {
            return responseError(res, 404, 'Conversation not found');
        }

        await conversation.update({
            is_deleted: true,
            deleted_at: new Date(),
            is_active: false
        });

        return responseSuccess(res, 200, 'Conversation deleted successfully', {
            S11ConversationId: id,
            deleted: true
        });
    } catch (error) {
        return responseError(res, 500, 'Failed to delete conversation', error.message);
    }
};

/**
 * Add message to favorites
 * POST /api/hai/favorites/add
 */
exports.addToFavorites = async (req, res) => {
    try {
        const { S11MessageId, S11ConversationId } = req.body;
        const userId = req.user.id;

        if (!S11MessageId || !S11ConversationId) {
            return responseError(res, 400, 'S11MessageId and S11ConversationId are required');
        }

        const message = await CoachMessage.findOne({
            where: { id: S11MessageId, conversation_id: S11ConversationId },
            include: [{
                model: CoachConversation,
                as: 'conversation',
                where: { user_id: userId, coach_type: COACH_TYPE }
            }]
        });

        if (!message) {
            return responseError(res, 404, 'Message not found');
        }

        const existingFavorite = await FavoriteMessage.findOne({
            where: { user_id: userId, message_id: S11MessageId, conversation_id: S11ConversationId }
        });

        if (existingFavorite) {
            return responseError(res, 400, 'Message already in favorites');
        }

        const favorite = await FavoriteMessage.create({
            user_id: userId,
            message_id: S11MessageId,
            conversation_id: S11ConversationId,
            coach_type: COACH_TYPE
        });

        await awardWellnessPoints(userId, 'favorite_response', 'favorite', favorite.id, 'Saved HAi response to favorites');

        return responseSuccess(res, 201, 'Added to favorites successfully', {
            S11FavoriteId: favorite.id,
            S11MessageId: S11MessageId,
            earnedWP: 3
        });
    } catch (error) {
        return responseError(res, 500, 'Failed to add to favorites', error.message);
    }
};

/**
 * Remove message from favorites
 * POST /api/hai/favorites/remove
 */
exports.removeFromFavorites = async (req, res) => {
    try {
        const { S11MessageId, S11ConversationId } = req.body;
        const userId = req.user.id;

        if (!S11MessageId || !S11ConversationId) {
            return responseError(res, 400, 'S11MessageId and S11ConversationId are required');
        }

        const favorite = await FavoriteMessage.findOne({
            where: {
                user_id: userId,
                message_id: S11MessageId,
                conversation_id: S11ConversationId,
                coach_type: COACH_TYPE
            }
        });

        if (!favorite) {
            return responseError(res, 404, 'Favorite not found');
        }

        await favorite.destroy();

        return responseSuccess(res, 200, 'Removed from favorites successfully', {
            S11MessageId: S11MessageId,
            removed: true
        });
    } catch (error) {
        return responseError(res, 500, 'Failed to remove from favorites', error.message);
    }
};

/**
 * Get all HAi favorites
 * GET /api/hai/favorites
 */
exports.getFavorites = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        const whereClause = {
            user_id: userId,
            coach_type: COACH_TYPE
        };

        const totalCount = await FavoriteMessage.count({ where: whereClause });

        const favorites = await FavoriteMessage.findAll({
            where: whereClause,
            order: [['created_at', 'DESC']],
            limit: limitNum,
            offset: offset,
            include: [{
                model: CoachMessage,
                as: 'message',
                attributes: ['id', 'content', 'role', 'created_at']
            }]
        });

        const formattedFavorites = favorites.map(fav => ({
            S11FavoriteId: fav.id,
            S11MessageId: fav.message_id,
            S11ConversationId: fav.conversation_id,
            message_content: fav.message?.content,
            message_role: fav.message?.role,
            created_at: fav.created_at
        }));

        const totalPages = Math.ceil(totalCount / limitNum);

        return responseSuccess(res, 200, 'HAi favorites fetched successfully', {
            favorites: formattedFavorites,
            pagination: {
                current_page: pageNum,
                per_page: limitNum,
                total_count: totalCount,
                total_pages: totalPages,
                has_next: pageNum < totalPages,
                has_prev: pageNum > 1
            }
        });
    } catch (error) {
        return responseError(res, 500, 'Failed to fetch favorites', error.message);
    }
};
