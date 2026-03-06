const { Op } = require('sequelize');
const { User, ExerciseHistory } = require('../models/associations');
const { responseSuccess, responseError } = require('../utils/response');

const VALID_EXERCISE_TYPES = ['outdoor_run', 'indoor_run', 'outdoor_cycling', 'indoor_cycling', 'walking', 'inteli_rope', 'resistance_training', 'hiit_workout', 'yoga_flow', 'mobility_stretching'];
const VALID_INTENSITIES = ['low', 'medium', 'high'];
const VALID_STATUSES = ['active', 'paused', 'completed'];

// Which fields are relevant for each exercise type
const TYPE_FIELDS = {
  outdoor_run: ['distance_km', 'pace_per_km', 'calories'],
  indoor_run: ['distance_km', 'pace_per_km', 'calories'],
  outdoor_cycling: ['distance_km', 'avg_speed_kmh', 'calories'],
  indoor_cycling: ['distance_km', 'avg_speed_kmh', 'calories'],
  walking: ['distance_km', 'steps', 'calories'],
  inteli_rope: ['calories', 'intensity'],
  resistance_training: ['total_exercises', 'total_load_kg', 'calories'],
  hiit_workout: ['calories', 'intensity'],
  yoga_flow: ['total_poses', 'intensity', 'calories'],
  mobility_stretching: ['total_poses', 'intensity', 'calories'],
};

