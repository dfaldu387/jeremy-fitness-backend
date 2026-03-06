const ProfileSetting = require('../models/profileSetting.model');
const { User } = require('../models/associations');
const { responseSuccess, responseError } = require('../utils/response');

exports.getProfileSetting = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return responseError(res, 400, "User ID missing from token");
    }

    const settings = await ProfileSetting.findOne({
      where: { userId },
      attributes: [
        "id",
        "userId",
        "updates_news",
        "hai_alerts",
        "exercise_alerts",
        "nutrition_alerts",
        "coaching_alerts",
        "giveaway_alerts",
        "lore_alerts",
        "new_product_alerts",
        "hci_reminders",
        "coaching_reminders",
        "sit_reminders",
        "drink_water_reminders",
        "stand_move_reminders",
        "sleep_reminders",
        "sync_iphone",
        "sync_apple_watch",
        "sync_apple_health_kit",
        "sync_android",
        "sync_android_fit",
        "sync_samsung_smart_watch",
        "sync_fitbit",
        "sync_oura_ring",
        "created_date",
        "updated_date"
      ],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["email", "name"]
        }
      ]
    });

    if (!settings) {
      return responseError(res, 404, "No profile settings found for this user");
    }

    return responseSuccess(res, 200, "Profile settings and user details fetched successfully", settings);

  } catch (error) {
    return responseError(res, 500, "Internal server error", error.message);
  }
};

exports.updateProfileSetting = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return responseError(res, 400, "User ID is required");
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return responseError(res, 404, "User not found");
    }

    const {
      updates_news,
      hai_alerts,
      exercise_alerts,
      nutrition_alerts,
      coaching_alerts,
      giveaway_alerts,
      lore_alerts,
      new_product_alerts,
      hci_reminders,
      coaching_reminders,
      sit_reminders,
      drink_water_reminders,
      stand_move_reminders,
      sleep_reminders,
      sync_iphone,
      sync_apple_watch,
      sync_apple_health_kit,
      sync_android,
      sync_android_fit,
      sync_samsung_smart_watch,
      sync_fitbit,
      sync_oura_ring
    } = req.body;

    const updateData = {};
    if (updates_news !== undefined) updateData.updates_news = updates_news;
    if (hai_alerts !== undefined) updateData.hai_alerts = hai_alerts;
    if (exercise_alerts !== undefined) updateData.exercise_alerts = exercise_alerts;
    if (nutrition_alerts !== undefined) updateData.nutrition_alerts = nutrition_alerts;
    if (coaching_alerts !== undefined) updateData.coaching_alerts = coaching_alerts;
    if (giveaway_alerts !== undefined) updateData.giveaway_alerts = giveaway_alerts;
    if (lore_alerts !== undefined) updateData.lore_alerts = lore_alerts;
    if (new_product_alerts !== undefined) updateData.new_product_alerts = new_product_alerts;
    if (hci_reminders !== undefined) updateData.hci_reminders = hci_reminders;
    if (coaching_reminders !== undefined) updateData.coaching_reminders = coaching_reminders;
    if (sit_reminders !== undefined) updateData.sit_reminders = sit_reminders;
    if (drink_water_reminders !== undefined) updateData.drink_water_reminders = drink_water_reminders;
    if (stand_move_reminders !== undefined) updateData.stand_move_reminders = stand_move_reminders;
    if (sleep_reminders !== undefined) updateData.sleep_reminders = sleep_reminders;
    if (sync_iphone !== undefined) updateData.sync_iphone = sync_iphone;
    if (sync_apple_watch !== undefined) updateData.sync_apple_watch = sync_apple_watch;
    if (sync_apple_health_kit !== undefined) updateData.sync_apple_health_kit = sync_apple_health_kit;
    if (sync_android !== undefined) updateData.sync_android = sync_android;
    if (sync_android_fit !== undefined) updateData.sync_android_fit = sync_android_fit;
    if (sync_samsung_smart_watch !== undefined) updateData.sync_samsung_smart_watch = sync_samsung_smart_watch;
    if (sync_fitbit !== undefined) updateData.sync_fitbit = sync_fitbit;
    if (sync_oura_ring !== undefined) updateData.sync_oura_ring = sync_oura_ring;

    let settings = await ProfileSetting.findOne({ where: { userId } });

    if (settings) {
      await settings.update(updateData);
    } else {
      settings = await ProfileSetting.create({
        user: userId,
        updates_news: updates_news ?? false,
        hai_alerts: hai_alerts ?? false,
        exercise_alerts: exercise_alerts ?? false,
        nutrition_alerts: nutrition_alerts ?? false,
        coaching_alerts: coaching_alerts ?? false,
        giveaway_alerts: giveaway_alerts ?? false,
        lore_alerts: lore_alerts ?? false,
        new_product_alerts: new_product_alerts ?? false,
        hci_reminders: hci_reminders ?? false,
        coaching_reminders: coaching_reminders ?? false,
        sit_reminders: sit_reminders ?? false,
        drink_water_reminders: drink_water_reminders ?? false,
        stand_move_reminders: stand_move_reminders ?? false,
        sleep_reminders: sleep_reminders ?? false,
        sync_iphone: sync_iphone ?? false,
        sync_apple_watch: sync_apple_watch ?? false,
        sync_apple_health_kit: sync_apple_health_kit ?? false,
        sync_android: sync_android ?? false,
        sync_android_fit: sync_android_fit ?? false,
        sync_samsung_smart_watch: sync_samsung_smart_watch ?? false,
        sync_fitbit: sync_fitbit ?? false,
        sync_oura_ring: sync_oura_ring ?? false
      });
    }
    return responseSuccess(res, 200, "Notification settings updated successfully", settings);

  } catch (error) {
    return responseError(res, 500, "Internal server error", error.message);
  }
};
