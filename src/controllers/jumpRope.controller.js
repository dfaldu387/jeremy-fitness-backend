const { Op, fn, col, literal } = require('sequelize');
const sequelize = require('../config/database');
const JumpRopeSession = require('../models/jumpRopeSession.model');
const JumpRopeGoal = require('../models/jumpRopeGoal.model');
const JumpRopeBadge = require('../models/jumpRopeBadge.model');
const { responseSuccess, responseError } = require('../utils/response');

// Badge definitions
const BADGE_DEFINITIONS = [
  { key: 'first_workout', label: '1 WORKOUT', condition: (stats) => stats.totalSessions >= 1 },
  { key: '10_sessions', label: '10 WORKOUTS', condition: (stats) => stats.totalSessions >= 10 },
  { key: '1000_jumps', label: '1K JUMPS', condition: (stats) => stats.totalJumps >= 1000 },
  { key: '7_day_streak', label: '7 DAY STREAK', condition: (stats) => stats.currentStreak >= 7 },
  { key: '10000_jumps', label: '10K JUMPS', condition: (stats) => stats.totalJumps >= 10000 },
];

// ── Helpers ──

function safeJsonParse(val) {
  if (!val) return null;
  try {
    const parsed = JSON.parse(val);
    return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
  } catch {
    return null;
  }
}

async function calculateStreak(userId) {
  const sessions = await JumpRopeSession.findAll({
    where: { user_id: userId, status: 'completed' },
    attributes: [[fn('DISTINCT', col('session_date')), 'session_date']],
    order: [[col('session_date'), 'DESC']],
    raw: true,
  });

  if (!sessions.length) return { current: 0, longest: 0 };

  const dates = sessions.map(s => {
    const d = new Date(s.session_date);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  let currentStreak = 1;
  let longestStreak = 1;
  let tempStreak = 1;

  // Check if streak is still active (last session is today or yesterday)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffFromToday = Math.floor((today - dates[0]) / (1000 * 60 * 60 * 24));
  if (diffFromToday > 1) {
    currentStreak = 0;
  }

  for (let i = 1; i < dates.length; i++) {
    const diff = Math.floor((dates[i - 1] - dates[i]) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      tempStreak++;
      if (currentStreak > 0 && i <= currentStreak) {
        currentStreak = tempStreak;
      }
    } else {
      if (tempStreak > longestStreak) longestStreak = tempStreak;
      if (currentStreak > 0 && currentStreak < tempStreak) {
        // current streak already broken
      }
      tempStreak = 1;
      if (currentStreak > 0 && i === currentStreak) {
        // current streak ended
      }
    }
  }
  if (tempStreak > longestStreak) longestStreak = tempStreak;

  // Recalculate current streak properly
  let current = 0;
  if (diffFromToday <= 1) {
    current = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = Math.floor((dates[i - 1] - dates[i]) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        current++;
      } else {
        break;
      }
    }
  }

  if (current > longestStreak) longestStreak = current;

  return { current, longest: longestStreak };
}

async function checkAndAwardBadges(userId) {
  const [statsResult, streak, existingBadges] = await Promise.all([
    JumpRopeSession.findOne({
      where: { user_id: userId, status: 'completed' },
      attributes: [
        [fn('COUNT', col('id')), 'totalSessions'],
        [fn('SUM', col('jump_count')), 'totalJumps'],
      ],
      raw: true,
    }),
    calculateStreak(userId),
    JumpRopeBadge.findAll({
      where: { user_id: userId },
      attributes: ['badge_key'],
      raw: true,
    }),
  ]);

  const stats = {
    totalSessions: parseInt(statsResult.totalSessions) || 0,
    totalJumps: parseInt(statsResult.totalJumps) || 0,
    currentStreak: streak.current,
  };

  const earnedKeys = new Set(existingBadges.map(b => b.badge_key));
  const newBadges = [];

  for (const badge of BADGE_DEFINITIONS) {
    if (!earnedKeys.has(badge.key) && badge.condition(stats)) {
      await JumpRopeBadge.create({
        user_id: userId,
        badge_key: badge.key,
        earned_date: new Date(),
      });
      newBadges.push({ key: badge.key, label: badge.label });
    }
  }

  return newBadges;
}

// ── Controllers ──

const createSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      jump_count, duration_seconds, calories_burned,
      avg_jumps_per_minute, max_jumps_per_minute, trip_count,
      avg_heart_rate, max_heart_rate, jump_data, heart_rate_data,
      session_date, rope_device_id, notes, status
    } = req.body;

    if (!jump_count || !duration_seconds || !calories_burned || !session_date) {
      return responseError(res, 400, 'jump_count, duration_seconds, calories_burned, and session_date are required');
    }

    const session = await JumpRopeSession.create({
      user_id: userId,
      jump_count,
      duration_seconds,
      calories_burned,
      avg_jumps_per_minute: avg_jumps_per_minute || (duration_seconds > 0 ? jump_count / (duration_seconds / 60) : 0),
      max_jumps_per_minute,
      trip_count: trip_count || 0,
      avg_heart_rate,
      max_heart_rate,
      jump_data: jump_data ? JSON.stringify(jump_data) : null,
      heart_rate_data: heart_rate_data ? JSON.stringify(heart_rate_data) : null,
      session_date,
      rope_device_id,
      notes,
      status: status || 'completed',
    });

    const newBadges = await checkAndAwardBadges(userId);

    return responseSuccess(res, 201, 'Session created successfully', {
      session,
      new_badges: newBadges,
    });
  } catch (error) {
    console.error('createSession error:', error);
    return responseError(res, 500, 'Failed to create session', error.message);
  }
};