// Display labels and formatting for card stats
const DISPLAY_FIELDS = {
  outdoor_run: [
    { key: 'distance_km', label: 'Distance', format: (v) => `${v} km` },
    { key: 'pace_per_km', label: 'Pace', format: (v) => `${v}/km` },
    { key: 'calories', label: 'Calories', format: (v) => `${v}` },
  ],
  indoor_run: [
    { key: 'distance_km', label: 'Distance', format: (v) => `${v} km` },
    { key: 'pace_per_km', label: 'Pace', format: (v) => `${v}/km` },
    { key: 'calories', label: 'Calories', format: (v) => `${v}` },
  ],
  outdoor_cycling: [
    { key: 'distance_km', label: 'Distance', format: (v) => `${v} km` },
    { key: 'avg_speed_kmh', label: 'Avg Speed', format: (v) => `${v} km/h` },
    { key: 'calories', label: 'Calories', format: (v) => `${v}` },
  ],
  indoor_cycling: [
    { key: 'distance_km', label: 'Distance', format: (v) => `${v} km` },
    { key: 'avg_speed_kmh', label: 'Avg Speed', format: (v) => `${v} km/h` },
    { key: 'calories', label: 'Calories', format: (v) => `${v}` },
  ],
  walking: [
    { key: 'distance_km', label: 'Distance', format: (v) => `${v} km` },
    { key: 'steps', label: 'Steps', format: (v) => `${v}` },
    { key: 'calories', label: 'Calories', format: (v) => `${v}` },
  ],
  inteli_rope: [
    { key: 'calories', label: 'Calories', format: (v) => `${v}` },
    { key: 'intensity', label: 'Intensity', format: (v) => v ? v.charAt(0).toUpperCase() + v.slice(1) : '' },
  ],
  resistance_training: [
    { key: 'total_exercises', label: 'Exercises', format: (v) => `${v}` },
    { key: 'total_load_kg', label: 'Total Load', format: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k kg` : `${v} kg` },
    { key: 'calories', label: 'Calories', format: (v) => `${v}` },
  ],
  hiit_workout: [
    { key: 'calories', label: 'Calories', format: (v) => `${v}` },
    { key: 'intensity', label: 'Intensity', format: (v) => v ? v.charAt(0).toUpperCase() + v.slice(1) : '' },
  ],
  yoga_flow: [
    { key: 'total_poses', label: 'Poses', format: (v) => `${v}` },
    { key: 'intensity', label: 'Intensity', format: (v) => v ? v.charAt(0).toUpperCase() + v.slice(1) : '' },
    { key: 'calories', label: 'Calories', format: (v) => `${v}` },
  ],
  mobility_stretching: [
    { key: 'total_poses', label: 'Poses', format: (v) => `${v}` },
    { key: 'intensity', label: 'Intensity', format: (v) => v ? v.charAt(0).toUpperCase() + v.slice(1) : '' },
    { key: 'calories', label: 'Calories', format: (v) => `${v}` },
  ],
};

// Exercise types that show map on the card
const MAP_TYPES = ['outdoor_run', 'outdoor_cycling', 'walking'];

// Exercise type labels for display
const TYPE_LABELS = {
  outdoor_run: 'Outdoor Run',
  indoor_run: 'Indoor Run',
  outdoor_cycling: 'Outdoor Cycling',
  indoor_cycling: 'Indoor Cycling',
  walking: 'Walking',
  inteli_rope: 'Inteli-Rope',
  resistance_training: 'Resistance Training',
  hiit_workout: 'HIIT Workout',
  yoga_flow: 'Yoga Flow',
  mobility_stretching: 'Mobility / Stretching',
};

/**
 * Helper: get date group label (Today, Yesterday, This Week, Earlier)
 */
function getDateGroup(exerciseDate) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - today.getDay()); // Sunday start

  const exDate = new Date(exerciseDate);
  const exDateOnly = new Date(exDate.getFullYear(), exDate.getMonth(), exDate.getDate());

  if (exDateOnly.getTime() === today.getTime()) return 'Today';
  if (exDateOnly.getTime() === yesterday.getTime()) return 'Yesterday';
  if (exDateOnly >= weekStart) return 'This Week';
  return 'Earlier';
}

/**
 * Helper: format exercise for card display
 * - Removes null/undefined fields
 * - Adds display_name, display_stats
 * - Adds show_map + map_thumbnail for outdoor exercises
 */
function formatExerciseCard(exercise) {
  const raw = exercise.toJSON ? exercise.toJSON() : exercise;
  const displayConfig = DISPLAY_FIELDS[raw.exercise_type] || [];

  // Remove null/undefined fields
  const data = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value !== null && value !== undefined) {
      data[key] = value;
    }
  }

  const stats = displayConfig
    .filter(field => raw[field.key] !== null && raw[field.key] !== undefined)
    .map(field => ({
      label: field.label,
      value: field.format(raw[field.key]),
      key: field.key,
    }));

  data.display_name = TYPE_LABELS[raw.exercise_type] || raw.exercise_name;
  data.display_stats = stats;

  // HR summary for card display
  if (raw.avg_heart_rate) {
    data.hr_summary = {
      avg: raw.avg_heart_rate,
      max: raw.max_heart_rate || null,
    };
  }

  // Training load badge
  if (raw.training_load) {
    data.training_load = raw.training_load;
  }

  // Status indicator
  if (raw.status && raw.status !== 'completed') {
    data.status = raw.status;
  }

  // Parse JSON text fields stored as strings in DB (handles double-stringified values)
  const safeJsonParse = (val) => {
    if (!val) return null;
    if (typeof val === 'object') return val;
    try {
      let parsed = JSON.parse(val);
      // Handle double-stringified JSON (string inside string)
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch { /* keep as string */ }
      }
      return parsed;
    } catch { return null; }
  };

  // Parse route_coordinates for all types (stored as JSON string in DB)
  data.route_coordinates = safeJsonParse(raw.route_coordinates);
  console.log(`[formatExerciseCard] id=${raw.id} route_coordinates type=${typeof data.route_coordinates}, isArray=${Array.isArray(data.route_coordinates)}, value=${JSON.stringify(data.route_coordinates)?.substring(0, 100)}`);

  // Show map if exercise has route coordinates OR is an outdoor type
  const hasRouteData = Array.isArray(data.route_coordinates) && data.route_coordinates.length > 0;
  if (MAP_TYPES.includes(raw.exercise_type) || hasRouteData) {
    data.show_map = true;
    data.map_thumbnail = raw.map_thumbnail || null;
  } else {
    data.show_map = false;
  }

  // Parse other JSON text fields
  if (raw.heart_rate_data) {
    data.heart_rate_data = safeJsonParse(raw.heart_rate_data);
  }
  if (raw.hr_zones) {
    data.hr_zones = safeJsonParse(raw.hr_zones);
  }
  if (raw.elevation_data) {
    data.elevation_data = safeJsonParse(raw.elevation_data);
  }

  return data;
}

/**
 * POST /create
 * Create a new exercise history entry
 */
exports.createExercise = async (req, res) => {
  try {
    const {
      exercise_type, exercise_name, duration_minutes, calories,
      distance_km, pace_per_km, avg_speed_kmh,
      total_exercises, total_load_kg,
      total_poses, intensity, steps,
      map_thumbnail, route_coordinates, exercise_date,
      // New fields
      target_time_minutes, target_distance_km, target_calories, target_hr_zone,
      avg_heart_rate, max_heart_rate, min_heart_rate, heart_rate_data,
      hr_zones, hr_recovery_1min, hr_recovery_2min,
      avg_cadence, avg_power, elevation_gain, elevation_data,
      training_load, rpe_rating, notes, status
    } = req.body;

    if (!exercise_type || !VALID_EXERCISE_TYPES.includes(exercise_type)) {
      return responseError(res, 400, `exercise_type is required and must be one of: ${VALID_EXERCISE_TYPES.join(', ')}`);
    }

    if (!exercise_name || !exercise_name.trim()) {
      return responseError(res, 400, 'exercise_name is required');
    }

    if (!duration_minutes || duration_minutes <= 0) {
      return responseError(res, 400, 'duration_minutes is required and must be greater than 0');
    }

    if (!exercise_date) {
      return responseError(res, 400, 'exercise_date is required');
    }

    if (intensity && !VALID_INTENSITIES.includes(intensity)) {
      return responseError(res, 400, `intensity must be one of: ${VALID_INTENSITIES.join(', ')}`);
    }

    if (rpe_rating !== undefined && rpe_rating !== null && (rpe_rating < 1 || rpe_rating > 5)) {
      return responseError(res, 400, 'rpe_rating must be between 1 and 5');
    }

    if (target_hr_zone !== undefined && target_hr_zone !== null && (target_hr_zone < 1 || target_hr_zone > 5)) {
      return responseError(res, 400, 'target_hr_zone must be between 1 and 5');
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return responseError(res, 400, `status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    const exercise = await ExerciseHistory.create({
      user_id: req.user.id,
      exercise_type,
      exercise_name: exercise_name.trim(),
      duration_minutes,
      calories: calories || null,
      distance_km: distance_km || null,
      pace_per_km: pace_per_km || null,
      avg_speed_kmh: avg_speed_kmh || null,
      total_exercises: total_exercises || null,
      total_load_kg: total_load_kg || null,
      total_poses: total_poses || null,
      intensity: intensity || null,
      steps: steps || null,
      map_thumbnail: map_thumbnail || null,
      route_coordinates: route_coordinates || null,
      exercise_date,
      // Targets
      target_time_minutes: target_time_minutes || null,
      target_distance_km: target_distance_km || null,
      target_calories: target_calories || null,
      target_hr_zone: target_hr_zone || null,
      // Heart Rate
      avg_heart_rate: avg_heart_rate || null,
      max_heart_rate: max_heart_rate || null,
      min_heart_rate: min_heart_rate || null,
      heart_rate_data: heart_rate_data || null,
      hr_zones: hr_zones || null,
      hr_recovery_1min: hr_recovery_1min || null,
      hr_recovery_2min: hr_recovery_2min || null,
      // Performance
      avg_cadence: avg_cadence || null,
      avg_power: avg_power || null,
      elevation_gain: elevation_gain || null,
      elevation_data: elevation_data || null,
      // Training Load & Effort
      training_load: training_load || null,
      rpe_rating: rpe_rating || null,
      notes: notes || null,
      status: status || 'completed',
    });

    return responseSuccess(res, 201, 'Exercise created successfully', { exercise });
  } catch (error) {
    return responseError(res, 500, 'Failed to create exercise', error.message);
  }
};

/**
 * GET /list
 * Simple paginated exercise history for HOME screen
 * Returns: exercise_name, exercise_type, duration_minutes, exercise_date
 * Query params: page, limit
 */
exports.getExerciseHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await ExerciseHistory.findAndCountAll({
      where: { user_id: req.user.id },
      attributes: ['id', 'exercise_type', 'exercise_name', 'duration_minutes', 'exercise_date'],
      order: [['exercise_date', 'DESC']],
      limit,
      offset
    });

    const totalPages = Math.ceil(count / limit);

    return responseSuccess(res, 200, 'Exercise history fetched successfully', {
      exercises: rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    return responseError(res, 500, 'Failed to fetch exercise history', error.message);
  }
};

/**
 * GET /detail-list
 * Detail screen: Grouped by Today/Yesterday/This Week/Earlier with display_stats
 * Supports filter tabs (exercise_type) and Load More pagination
 * Query params: page, limit, exercise_type (all, running, cycling, strength, etc.)
 */
exports.getExerciseHistoryDetail = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { exercise_type } = req.query;

    const where = { user_id: req.user.id };

    if (exercise_type && exercise_type !== 'all') {
      const typeMap = {
        running: ['outdoor_run', 'indoor_run'],
        cycling: ['outdoor_cycling', 'indoor_cycling'],
        walking: ['walking'],
        inteli_rope: ['inteli_rope'],
        strength: ['resistance_training'],
        hiit: ['hiit_workout'],
        yoga: ['yoga_flow'],
        mobility: ['mobility_stretching'],
      };

      if (typeMap[exercise_type]) {
        where.exercise_type = { [Op.in]: typeMap[exercise_type] };
      } else if (VALID_EXERCISE_TYPES.includes(exercise_type)) {
        where.exercise_type = exercise_type;
      }
    }

    const { count, rows } = await ExerciseHistory.findAndCountAll({
      where,
      order: [['exercise_date', 'DESC']],
      limit,
      offset
    });

    // Group exercises by date period
    const groupOrder = ['Today', 'Yesterday', 'This Week', 'Earlier'];
    const grouped = {};

    rows.forEach(exercise => {
      const group = getDateGroup(exercise.exercise_date);
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(formatExerciseCard(exercise));
    });

    // Build ordered sections array
    const sections = groupOrder
      .filter(group => grouped[group])
      .map(group => ({
        title: group,
        data: grouped[group],
      }));

    const totalPages = Math.ceil(count / limit);
    const hasMore = page < totalPages;

    return responseSuccess(res, 200, 'Exercise history detail fetched successfully', {
      sections,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count,
        itemsPerPage: limit,
        hasMore,
      }
    });
  } catch (error) {
    return responseError(res, 500, 'Failed to fetch exercise history detail', error.message);
  }
};

