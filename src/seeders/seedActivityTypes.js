const path = require('path');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
require('dotenv').config({ path: path.resolve(__dirname, '../..', envFile) });

const sequelize = require('../config/database');
const ActivityType = require('../models/activityType.model');

const defaultActivityTypes = [
  { name: 'Outdoor Run', icon: 'running', color: '#00BFA5' },
  { name: 'Outdoor Cycle', icon: 'cycling', color: '#37474F' },
  { name: 'Walking', icon: 'walking', color: '#8D6E63' },
  { name: 'Indoor Run', icon: 'running', color: '#FF7043' },
  { name: 'Indoor Cycle', icon: 'cycling', color: '#5C6BC0' },
  { name: 'Swimming', icon: 'swimming', color: '#29B6F6' },
  { name: 'Hiking', icon: 'hiking', color: '#66BB6A' },
  { name: 'Yoga', icon: 'yoga', color: '#AB47BC' },
  { name: 'Strength Training', icon: 'strength', color: '#EF5350' },
  { name: 'HIIT', icon: 'hiit', color: '#FFA726' },
  { name: 'Elliptical', icon: 'elliptical', color: '#78909C' },
  { name: 'Rowing', icon: 'rowing', color: '#26A69A' },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    await sequelize.sync({ alter: true });

    for (const type of defaultActivityTypes) {
      const [activityType, created] = await ActivityType.findOrCreate({
        where: { name: type.name },
        defaults: type
      });

      if (created) {
        console.log(`Created activity type: ${type.name}`);
      } else {
        console.log(`Activity type already exists: ${type.name}`);
      }
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
