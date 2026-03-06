const { Op } = require('sequelize');
const { Exercise, ActivityType, User } = require('../models/associations');
const { responseSuccess, responseError } = require('../utils/response');

/**
 * POST /create
 * Create a new exercise session
 */
exports.createExercise = async (req, res) => {
  try {
    const {
      activity_type_id,
      exercise_name,
      hr,
      zone,
      zone_label,
      pace,
      cadence,
      power,
      elevation,
      time,
      duration,
      location
    } = req.body;

    if (!activity_type_id) {
      return responseError(res, 400, 'Activity type is required');
    }

    if (!exercise_name) {
      return responseError(res, 400, 'Exercise name is required');
    }

    if (!duration) {
      return responseError(res, 400, 'Duration is required');
    }

    // Verify activity type exists
    const activityType = await ActivityType.findByPk(activity_type_id);
    if (!activityType) {
      return responseError(res, 404, 'Activity type not found');
    }

    const exercise = await Exercise.create({
      user_id: req.user.id,
      activity_type_id,
      exercise_name,
      hr: hr || null,
      zone: zone || null,
      zone_label: zone_label || null,
      pace: pace || null,
      cadence: cadence || null,
      power: power || null,
      elevation: elevation || null,
      time: time || null,
      duration,
      date: new Date().toISOString().split('T')[0],
      location: location || null,
      status: 'active'
    });

    const result = await Exercise.findByPk(exercise.id, {
      include: [
        {
          model: ActivityType,
          as: 'activityType',
          attributes: ['id', 'name', 'icon', 'color']
        }
      ]
    });

    return responseSuccess(res, 201, 'Exercise created successfully', { exercise: result });
  } catch (error) {
    console.error('Create exercise error:', error);
    return responseError(res, 500, 'Failed to create exercise', error.message);
  }
};

/**
 * GET /list
 * Get paginated list of user's exercises
 */
exports.getExercises = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { activity_type_id, status, date, start_date, end_date } = req.query;

    const where = { user_id: req.user.id };

    if (activity_type_id) {
      where.activity_type_id = activity_type_id;
    }

    if (status) {
      where.status = status;
    }

    // Filter by exact date e.g. ?date=2026-03-02
    if (date) {
      where.date = date;
    }

    // Filter by date range e.g. ?start_date=2026-03-01&end_date=2026-03-07
    if (start_date && end_date) {
      where.date = { [Op.between]: [start_date, end_date] };
    } else if (start_date) {
      where.date = { [Op.gte]: start_date };
    } else if (end_date) {
      where.date = { [Op.lte]: end_date };
    }

    const { count, rows } = await Exercise.findAndCountAll({
      where,
      include: [
        {
          model: ActivityType,
          as: 'activityType',
          attributes: ['id', 'name', 'icon', 'color']
        }
      ],
      order: [['created_date', 'DESC']],
      limit,
      offset
    });

    const totalPages = Math.ceil(count / limit);

    return responseSuccess(res, 200, 'Exercises fetched successfully', {
      exercises: rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get exercises error:', error);
    return responseError(res, 500, 'Failed to fetch exercises', error.message);
  }
};

/**
 * GET /detail/:id
 * Get single exercise detail
 */
exports.getExerciseDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const exercise = await Exercise.findByPk(id, {
      include: [
        {
          model: ActivityType,
          as: 'activityType',
          attributes: ['id', 'name', 'icon', 'color']
        }
      ]
    });

    if (!exercise) {
      return responseError(res, 404, 'Exercise not found');
    }

    if (exercise.user_id !== req.user.id) {
      return responseError(res, 403, 'You are not authorized to view this exercise');
    }

    return responseSuccess(res, 200, 'Exercise fetched successfully', { exercise });
  } catch (error) {
    console.error('Get exercise detail error:', error);
    return responseError(res, 500, 'Failed to fetch exercise', error.message);
  }
};

/**
 * PUT /update/:id
 * Update exercise (status, metrics etc.)
 */
exports.updateExercise = async (req, res) => {
  try {
    const { id } = req.params;

    const exercise = await Exercise.findByPk(id);

    if (!exercise) {
      return responseError(res, 404, 'Exercise not found');
    }

    if (exercise.user_id !== req.user.id) {
      return responseError(res, 403, 'You are not authorized to update this exercise');
    }

    const allowedFields = [
      'exercise_name', 'hr', 'zone', 'zone_label', 'pace',
      'cadence', 'power', 'elevation', 'time', 'duration',
      'date', 'location', 'status', 'activity_type_id'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    await exercise.update(updates);

    const result = await Exercise.findByPk(id, {
      include: [
        {
          model: ActivityType,
          as: 'activityType',
          attributes: ['id', 'name', 'icon', 'color']
        }
      ]
    });

    return responseSuccess(res, 200, 'Exercise updated successfully', { exercise: result });
  } catch (error) {
    console.error('Update exercise error:', error);
    return responseError(res, 500, 'Failed to update exercise', error.message);
  }
};

/**
 * DELETE /delete/:id
 * Delete an exercise
 */
exports.deleteExercise = async (req, res) => {
  try {
    const { id } = req.params;

    const exercise = await Exercise.findByPk(id);

    if (!exercise) {
      return responseError(res, 404, 'Exercise not found');
    }

    if (exercise.user_id !== req.user.id) {
      return responseError(res, 403, 'You are not authorized to delete this exercise');
    }

    await exercise.destroy();

    return responseSuccess(res, 200, 'Exercise deleted successfully', { id: parseInt(id) });
  } catch (error) {
    console.error('Delete exercise error:', error);
    return responseError(res, 500, 'Failed to delete exercise', error.message);
  }
};

/**
 * GET /activity-types
 * Get all activity types for dropdown
 */
exports.getActivityTypes = async (req, res) => {
  try {
    const activityTypes = await ActivityType.findAll({
      where: { is_active: true },
      attributes: ['id', 'name', 'icon', 'color'],
      order: [['name', 'ASC']]
    });

    return responseSuccess(res, 200, 'Activity types fetched successfully', { activityTypes });
  } catch (error) {
    console.error('Get activity types error:', error);
    return responseError(res, 500, 'Failed to fetch activity types', error.message);
  }
};
