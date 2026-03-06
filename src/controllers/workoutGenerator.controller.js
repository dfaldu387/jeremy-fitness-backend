const { User, WorkoutGenerator } = require('../models/associations');
const { responseSuccess, responseError } = require('../utils/response');

// Valid options for validation
const VALID_WORKOUT_TYPES = ['strength_training', 'hiit_workout', 'yoga_flow', 'mobility_stretching'];
const VALID_FITNESS_LEVELS = ['beginner', 'intermediate', 'advanced'];
const VALID_WORKOUT_INTENSITIES = ['low', 'moderate', 'intense'];

const VALID_TARGET_AREAS = {
  strength_training: ['upper_body', 'lower_body', 'chest', 'back', 'legs', 'arms', 'shoulder', 'core'],
  hiit_workout: ['upper_body', 'lower_body', 'chest', 'back', 'legs', 'arms', 'shoulder', 'core'],
  yoga_flow: ['upper_body', 'lower_body', 'chest', 'back', 'legs', 'arms', 'shoulder', 'core', 'hips', 'full_body'],
  mobility_stretching: ['shoulders', 'triceps', 'biceps', 'neck', 'chest', 'abs', 'back', 'legs', 'upper_body', 'lower_body']
};

const VALID_EQUIPMENT = ['body_weight', 'sand_bags', 'bands', 'dumbbells', 'barbells'];

const VALID_DURATIONS = {
  strength_training: [30, 45, 60],
  hiit_workout: [30, 45, 60],
  yoga_flow: [30, 45, 60],
  mobility_stretching: [10, 20, 30]
};

