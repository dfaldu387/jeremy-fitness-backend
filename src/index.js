const path = require('path');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
require("dotenv").config({ path: path.resolve(__dirname, '..', envFile) });
console.log(`Loaded env file: ${envFile}`);
const express = require('express');
const cors = require('cors');

const sequelize = require('./config/database');
require('./models/associations');
require('./models/coachAssociations');
const authRoutes = require('./routes/auth.routes');
const profileSettingRoutes = require('./routes/profileSetting.routes');
const newsContent = require('./routes/newsContent.routes');
const referral = require('./routes/referral.routes');
const membershipContent = require('./routes/membershipContent.routes');
const stripePaymentRoutes = require('./routes/stripePayment.routes');
const mintpassRoutes = require('./routes/mintpass.routes');
const giveawaysRoutes = require("./routes/giveaways.routes");
const nutritionRoutes = require("./routes/nutrition.routes");
const nutritionCoachRoutes = require('./routes/nutritionCoach.routes');
const healthAIRoutes = require('./routes/healthAI.routes');
const privacyPolicyRoutes = require('./routes/privacyPolicy.routes');
const workoutGeneratorRoutes = require('./routes/workoutGenerator.routes');
const fitnessPlanGeneratorRoutes = require('./routes/fitnessPlanGenerator.routes');
const exerciseHistoryRoutes = require('./routes/exerciseHistory.routes');
const jumpRopeRoutes = require('./routes/jumpRope.routes');
const exerciseRoutes = require('./routes/exercise.routes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/newsContent', newsContent);
app.use('/api/profileSettings', profileSettingRoutes);
app.use('/api/referrals', referral);
app.use('/api/membershipContent', membershipContent);
app.use('/api/stripe', stripePaymentRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/api/userMP', mintpassRoutes);
app.use('/api/giveaways', giveawaysRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/nutritionCoach', nutritionCoachRoutes);
app.use('/api/hai', healthAIRoutes);
app.use('/api/privacyPolicy', privacyPolicyRoutes);
app.use('/api/workout-generator', workoutGeneratorRoutes);
app.use('/api/fitness-plan', fitnessPlanGeneratorRoutes);
app.use('/api/exercise-history', exerciseHistoryRoutes);
app.use('/api/jump-rope', jumpRopeRoutes);
app.use('/api/exercise', exerciseRoutes);

const startCrons = require("./cron");
startCrons();

app.get('/', (req, res) => {
  res.send('Hello from Node API Server Updated');
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected');
    await sequelize.sync({ alter: true });

    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Unable to start:', err);
  }
})();

// Global Express Error Handler
app.use((err, req, res, next) => {
  console.log('Global Error Handler:', err.message);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: "Internal Server Error" });
});

// Serve apple-app-site-association file
app.get('/.well-known/apple-app-site-association', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(path.join(__dirname, 'public', 'apple-app-site-association'));
});

// Handle 404 - Route not found
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, 'view', '404.html'))
});