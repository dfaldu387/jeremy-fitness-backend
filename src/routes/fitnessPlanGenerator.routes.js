const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  getOptions,
  createFitnessPlan,
  acceptPlan,
  getCurrentPlan,
  getPlanDetail,
  listPlans,
  updatePlan,
  deletePlan,
  regeneratePlan,
  generateWeeklyWorkouts,
  toggleWorkoutFavorite,
  getCalendarWorkouts,
  getWorkoutsByDay,
} = require('../controllers/fitnessPlanGenerator.controller');

// Form options
router.get('/options', verifyToken, getOptions);

// Fitness plan CRUD
router.post('/generate', verifyToken, createFitnessPlan);
router.get('/current', verifyToken, getCurrentPlan);
router.get('/list', verifyToken, listPlans);
router.get('/detail/:id', verifyToken, getPlanDetail);
router.put('/update/:id', verifyToken, updatePlan);
router.delete('/delete/:id', verifyToken, deletePlan);

// Plan actions
router.post('/accept/:id', verifyToken, acceptPlan);
router.post('/regenerate/:id', verifyToken, regeneratePlan);

// Weekly workouts
router.post('/generate-workouts/:id', verifyToken, generateWeeklyWorkouts);
router.patch('/favorite-workout/:id', verifyToken, toggleWorkoutFavorite);

// Calendar
router.get('/calendar', verifyToken, getCalendarWorkouts);
router.get('/workouts-by-day', verifyToken, getWorkoutsByDay);

module.exports = router;
