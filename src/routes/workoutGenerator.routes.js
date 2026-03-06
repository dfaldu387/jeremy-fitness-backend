const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  generateWorkout,
  createWorkoutGenerator,
  getWorkoutGenerators,
  getWorkoutGeneratorDetail,
  deleteWorkoutGenerator,
  getWorkoutOptions,
} = require('../controllers/workoutGenerator.controller');

router.post('/generate', verifyToken, generateWorkout);
router.post('/create', verifyToken, createWorkoutGenerator);
router.get('/list', verifyToken, getWorkoutGenerators);
router.get('/options', verifyToken, getWorkoutOptions);
router.get('/detail/:id', verifyToken, getWorkoutGeneratorDetail);
router.delete('/delete/:id', verifyToken, deleteWorkoutGenerator);

module.exports = router;