/**
 * GET /detail/:id
 * Get single exercise detail
 */
exports.getExerciseDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const exercise = await ExerciseHistory.findByPk(id);

    if (!exercise) {
      return responseError(res, 404, 'Exercise not found');
    }

    if (exercise.user_id !== req.user.id) {
      return responseError(res, 403, 'You are not authorized to view this exercise');
    }

    const formatted = formatExerciseCard(exercise);
    formatted.date_group = getDateGroup(exercise.exercise_date);

    const raw = exercise.toJSON ? exercise.toJSON() : exercise;

    // Safe JSON parser for TEXT fields stored as strings (handles double-stringified)
    const safeJsonParse = (val) => {
      if (!val) return null;
      if (typeof val === 'object') return val;
      try {
        let parsed = JSON.parse(val);
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch { /* keep as string */ }
        }
        return parsed;
      } catch { return null; }
    };

    // Include full workout data for detail view
    // Targets vs Actual comparison
    if (raw.target_time_minutes || raw.target_distance_km || raw.target_calories || raw.target_hr_zone) {
      formatted.targets = {};
      if (raw.target_time_minutes) {
        formatted.targets.time = { target: raw.target_time_minutes, actual: raw.duration_minutes, unit: 'min' };
      }
      if (raw.target_distance_km) {
        formatted.targets.distance = { target: raw.target_distance_km, actual: raw.distance_km, unit: 'km' };
      }
      if (raw.target_calories) {
        formatted.targets.calories = { target: raw.target_calories, actual: raw.calories, unit: 'cal' };
      }
      if (raw.target_hr_zone) {
        formatted.targets.hr_zone = raw.target_hr_zone;
      }
    }

    // Full HR data
    if (raw.avg_heart_rate) {
      formatted.heart_rate = {
        avg: raw.avg_heart_rate,
        max: raw.max_heart_rate || null,
        min: raw.min_heart_rate || null,
        data: safeJsonParse(raw.heart_rate_data),
      };
    }

    // HR Zones
    if (raw.hr_zones) {
      formatted.hr_zones = safeJsonParse(raw.hr_zones);
    }

    // HR Recovery with rating
    if (raw.hr_recovery_1min || raw.hr_recovery_2min) {
      const recovery1 = raw.hr_recovery_1min || 0;
      let hr_recovery_rating = 'Poor';
      if (recovery1 >= 40) hr_recovery_rating = 'Excellent';
      else if (recovery1 >= 30) hr_recovery_rating = 'Good';
      else if (recovery1 >= 20) hr_recovery_rating = 'Average';

      formatted.hr_recovery = {
        one_min: raw.hr_recovery_1min || null,
        two_min: raw.hr_recovery_2min || null,
        rating: hr_recovery_rating,
      };
    }

    // Performance metrics
    if (raw.avg_cadence || raw.avg_power || raw.elevation_gain) {
      formatted.performance = {
        ...(raw.avg_cadence && { cadence: { value: raw.avg_cadence, unit: 'spm' } }),
        ...(raw.avg_power && { power: { value: raw.avg_power, unit: 'W' } }),
        ...(raw.elevation_gain && { elevation: { value: raw.elevation_gain, unit: 'm' } }),
      };
      if (raw.elevation_data) {
        formatted.performance.elevation_data = safeJsonParse(raw.elevation_data);
      }
    }

    // Training load & RPE
    if (raw.training_load) formatted.training_load = raw.training_load;
    if (raw.rpe_rating) formatted.rpe_rating = raw.rpe_rating;
    if (raw.notes) formatted.notes = raw.notes;
    if (raw.status) formatted.status = raw.status;

    return responseSuccess(res, 200, 'Exercise fetched successfully', { exercise: formatted });
  } catch (error) {
    return responseError(res, 500, 'Failed to fetch exercise', error.message);
  }
};

