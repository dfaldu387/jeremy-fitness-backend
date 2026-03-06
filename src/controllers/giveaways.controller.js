const Giveaways = require('../models/giveaways.model');
const GiveawayProducts = require('../models/giveawayProducts.model');
const User = require('../models/user.model');
const AddressInfoGiveaway = require('../models/giveawayShipped.model');
const axios = require('axios');
const { responseSuccess, responseError } = require('../utils/response');
const DiscordJoin = require('../models/discordJoin.model');
const { Client, GatewayIntentBits, Events } = require('discord.js');

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

client.once('ready', async () => {
    console.log(`Discord bot logged in as ${client.user.tag}`);
});

client.login(DISCORD_BOT_TOKEN).catch(err => {
    console.error('Failed to login Discord bot:', err.message);
});

async function getUserIdByUsername(username) {
    try {
        const guild = await client.guilds.fetch(DISCORD_GUILD_ID);
        if (!guild) {
            return null;
        }

        const fetchedMembers = await guild.members.fetch({ query: username, limit: 10 });
        if (!fetchedMembers || fetchedMembers.size === 0) {
            return null;
        }

        const member = fetchedMembers.find(
            m => m.user.username.toLowerCase() === username.toLowerCase()
        ) || fetchedMembers.first();

        return member.user.id;
    } catch (error) {
        return null;
    }
}

async function fetchMemberFromGuild(userId) {
    try {
        const guild = await client.guilds.fetch(DISCORD_GUILD_ID);
        if (!guild) return null;

        const member = await guild.members.fetch(userId).catch(() => null);
        return member || null;
    } catch (err) {
        return null;
    }
}

// async function fetchMemberFromGuild(userId) {
//     try {
//         const guild = await client.guilds.fetch(DISCORD_GUILD_ID);
//         if (!guild) return null;

//         const member = await guild.members.fetch(userId).catch(() => null);
//         return member || null;
//     } catch (err) {
//         return null;
//     }
// }

exports.getMembershipGiveaways = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows: giveaways } = await GiveawayProducts.findAndCountAll({
            order: [['created_date', 'DESC']],
            attributes: ['id', 'product_name', 'image_url', 'created_date', 'end_date'],
            limit,
            offset
        });

        if (!giveaways || giveaways.length === 0) {
            return responseError(res, 404, "No giveaways found");
        }

        const now = new Date();

        const result = giveaways.map(g => {
            const status = new Date(g.end_date) > now ? 'active' : 'inactive';
            return { ...g.toJSON(), status };
        });

        const grouped = {
            active: result.filter(g => g.status === 'active'),
            inactive: result.filter(g => g.status === 'inactive')
        };

        const totalPages = Math.ceil(count / limit);

        return responseSuccess(res, 200, "Membership giveaways fetched by status", {
            ...grouped,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: count,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (err) {
        return responseError(res, 500, "Failed to fetch membership giveaways", err.message);
    }
};

exports.checkAndUpdateFollow = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { product_id, twitterUsername, wallet_id, discord_username } = req.body;

        if (!user_id || !product_id || !twitterUsername || !discord_username) {
            return responseError(res, 400, "user_id, product_id, twitterUsername, and discord_username are required");
        }
        const user = await User.findOne({ where: { id: user_id } });
        if (!user) return responseError(res, 400, "Invalid user_id: user does not exist");

        const product = await GiveawayProducts.findOne({ where: { id: product_id } });
        if (!product) return responseError(res, 400, "Invalid product_id: giveaway product does not exist");

        const existingGiveaway = await Giveaways.findOne({ where: { user_id, product_id } });
        if (existingGiveaway) return responseError(res, 400, "User has already claimed this giveaway for this product");

        let discordVerified = false;
        let discordData = null;
        let join = await DiscordJoin.findOne({ where: { username: discord_username } });
        let discord_user_id = null;

        if (!join) {
            discord_user_id = await getUserIdByUsername(discord_username);
            if (!discord_user_id) {
                return responseError(res, 404, "Discord user not found in the server");
            }

            const member = await fetchMemberFromGuild(discord_user_id);

            if (member) {
                join = await DiscordJoin.create({
                    discord_user_id: member.user.id,
                    username: member.user.username,
                    invite_code: null,
                    joined_at: member.joinedAt || new Date()
                });
                discordVerified = true;
                discordData = join;
            } else {
                return responseError(res, 404, "User is not a member of the Discord server");
            }
        } else {
            discordVerified = true;
            discordData = join;
        }

        const targets = [
            { username: "DeSciJeremy", field: "deSciJeremy_followed_id" },
            { username: "ElevenSapien", field: "sapien_eleven_followed_id" }
        ];

        // const targets = [
        //     { username: "KiritDhand26707", field: "deSciJeremy_followed_id" },
        //     { username: "KiritDhand26707", field: "sapien_eleven_followed_id" }
        // ];

        const checkFollow = async (source, target) => {
            const response = await axios.get("https://twitter-api45.p.rapidapi.com/checkfollow.php", {
                params: { user: source, follows: target },
                headers: {
                    "x-rapidapi-host": "twitter-api45.p.rapidapi.com",
                    "x-rapidapi-key": process.env.RAPIDAPI_KEY
                }
            });
            if (response.data?.is_follow === false) {
                return null;
            }
            return target;
        };

        const giveawayData = {
            user_id,
            product_id,
            wallet_connected_id: wallet_id || null,
            discord_connected_id: discord_user_id,
        };

        for (const target of targets) {
            const followedId = await checkFollow(twitterUsername, target.username);
            if (!followedId) {
                return responseError(res, 400, `User has not followed ${target.username}`);
            }
            giveawayData[target.field] = followedId;
        }

        const giveaway = await Giveaways.create(giveawayData);
        return responseSuccess(res, 200, "Giveaway verified successfully", {
            giveaway,
            discord: discordData
        });

    } catch (err) {
        return responseError(res, 500, "Failed to verify or add giveaway", err.message);
    }
};

exports.addAddressForGiveaway = async (req, res) => {
    try {
        const user_id = req.user.id;
        const {
            giveaway_product_id,
            name_of_user,
            street_address,
            city,
            state_province,
            zip_code,
            country,
            phone_number
        } = req.body;

        const missingFields = [];
        if (!user_id) missingFields.push('user_id');
        if (!giveaway_product_id) missingFields.push('giveaway_product_id');
        if (!name_of_user) missingFields.push('name_of_user');
        if (!street_address) missingFields.push('street_address');
        if (!city) missingFields.push('city');
        if (!state_province) missingFields.push('state_province');
        if (!zip_code) missingFields.push('zip_code');
        if (!country) missingFields.push('country');
        if (!phone_number) missingFields.push('phone_number');

        if (missingFields.length > 0) {
            return responseError(res, 400, `Missing required fields: ${missingFields.join(', ')}`);
        }

        const user = await User.findOne({ where: { id: user_id } });
        if (!user) {
            return responseError(res, 400, "Invalid user_id: user does not exist");
        }

        const giveaway = await Giveaways.findOne({ where: { id: giveaway_product_id, user_id } });
        if (!giveaway) {
            return responseError(res, 400, "Invalid giveaway_product_id: not found for this user");
        }

        const address = await AddressInfoGiveaway.create({
            user_id,
            giveaway_product_id,
            name_of_user,
            street_address,
            city,
            state_province,
            zip_code,
            country,
            phone_number
        });

        return responseSuccess(res, 200, "Address added successfully", address);

    } catch (err) {
        return responseError(res, 500, "Failed to add address", err.message);
    }
};