const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get Monday of current week
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const [recent, best, total, weeklyCount, activeGoal, streak, badges] = await Promise.all([
      // Recent: last session
      JumpRopeSession.findOne({
        where: { user_id: userId, status: 'completed' },
        order: [['session_date', 'DESC'], ['created_date', 'DESC']],
        raw: true,
      }),

      // Best: max of each metric
      JumpRopeSession.findOne({
        where: { user_id: userId, status: 'completed' },
        attributes: [
          [fn('MAX', col('jump_count')), 'max_jumps'],
          [fn('MAX', col('duration_seconds')), 'max_duration'],
          [fn('MAX', col('calories_burned')), 'max_calories'],
        ],
        raw: true,
      }),

      // Total: sums + count
      JumpRopeSession.findOne({
        where: { user_id: userId, status: 'completed' },
        attributes: [
          [fn('SUM', col('jump_count')), 'total_jumps'],
          [fn('SUM', col('duration_seconds')), 'total_duration'],
          [fn('SUM', col('calories_burned')), 'total_calories'],
          [fn('COUNT', col('id')), 'total_sessions'],
        ],
        raw: true,
      }),

      // Weekly sessions count
      JumpRopeSession.count({
        where: {
          user_id: userId,
          status: 'completed',
          session_date: { [Op.between]: [monday, sunday] },
        },
      }),

      // Active goal
      JumpRopeGoal.findOne({
        where: { user_id: userId, is_active: true },
        raw: true,
      }),

      // Streak
      calculateStreak(userId),

      // Badges
      JumpRopeBadge.findAll({
        where: { user_id: userId },
        attributes: ['badge_key', 'earned_date'],
        raw: true,
      }),
    ]);

    const earnedBadgeMap = {};
    badges.forEach(b => { earnedBadgeMap[b.badge_key] = b.earned_date; });

    const badgeList = BADGE_DEFINITIONS.map(bd => ({
      key: bd.key,
      label: bd.label,
      earned: !!earnedBadgeMap[bd.key],
      earned_date: earnedBadgeMap[bd.key] || null,
    }));

    return responseSuccess(res, 200, 'Dashboard data fetched', {
      recent: recent ? {
        jumps: recent.jump_count,
        duration_seconds: recent.duration_seconds,
        calories: recent.calories_burned,
        session_date: recent.session_date,
      } : null,
      best: {
        jumps: parseInt(best?.max_jumps) || 0,
        duration_seconds: parseInt(best?.max_duration) || 0,
        calories: parseFloat(best?.max_calories) || 0,
      },
      total: {
        jumps: parseInt(total?.total_jumps) || 0,
        duration_seconds: parseInt(total?.total_duration) || 0,
        calories: parseFloat(total?.total_calories) || 0,
        sessions: parseInt(total?.total_sessions) || 0,
      },
      weekly_goal: {
        target: activeGoal?.target_sessions_per_week || 7,
        completed: weeklyCount,
      },
      streak: {
        current: streak.current,
        longest: streak.longest,
      },
      badges: badgeList,
    });
  } catch (error) {
    console.error('getDashboard error:', error);
    return responseError(res, 500, 'Failed to fetch dashboard', error.message);
  }
};

const getSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await JumpRopeSession.findAndCountAll({
      where: { user_id: userId, status: 'completed' },
      order: [['session_date', 'DESC'], ['created_date', 'DESC']],
      limit,
      offset,
      raw: true,
    });

    return responseSuccess(res, 200, 'Sessions fetched', {
      sessions: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('getSessions error:', error);
    return responseError(res, 500, 'Failed to fetch sessions', error.message);
  }
};

const getSessionDetail = async (req, res) => {
  try {
    const userId = req.user.id;
    const session = await JumpRopeSession.findByPk(req.params.id, { raw: true });

    if (!session) {
      return responseError(res, 404, 'Session not found');
    }
    if (session.user_id !== userId) {
      return responseError(res, 403, 'Unauthorized');
    }

    session.jump_data = safeJsonParse(session.jump_data);
    session.heart_rate_data = safeJsonParse(session.heart_rate_data);

    return responseSuccess(res, 200, 'Session detail fetched', { session });
  } catch (error) {
    console.error('getSessionDetail error:', error);
    return responseError(res, 500, 'Failed to fetch session detail', error.message);
  }
};

const getChartData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type = 'jumps', period = 'day' } = req.query;

    const validTypes = ['jumps', 'duration', 'burned', 'workout'];
    const validPeriods = ['day', 'week', 'month'];

    if (!validTypes.includes(type)) {
      return responseError(res, 400, `Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }
    if (!validPeriods.includes(period)) {
      return responseError(res, 400, `Invalid period. Must be one of: ${validPeriods.join(', ')}`);
    }

    // Determine metric column and aggregation
    let metricCol, aggFn;
    switch (type) {
      case 'jumps':
        metricCol = 'jump_count';
        aggFn = 'SUM';
        break;
      case 'duration':
        metricCol = 'duration_seconds';
        aggFn = 'SUM';
        break;
      case 'burned':
        metricCol = 'calories_burned';
        aggFn = 'SUM';
        break;
      case 'workout':
        metricCol = 'jump_count';
        aggFn = 'SUM';
        break;
    }

    // Determine date range and grouping
    let dateFormat, startDate, pointCount;
    const now = new Date();

    switch (period) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 13);
        pointCount = 14;
        break;
      case 'week':
        dateFormat = '%x-W%v'; // ISO year-week
        startDate = new Date(now);
        startDate.setDate(now.getDate() - (12 * 7));
        pointCount = 12;
        break;
      case 'month':
        dateFormat = '%Y-%m';
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 11);
        startDate.setDate(1);
        pointCount = 12;
        break;
    }
    startDate.setHours(0, 0, 0, 0);

    // Format startDate as YYYY-MM-DD string to avoid UTC timezone shift in query
    const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

    const results = await sequelize.query(
      `SELECT DATE_FORMAT(session_date, :dateFormat) as period_label,
              ${aggFn}(${metricCol}) as value,
              COUNT(*) as session_count
       FROM jump_rope_sessions
       WHERE user_id = :userId
         AND status = 'completed'
         AND session_date >= :startDateStr
       GROUP BY period_label
       ORDER BY period_label ASC`,
      {
        replacements: { dateFormat, userId, startDateStr },
        type: sequelize.constructor.QueryTypes.SELECT,
      }
    );

    // Build label map for gap-filling
    const resultMap = {};
    results.forEach(r => {
      resultMap[r.period_label] = {
        value: parseFloat(r.value) || 0,
        session_count: parseInt(r.session_count) || 0,
      };
    });

    // Helper: format date as YYYY-MM-DD in local timezone (avoids UTC shift from toISOString)
    const formatLocalDate = (d) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    // Generate all period labels and fill gaps
    const chartData = [];
    const cursor = new Date(startDate);

    if (period === 'day') {
      for (let i = 0; i < pointCount; i++) {
        const label = formatLocalDate(cursor);
        chartData.push({
          label,
          value: resultMap[label]?.value || 0,
          session_count: resultMap[label]?.session_count || 0,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
    } else if (period === 'week') {
      for (let i = 0; i < pointCount; i++) {
        // Get ISO week label from DB format
        const weekStart = new Date(cursor);
        const dayOfWeek = weekStart.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(weekStart.getDate() + mondayOffset);

        // Format as YYYY-Www to match MySQL %x-W%v
        const jan4 = new Date(weekStart.getFullYear(), 0, 4);
        const weekNum = Math.ceil(((weekStart - jan4) / (1000 * 60 * 60 * 24) + jan4.getDay() + 1) / 7);
        const label = `${weekStart.getFullYear()}-W${weekNum}`;

        chartData.push({
          label,
          value: resultMap[label]?.value || 0,
          session_count: resultMap[label]?.session_count || 0,
        });
        cursor.setDate(cursor.getDate() + 7);
      }
    } else if (period === 'month') {
      for (let i = 0; i < pointCount; i++) {
        const label = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        chartData.push({
          label,
          value: resultMap[label]?.value || 0,
          session_count: resultMap[label]?.session_count || 0,
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    return responseSuccess(res, 200, 'Chart data fetched', {
      type,
      period,
      data: chartData,
    });
  } catch (error) {
    console.error('getChartData error:', error);
    return responseError(res, 500, 'Failed to fetch chart data', error.message);
  }
};

const setGoal = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      target_sessions_per_week,
      target_jumps_per_session,
      target_duration_seconds,
      target_calories_per_session,
    } = req.body;

    if (!target_sessions_per_week) {
      return responseError(res, 400, 'target_sessions_per_week is required');
    }

    // Deactivate existing active goal
    await JumpRopeGoal.update(
      { is_active: false },
      { where: { user_id: userId, is_active: true } }
    );

    const goal = await JumpRopeGoal.create({
      user_id: userId,
      target_sessions_per_week,
      target_jumps_per_session,
      target_duration_seconds,
      target_calories_per_session,
    });

    return responseSuccess(res, 201, 'Goal set successfully', { goal });
  } catch (error) {
    console.error('setGoal error:', error);
    return responseError(res, 500, 'Failed to set goal', error.message);
  }
};

const deleteSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const session = await JumpRopeSession.findByPk(req.params.id);

    if (!session) {
      return responseError(res, 404, 'Session not found');
    }
    if (session.user_id !== userId) {
      return responseError(res, 403, 'Unauthorized');
    }

    await session.destroy();

    return responseSuccess(res, 200, 'Session deleted successfully');
  } catch (error) {
    console.error('deleteSession error:', error);
    return responseError(res, 500, 'Failed to delete session', error.message);
  }
};

module.exports = {
  createSession,
  getDashboard,
  getSessions,
  getSessionDetail,
  getChartData,
  setGoal,
  deleteSession,
};