/**
 * PUT /update/:id
 * Update an exercise entry
 */
exports.updateExercise = async (req, res) => {
  try {
    const { id } = req.params;

    const exercise = await ExerciseHistory.findByPk(id);

    if (!exercise) {
      return responseError(res, 404, 'Exercise not found');
    }

    if (exercise.user_id !== req.user.id) {
      return responseError(res, 403, 'You are not authorized to update this exercise');
    }

    const {
      exercise_name, duration_minutes, calories,
      distance_km, pace_per_km, avg_speed_kmh,
      total_exercises, total_load_kg,
      total_poses, intensity, steps,
      map_thumbnail, route_coordinates, exercise_date,
      // New fields
      target_time_minutes, target_distance_km, target_calories, target_hr_zone,
      avg_heart_rate, max_heart_rate, min_heart_rate, heart_rate_data,
      hr_zones, hr_recovery_1min, hr_recovery_2min,
      avg_cadence, avg_power, elevation_gain, elevation_data,
      training_load, rpe_rating, notes, status
    } = req.body;

    if (intensity && !VALID_INTENSITIES.includes(intensity)) {
      return responseError(res, 400, `intensity must be one of: ${VALID_INTENSITIES.join(', ')}`);
    }

    if (rpe_rating !== undefined && rpe_rating !== null && (rpe_rating < 1 || rpe_rating > 5)) {
      return responseError(res, 400, 'rpe_rating must be between 1 and 5');
    }

    if (target_hr_zone !== undefined && target_hr_zone !== null && (target_hr_zone < 1 || target_hr_zone > 5)) {
      return responseError(res, 400, 'target_hr_zone must be between 1 and 5');
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return responseError(res, 400, `status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    await exercise.update({
      ...(exercise_name && { exercise_name: exercise_name.trim() }),
      ...(duration_minutes && { duration_minutes }),
      ...(calories !== undefined && { calories }),
      ...(distance_km !== undefined && { distance_km }),
      ...(pace_per_km !== undefined && { pace_per_km }),
      ...(avg_speed_kmh !== undefined && { avg_speed_kmh }),
      ...(total_exercises !== undefined && { total_exercises }),
      ...(total_load_kg !== undefined && { total_load_kg }),
      ...(total_poses !== undefined && { total_poses }),
      ...(map_thumbnail !== undefined && { map_thumbnail }),
      ...(route_coordinates !== undefined && { route_coordinates }),
      ...(intensity !== undefined && { intensity }),
      ...(steps !== undefined && { steps }),
      ...(exercise_date && { exercise_date }),
      // Targets
      ...(target_time_minutes !== undefined && { target_time_minutes }),
      ...(target_distance_km !== undefined && { target_distance_km }),
      ...(target_calories !== undefined && { target_calories }),
      ...(target_hr_zone !== undefined && { target_hr_zone }),
      // Heart Rate
      ...(avg_heart_rate !== undefined && { avg_heart_rate }),
      ...(max_heart_rate !== undefined && { max_heart_rate }),
      ...(min_heart_rate !== undefined && { min_heart_rate }),
      ...(heart_rate_data !== undefined && { heart_rate_data }),
      ...(hr_zones !== undefined && { hr_zones }),
      ...(hr_recovery_1min !== undefined && { hr_recovery_1min }),
      ...(hr_recovery_2min !== undefined && { hr_recovery_2min }),
      // Performance
      ...(avg_cadence !== undefined && { avg_cadence }),
      ...(avg_power !== undefined && { avg_power }),
      ...(elevation_gain !== undefined && { elevation_gain }),
      ...(elevation_data !== undefined && { elevation_data }),
      // Training Load & Effort
      ...(training_load !== undefined && { training_load }),
      ...(rpe_rating !== undefined && { rpe_rating }),
      ...(notes !== undefined && { notes }),
      ...(status !== undefined && { status }),
    });

    return responseSuccess(res, 200, 'Exercise updated successfully', { exercise });
  } catch (error) {
    return responseError(res, 500, 'Failed to update exercise', error.message);
  }
};

/**
 * DELETE /delete/:id
 * Delete an exercise entry
 */
exports.deleteExercise = async (req, res) => {
  try {
    const { id } = req.params;

    const exercise = await ExerciseHistory.findByPk(id);

    if (!exercise) {
      return responseError(res, 404, 'Exercise not found');
    }

    if (exercise.user_id !== req.user.id) {
      return responseError(res, 403, 'You are not authorized to delete this exercise');
    }

    await exercise.destroy();

    return responseSuccess(res, 200, 'Exercise deleted successfully', { id: parseInt(id) });
  } catch (error) {
    return responseError(res, 500, 'Failed to delete exercise', error.message);
  }
};

/**
 * DELETE /delete-all
 * Delete all exercise history for the logged-in user
 */
exports.deleteAllExercises = async (req, res) => {
  try {
    const deleted = await ExerciseHistory.destroy({
      where: { user_id: req.user.id }
    });

    return responseSuccess(res, 200, 'All exercises deleted successfully', { deletedCount: deleted });
  } catch (error) {
    return responseError(res, 500, 'Failed to delete exercises', error.message);
  }
};

/**
 * GET /types
 * Return valid exercise types and their fields for the form
 */
exports.getExerciseTypes = async (req, res) => {
  try {
    // Static list of exercise types matching the mobile UI (New Exercise section)
    // Target fields available per exercise type
    const TARGET_FIELDS = {
      outdoor_run: ['target_time_minutes', 'target_distance_km', 'target_calories', 'target_hr_zone'],
      indoor_run: ['target_time_minutes', 'target_distance_km', 'target_calories', 'target_hr_zone'],
      outdoor_cycling: ['target_time_minutes', 'target_distance_km', 'target_calories', 'target_hr_zone'],
      indoor_cycling: ['target_time_minutes', 'target_distance_km', 'target_calories', 'target_hr_zone'],
      walking: ['target_time_minutes', 'target_distance_km', 'target_calories'],
      inteli_rope: ['target_time_minutes', 'target_calories'],
      resistance_training: ['target_time_minutes', 'target_calories'],
      hiit_workout: ['target_time_minutes', 'target_calories', 'target_hr_zone'],
      yoga_flow: ['target_time_minutes', 'target_calories'],
      mobility_stretching: ['target_time_minutes', 'target_calories'],
    };

    const newExerciseTypes = [
      { value: 'outdoor_run', label: 'Outdoor Run', icon: 'running', color: '#4CAF50', fields: TYPE_FIELDS.outdoor_run, target_fields: TARGET_FIELDS.outdoor_run },
      { value: 'outdoor_cycling', label: 'Outdoor Cycle', icon: 'cycling', color: '#2196F3', fields: TYPE_FIELDS.outdoor_cycling, target_fields: TARGET_FIELDS.outdoor_cycling },
      { value: 'indoor_cycling', label: 'Indoor Cycle', icon: 'cycling', color: '#2196F3', fields: TYPE_FIELDS.indoor_cycling, target_fields: TARGET_FIELDS.indoor_cycling },
      { value: 'walking', label: 'Walking', icon: 'walking', color: '#FFC107', fields: TYPE_FIELDS.walking, target_fields: TARGET_FIELDS.walking },
      { value: 'inteli_rope', label: 'Inteli-Rope', icon: 'inteli_rope', color: '#FF9800', fields: TYPE_FIELDS.inteli_rope, target_fields: TARGET_FIELDS.inteli_rope },
      { value: 'resistance_training', label: 'Resistance', icon: 'resistance', color: '#E91E63', fields: TYPE_FIELDS.resistance_training, target_fields: TARGET_FIELDS.resistance_training },
      { value: 'hiit_workout', label: 'HIIT Workout', icon: 'hiit', color: '#F44336', fields: TYPE_FIELDS.hiit_workout, target_fields: TARGET_FIELDS.hiit_workout },
      { value: 'yoga_flow', label: 'Yoga Flow', icon: 'yoga', color: '#E91E63', fields: TYPE_FIELDS.yoga_flow, target_fields: TARGET_FIELDS.yoga_flow },
      { value: 'mobility_stretching', label: 'Mobility / Stretching', icon: 'mobility', color: '#E91E63', fields: TYPE_FIELDS.mobility_stretching, target_fields: TARGET_FIELDS.mobility_stretching },
    ];

    return responseSuccess(res, 200, 'Exercise types fetched successfully', {
      exercise_types: newExerciseTypes,
      filter_categories: [
        { value: 'all', label: 'All Workouts' },
        { value: 'running', label: 'Running' },
        { value: 'cycling', label: 'Cycling' },
        { value: 'walking', label: 'Walking' },
        { value: 'inteli_rope', label: 'Inteli-Rope' },
        { value: 'strength', label: 'Strength' },
        { value: 'hiit', label: 'HIIT' },
        { value: 'yoga', label: 'Yoga' },
        { value: 'mobility', label: 'Mobility / Stretching' }
      ],
      intensities: VALID_INTENSITIES.map(i => ({
        value: i,
        label: { low: 'Low', medium: 'Medium', high: 'High' }[i]
      }))
    });
  } catch (error) {
    return responseError(res, 500, 'Failed to fetch exercise types', error.message);
  }
};
