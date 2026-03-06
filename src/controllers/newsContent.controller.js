const NewsContent = require('../models/newsContent.model');
const UpdatesContent = require('../models/updatesContent.model');
const WellnessContent = require('../models/wellnessContent.model');
const Favourite = require('../models/favourites.model');
const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');
const { responseSuccess, responseError } = require('../utils/response');

const VALID_TYPES = new Set(["news", "update", "wellness"]);
const MODEL_BY_TYPE = {
    news: NewsContent,
    update: UpdatesContent,
    wellness: WellnessContent,
};

exports.getDataByType = async (req, res) => {
    const userId = Number(req.user?.id);
    const { type } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        let data = [];
        let totalCount = 0;

        if (!type) {
            const [news, updates, wellness] = await Promise.all([
                NewsContent.findAll(),
                UpdatesContent.findAll(),
                WellnessContent.findAll(),
            ]);

            data = [...news, ...updates, ...wellness];
            data.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
            totalCount = data.length;
            data = data.slice(offset, offset + limit);
        } else {
            const model = MODEL_BY_TYPE[type];
            if (!model) {
                return res.status(400).json({ message: 'Invalid type specified' });
            }

            data = await model.findAll({
                order: [['created_date', 'DESC']],
                limit,
                offset,
            });

            totalCount = await model.count();
        }

        if (!data || data.length === 0) {
            return responseError(res, 404, `No ${type || 'all'} data found!!`);
        }

        const favs = await Favourite.findAll({
            where: { userId },
            attributes: ['itemId', 'type'],
        });
        const favMap = new Map(favs.map(f => [`${f.type}-${f.itemId}`, true]));

        const enrichedData = data.map(item => {
            const plain = item.toJSON ? item.toJSON() : item;
            return {
                ...plain,
                status: plain.status || "active",
                isFavourite: favMap.has(`${type || plain.type}-${plain.id}`)
            };
        });

        const totalPages = Math.ceil(totalCount / limit);

        return responseSuccess(res, 200, "Data fetched successfully", {
            data: enrichedData,
            pagination: { page, limit, totalCount, totalPages }
        });
    } catch (error) {
        return responseError(res, 500, "Error fetching data", error.message);
    }
};

exports.toggleFavourites = async (req, res) => {
    try {
        const userId = Number(req.user?.id);
        const itemId = Number(req.body.itemId);
        const itemType = String(req.body.itemType || "").toLowerCase();

        if (!userId || !itemId || !VALID_TYPES.has(itemType)) {
            return responseError(res, 400, "itemId and valid itemType are required");
        }

        const fav = await Favourite.findOne({
            where: { userId, itemId, type: itemType }
        });

        if (fav) {
            await Favourite.destroy({
                where: { userId, itemId, type: itemType }
            });

            return responseSuccess(res, 200, "Removed from favourites list", { isFavourite: false });
        } else {
            const newFav = await Favourite.create({
                userId,
                itemId,
                type: itemType
            });
            return responseSuccess(res, 201, "Added to favourites list", { isFavourite: true, favouriteId: newFav.id });
        }
    } catch (err) {
        return responseError(res, 500, "Failed to toggle favourite", err.message);
    }
};

exports.getFavouritesByType = async (req, res) => {
    try {
        const userId = Number(req.user?.id);
        const type = String(req.query.type || "").toLowerCase();
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        if (!userId || !VALID_TYPES.has(type)) {
            return responseError(res, 400, "userId and valid type (news|update|wellness) are required");
        }

        let tableName;
        let detailsColumns;

        if (type === "news") {
            tableName = "news_content";
            detailsColumns = ["i.id", "i.title", "i.details", "i.created_date"];
        } else if (type === "update") {
            tableName = "update_content";
            detailsColumns = ["i.id", "i.title", "i.details", "i.created_date"];
        } else if (type === "wellness") {
            tableName = "wellness_content";
            detailsColumns = ["i.id", "i.title", "i.details", "i.podcast_link", "i.created_date"];
        }

        const query = `
            SELECT ${detailsColumns.join(", ")}
            FROM favourites f
            JOIN ${tableName} i ON i.id = f.itemId
            WHERE f.userId = ? AND f.type = ?
            LIMIT ? OFFSET ?;
        `;

        const rows = await sequelize.query(query, {
            replacements: [userId, type, limit, offset],
            type: QueryTypes.SELECT
        });

        const countQuery = `
            SELECT COUNT(*) AS totalCount
            FROM favourites f
            JOIN ${tableName} i ON i.id = f.itemId
            WHERE f.userId = ? AND f.type = ?;
        `;

        const countResult = await sequelize.query(countQuery, {
            replacements: [userId, type],
            type: QueryTypes.SELECT
        });

        const totalCount = countResult[0]?.totalCount || 0;

        if (!rows || rows.length === 0) {
            return responseError(res, 404, `No ${type} data found`);
        }
        const favs = await Favourite.findAll({
            where: { userId },
            attributes: ['itemId', 'type'],
        });
        const favMap = new Map(favs.map(f => [`${f.type}-${f.itemId}`, true]));

        const enrichedData = rows.map(item => ({
            ...item,
            status: item.status || "active",
            isFavourite: favMap.has(`${type || item.type}-${item.id}`)
        }));

        return responseSuccess(res, 200, "Favourites fetched successfully", {
            data: enrichedData,
            pagination: { page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) }
        });
    } catch (error) {
        return responseError(res, 500, "Internal server error", error.message);
    }
};