// Retry function with exponential backoff for rate limit errors
const retryWithBackoff = async (fn, maxRetries = 3, initialDelay = 1000) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = error.status || error.response?.status;
      if (status === 429 && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.log(`Rate limit hit. Retrying in ${delay}ms... (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
};

// Build system prompt based on workout type
const getSystemPrompt = (workoutType) => {
  const baseInstruction = `You must respond ONLY with a valid JSON object (no markdown, no code blocks, no extra text).`;

  const prompts = {
    strength_training: `
You are an expert strength and conditioning coach. Generate a detailed strength training workout based on the user's preferences.

${baseInstruction} The JSON must have this exact structure:

{
  "workout_name": "Creative workout name",
  "workout_summary": "Brief 1-2 sentence overview of the workout",
  "warm_up": {
    "duration_minutes": number,
    "exercises": [
      {
        "name": "Exercise name",
        "duration_seconds": number,
        "description": "Brief instruction"
      }
    ]
  },
  "main_workout": {
    "total_exercises": number,
    "exercises": [
      {
        "name": "Exercise name",
        "sets": number,
        "reps": "number or range (e.g. '8-12')",
        "rest_seconds": number,
        "duration_seconds": number,
        "description": "Brief form instruction",
        "muscle_group": "Primary muscle targeted",
        "equipment": "Equipment needed or 'None'"
      }
    ]
  },
  "cool_down": {
    "duration_minutes": number,
    "exercises": [
      {
        "name": "Exercise name",
        "duration_seconds": number,
        "description": "Brief instruction"
      }
    ]
  },
  "total_duration_minutes": number,
  "estimated_calories_burned": "range (e.g. '200-300')",
  "tips": ["Array of 2-3 tips for this workout"]
}

Guidelines:
- Match exercises to the user's fitness level
- Only use equipment the user has available
- Target the specified muscle groups
- Fill the requested duration with appropriate exercises and rest
- Include proper warm-up and cool-down
- Provide clear, concise form instructions`,

    hiit_workout: `
You are an expert HIIT (High-Intensity Interval Training) coach. Generate a detailed HIIT workout based on the user's preferences.

${baseInstruction} The JSON must have this exact structure:

{
  "workout_name": "Creative HIIT workout name",
  "workout_summary": "Brief 1-2 sentence overview",
  "warm_up": {
    "duration_minutes": number,
    "exercises": [
      {
        "name": "Exercise name",
        "duration_seconds": number,
        "description": "Brief instruction"
      }
    ]
  },
  "main_workout": {
    "total_rounds": number,
    "work_seconds": number,
    "rest_seconds": number,
    "exercises": [
      {
        "name": "Exercise name",
        "duration_seconds": number,
        "rest_seconds": number,
        "rounds": number,
        "description": "Brief form instruction",
        "muscle_group": "Primary muscle targeted",
        "equipment": "Equipment needed or 'None'",
        "intensity": "Low/Medium/High"
      }
    ]
  },
  "cool_down": {
    "duration_minutes": number,
    "exercises": [
      {
        "name": "Exercise name",
        "duration_seconds": number,
        "description": "Brief instruction"
      }
    ]
  },
  "total_duration_minutes": number,
  "estimated_calories_burned": "range (e.g. '300-500')",
  "tips": ["Array of 2-3 tips for this workout"]
}

Guidelines:
- Design high-intensity intervals with appropriate work/rest ratios
- Match intensity to the user's fitness level (beginner: 1:2, intermediate: 1:1, advanced: 2:1 work:rest)
- Only use equipment the user has available
- Target the specified muscle groups
- Fill the requested duration
- Include proper warm-up and cool-down`,

    yoga_flow: `
You are an expert yoga instructor. Generate a detailed yoga flow sequence based on the user's preferences.

${baseInstruction} The JSON must have this exact structure:

{
  "workout_name": "Creative yoga flow name",
  "workout_summary": "Brief 1-2 sentence overview of the flow",
  "intention": "A mindful intention for this practice",
  "warm_up": {
    "duration_minutes": number,
    "poses": [
      {
        "name": "Pose name (Sanskrit + English)",
        "duration_seconds": number,
        "description": "Brief alignment instruction",
        "side": "both/left/right/center"
      }
    ]
  },
  "main_flow": {
    "total_poses": number,
    "poses": [
      {
        "name": "Pose name (Sanskrit + English)",
        "duration_seconds": number,
        "description": "Brief alignment instruction",
        "body_area": "Primary body area",
        "difficulty": "Easy/Moderate/Challenging",
        "side": "both/left/right/center",
        "breath_cue": "Inhale/Exhale/Hold"
      }
    ]
  },
  "cool_down": {
    "duration_minutes": number,
    "poses": [
      {
        "name": "Pose name",
        "duration_seconds": number,
        "description": "Brief instruction"
      }
    ]
  },
  "savasana_minutes": number,
  "total_duration_minutes": number,
  "tips": ["Array of 2-3 mindful practice tips"]
}

Guidelines:
- Match pose difficulty to the user's yogi level
- Create a logical flowing sequence between poses
- Target the specified body areas
- Fill the requested duration
- Include breathwork cues
- Include proper warm-up, cool-down, and savasana`,

    mobility_stretching: `
You are an expert mobility and stretching coach. Generate a detailed mobility/stretching session based on the user's preferences.

${baseInstruction} The JSON must have this exact structure:

{
  "workout_name": "Creative session name",
  "workout_summary": "Brief 1-2 sentence overview",
  "warm_up": {
    "duration_minutes": number,
    "exercises": [
      {
        "name": "Exercise name",
        "duration_seconds": number,
        "description": "Brief instruction"
      }
    ]
  },
  "main_session": {
    "total_exercises": number,
    "exercises": [
      {
        "name": "Stretch/mobility exercise name",
        "duration_seconds": number,
        "sets": number,
        "description": "Brief form instruction",
        "body_area": "Target body area",
        "type": "Static/Dynamic/PNF",
        "side": "both/left/right/center"
      }
    ]
  },
  "cool_down": {
    "duration_minutes": number,
    "exercises": [
      {
        "name": "Exercise name",
        "duration_seconds": number,
        "description": "Brief instruction"
      }
    ]
  },
  "total_duration_minutes": number,
  "tips": ["Array of 2-3 mobility tips"]
}

Guidelines:
- Focus on the specified target body areas
- Include a mix of static and dynamic stretches
- Progress from gentle to deeper stretches
- Fill the requested duration
- Include proper breathing cues in descriptions
- Keep it accessible — no equipment needed`
  };

  return prompts[workoutType];
};

// Build user message for AI
const buildUserMessage = (params) => {
  const { workout_type, fitness_level, time, target_body_areas, equipment, workout_intensity } = params;

  const workoutTypeLabel = {
    strength_training: 'Strength Training',
    hiit_workout: 'HIIT Workout',
    yoga_flow: 'Yoga Flow',
    mobility_stretching: 'Mobility / Stretching'
  };

  let message = `Generate a ${workoutTypeLabel[workout_type]} workout with the following preferences:\n\n`;
  message += `DURATION: ${time} minutes\n`;
  message += `TARGET BODY AREAS: ${JSON.stringify(target_body_areas)}\n`;

  if (fitness_level) {
    message += `FITNESS/EXPERIENCE LEVEL: ${fitness_level}\n`;
  }

  if (workout_intensity) {
    message += `WORKOUT INTENSITY: ${workout_intensity}\n`;
  }

  if (equipment && equipment.length > 0) {
    message += `AVAILABLE EQUIPMENT: ${JSON.stringify(equipment)}\n`;
  }

  message += `\nGenerate a complete workout plan that fills the ${time}-minute duration.`;
  return message;
};

// Call OpenAI to generate workout
const callOpenAI = async (systemPrompt, userMessage) => {
  return await retryWithBackoff(async () => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error?.message || 'OpenAI API error');
      error.status = response.status;
      throw error;
    }

    return data.choices[0].message.content;
  }, 3, 2000);
};

// Parse AI response to JSON
const parseAIResponse = (aiResponse) => {
  try {
    return JSON.parse(aiResponse);
  } catch (parseError) {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse AI response');
  }
};

// ============================================================
// CONTROLLERS
// ============================================================

/**
 * POST /generate
 * Generate a workout using AI and save it
 */
exports.generateWorkout = async (req, res) => {
  try {
    const { workout_type, fitness_level, time, target_body_areas, equipment, workout_intensity } = req.body;

    // Validate workout_type
    if (!workout_type || !VALID_WORKOUT_TYPES.includes(workout_type)) {
      return responseError(res, 400, `workout_type is required and must be one of: ${VALID_WORKOUT_TYPES.join(', ')}`);
    }

    // Validate fitness_level (required for strength_training, hiit_workout, yoga_flow)
    if (['strength_training', 'hiit_workout', 'yoga_flow'].includes(workout_type)) {
      if (!fitness_level || !VALID_FITNESS_LEVELS.includes(fitness_level)) {
        return responseError(res, 400, `fitness_level is required for ${workout_type} and must be one of: ${VALID_FITNESS_LEVELS.join(', ')}`);
      }
    }

    // Validate time
    if (!time || !VALID_DURATIONS[workout_type].includes(time)) {
      return responseError(res, 400, `time is required and must be one of: ${VALID_DURATIONS[workout_type].join(', ')} minutes`);
    }

    // Validate target_body_areas
    if (!target_body_areas || !Array.isArray(target_body_areas) || target_body_areas.length === 0) {
      return responseError(res, 400, 'target_body_areas is required and must be a non-empty array');
    }

    // Validate equipment (required for strength_training, hiit_workout)
    if (['strength_training', 'hiit_workout'].includes(workout_type)) {
      if (!equipment || !Array.isArray(equipment) || equipment.length === 0) {
        return responseError(res, 400, `equipment is required for ${workout_type} and must be a non-empty array`);
      }
    }

    // Validate workout_intensity (optional)
    if (workout_intensity && !VALID_WORKOUT_INTENSITIES.includes(workout_intensity)) {
      return responseError(res, 400, `workout_intensity must be one of: ${VALID_WORKOUT_INTENSITIES.join(', ')}`);
    }

    // Generate workout name
    const workoutTypeLabel = {
      strength_training: 'Strength Training',
      hiit_workout: 'HIIT Workout',
      yoga_flow: 'Yoga Flow',
      mobility_stretching: 'Mobility / Stretching'
    };
    const generator_name = `${workoutTypeLabel[workout_type]} - ${time}min`;

    // Call AI to generate workout
    const systemPrompt = getSystemPrompt(workout_type);
    const userMessage = buildUserMessage({ workout_type, fitness_level, time, target_body_areas, equipment, workout_intensity });
    const aiResponse = await callOpenAI(systemPrompt, userMessage);
    const generatedWorkout = parseAIResponse(aiResponse);

    // Save to database
    const workoutGenerator = await WorkoutGenerator.create({
      user_id: req.user.id,
      generator_name,
      workout_type,
      fitness_level: fitness_level || null,
      workout_intensity: workout_intensity || null,
      time,
      target_body_areas,
      equipment: equipment || null,
      generated_workout: generatedWorkout
    });

    const result = workoutGenerator.toJSON();
    if (typeof result.target_body_areas === 'string') {
      result.target_body_areas = JSON.parse(result.target_body_areas);
    }
    if (typeof result.equipment === 'string') {
      result.equipment = JSON.parse(result.equipment);
    }
    if (typeof result.generated_workout === 'string') {
      result.generated_workout = JSON.parse(result.generated_workout);
    }

    return responseSuccess(res, 201, 'Workout generated successfully', { workoutGenerator: result });
  } catch (error) {
    console.error('Generate workout error:', error);
    return responseError(res, 500, 'Failed to generate workout', error.message);
  }
};

/**
 * POST /create
 * Save a workout generator config (without AI generation)
 */
exports.createWorkoutGenerator = async (req, res) => {
  try {
    const { generator_name, workout_type, fitness_level, time, target_body_areas, equipment, workout_intensity } = req.body;

    if (!generator_name) {
      return responseError(res, 400, 'Generator name is required');
    }

    if (!workout_type || !VALID_WORKOUT_TYPES.includes(workout_type)) {
      return responseError(res, 400, `workout_type is required and must be one of: ${VALID_WORKOUT_TYPES.join(', ')}`);
    }

    if (!time) {
      return responseError(res, 400, 'Time is required');
    }

    if (!target_body_areas || !Array.isArray(target_body_areas) || target_body_areas.length === 0) {
      return responseError(res, 400, 'Target body areas is required and must be an array');
    }

    const workoutGenerator = await WorkoutGenerator.create({
      user_id: req.user.id,
      generator_name,
      workout_type,
      fitness_level: fitness_level || null,
      workout_intensity: workout_intensity || null,
      time,
      target_body_areas,
      equipment: equipment || null
    });

    return responseSuccess(res, 201, 'Workout generator created successfully', { workoutGenerator });
  } catch (error) {
    return responseError(res, 500, 'Failed to create workout generator', error.message);
  }
};

/**
 * GET /list
 * Get paginated list of user's workout generators
 */
exports.getWorkoutGenerators = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { workout_type } = req.query;

    const where = { user_id: req.user.id };
    if (workout_type && VALID_WORKOUT_TYPES.includes(workout_type)) {
      where.workout_type = workout_type;
    }

    const { count, rows } = await WorkoutGenerator.findAndCountAll({
      where,
      order: [['created_date', 'DESC']],
      limit,
      offset
    });

    const workoutGenerators = rows.map(item => {
      const data = item.toJSON();
      if (typeof data.target_body_areas === 'string') {
        data.target_body_areas = JSON.parse(data.target_body_areas);
      }
      if (typeof data.equipment === 'string') {
        data.equipment = JSON.parse(data.equipment);
      }
      if (typeof data.generated_workout === 'string') {
        data.generated_workout = JSON.parse(data.generated_workout);
      }
      return data;
    });

    const totalPages = Math.ceil(count / limit);

    return responseSuccess(res, 200, 'Workout generators fetched successfully', {
      workoutGenerators,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    return responseError(res, 500, 'Failed to fetch workout generators', error.message);
  }
};

/**
 * GET /detail/:id
 * Get a single workout generator by ID
 */
exports.getWorkoutGeneratorDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const workoutGenerator = await WorkoutGenerator.findByPk(id);

    if (!workoutGenerator) {
      return responseError(res, 404, 'Workout generator not found');
    }

    if (workoutGenerator.user_id !== req.user.id) {
      return responseError(res, 403, 'You are not authorized to view this workout generator');
    }

    const data = workoutGenerator.toJSON();
    if (typeof data.target_body_areas === 'string') {
      data.target_body_areas = JSON.parse(data.target_body_areas);
    }
    if (typeof data.equipment === 'string') {
      data.equipment = JSON.parse(data.equipment);
    }
    if (typeof data.generated_workout === 'string') {
      data.generated_workout = JSON.parse(data.generated_workout);
    }

    return responseSuccess(res, 200, 'Workout generator fetched successfully', { workoutGenerator: data });
  } catch (error) {
    return responseError(res, 500, 'Failed to fetch workout generator', error.message);
  }
};

/**
 * DELETE /delete/:id
 * Delete a workout generator
 */
exports.deleteWorkoutGenerator = async (req, res) => {
  try {
    const { id } = req.params;

    const workoutGenerator = await WorkoutGenerator.findByPk(id);

    if (!workoutGenerator) {
      return responseError(res, 404, 'Workout generator not found');
    }

    if (workoutGenerator.user_id !== req.user.id) {
      return responseError(res, 403, 'You are not authorized to delete this workout generator');
    }

    await workoutGenerator.destroy();

    return responseSuccess(res, 200, 'Workout generator deleted successfully', { id: parseInt(id) });
  } catch (error) {
    return responseError(res, 500, 'Failed to delete workout generator', error.message);
  }
};

/**
 * GET /options
 * Return valid options for the workout generator form
 */
exports.getWorkoutOptions = async (req, res) => {
  try {
    return responseSuccess(res, 200, 'Workout options fetched successfully', {
      workout_types: VALID_WORKOUT_TYPES.map(type => ({
        value: type,
        label: {
          strength_training: 'Strength Training',
          hiit_workout: 'HIIT Workout',
          yoga_flow: 'Yoga Flow',
          mobility_stretching: 'Mobility / Stretching'
        }[type]
      })),
      fitness_levels: VALID_FITNESS_LEVELS,
      workout_intensities: VALID_WORKOUT_INTENSITIES.map(intensity => ({
        value: intensity,
        label: {
          low: 'Low',
          moderate: 'Moderate',
          intense: 'Intense'
        }[intensity]
      })),
      durations: VALID_DURATIONS,
      target_body_areas: VALID_TARGET_AREAS,
      equipment: VALID_EQUIPMENT.map(eq => ({
        value: eq,
        label: {
          body_weight: 'Body Weight',
          sand_bags: 'Sand Bags',
          bands: 'Bands',
          dumbbells: 'Dumbbells',
          barbells: 'Barbells'
        }[eq]
      }))
    });
  } catch (error) {
    return responseError(res, 500, 'Failed to fetch workout options', error.message);
  }
};
