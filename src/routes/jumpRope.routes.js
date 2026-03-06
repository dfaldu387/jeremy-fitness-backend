const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  createSession,
  getDashboard,
  getSessions,
  getSessionDetail,
  getChartData,
  setGoal,
  deleteSession,
} = require('../controllers/jumpRope.controller');

router.post('/create', verifyToken, createSession);
router.get('/dashboard', verifyToken, getDashboard);
router.get('/sessions', verifyToken, getSessions);
router.get('/session/:id', verifyToken, getSessionDetail);
router.get('/chart', verifyToken, getChartData);
router.post('/goal', verifyToken, setGoal);
router.delete('/session/:id', verifyToken, deleteSession);

module.exports = router;
