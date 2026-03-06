const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  createExercise,
  getExercises,
  getExerciseDetail,
  updateExercise,
  deleteExercise,
  getActivityTypes,
} = require('../controllers/exercise.controller');

router.post('/create', verifyToken, createExercise);
router.get('/list', verifyToken, getExercises);
router.get('/activity-types', verifyToken, getActivityTypes);
router.get('/detail/:id', verifyToken, getExerciseDetail);
router.put('/update/:id', verifyToken, updateExercise);
router.delete('/delete/:id', verifyToken, deleteExercise);

module.exports = router;
