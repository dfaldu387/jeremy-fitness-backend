const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  createExercise,
  getExerciseHistory,
  getExerciseHistoryDetail,
  getExerciseDetail,
  updateExercise,
  deleteExercise,
  deleteAllExercises,
  getExerciseTypes,
} = require('../controllers/exerciseHistory.controller');

router.post('/create', verifyToken, createExercise);
router.get('/list', verifyToken, getExerciseHistory);
router.get('/detail-list', verifyToken, getExerciseHistoryDetail);
router.get('/types', verifyToken, getExerciseTypes);
router.get('/detail/:id', verifyToken, getExerciseDetail);
router.put('/update/:id', verifyToken, updateExercise);
router.delete('/delete-all', verifyToken, deleteAllExercises);
router.delete('/delete/:id', verifyToken, deleteExercise);

module.exports = router;
