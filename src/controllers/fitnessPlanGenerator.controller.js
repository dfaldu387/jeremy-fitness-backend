const { User, FitnessPlan, FitnessPlanWorkout } = require('../models/associations');
const { responseSuccess, responseError } = require('../utils/response');
const { Op } = require('sequelize');

// ============================================================
// VALID OPTIONS (from Figma spec)
// ============================================================

const VALID_RESTRICTIONS = [
  'no_running',
  'no_overhead_pressing',
  'no_heavy_squats',
  'doctor_recommended_limitations',
  'pregnancy_postpartum_modifications',
  'limited_equipment',
  'time_limited_sessions'
];

const VALID_INJURIES = [
  'knee_pain',
  'lower_back_pain',
  'shoulder_impairment',
  'wrist_pain',
  'post_acl_tear',
  'chronic_tight_hips',
  'none'
];

const VALID_TRAINING_PREFERENCES = [
  'strength_training',
  'hiit',
  'yoga_mobility',
  'home_mobility',
  'gym_workouts',
  'bodyweight_only',
  'short_workouts',
  'longer_training_sessions',
  'cardio_focused',
  'minimal_equipment'
];

const VALID_FITNESS_GOALS = [
  'build_muscle',
  'lose_fat',
  'improve_conditioning',
  'get_stronger',
  'increase_mobility',
  'improve_posture',
  'train_for_a_sport',
  'improve_endurance',
  'rehab_return_to_training',
  'stress_reduction',
  'longevity_healthy_aging'
];

const VALID_TRAINING_EXPERIENCE = [
  'beginner',
  'intermediate',
  'advanced',
  'returning_after_break'
];

const VALID_EQUIPMENT = [
  'full_gym',
  'dumbbells',
  'resistance_bands',
  'bodyweight_only',
  'kettlebell_only',
  'trx',
  'home_gym',
  'no_equipment'
];

const VALID_TIME_AVAILABILITY = [
  '3_days_week',
  '5_days_week',
  '20_min_sessions',
  '45_min_sessions',
  'morning_training',
  'evening_training',
  'irregular_schedule'
];

const VALID_RECOVERY_LIFESTYLE = [
  'poor_sleep',
  'high_stress',
  'active_job',
  'sedentary_job',
  'travels_frequently',
  'night_shifts',
  'desk_job',
  'athlete_schedule'
];

// ============================================================
// UTILITY: Retry with exponential backoff
// ============================================================

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

// ============================================================
// UTILITY: Call OpenAI
// ============================================================

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
        temperature: 0.7,
        response_format: { type: "json_object" }
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

// ============================================================
// UTILITY: Parse AI JSON response
// ============================================================

const parseAIResponse = (aiResponse) => {
  // Strip markdown code fences if present
  let cleaned = aiResponse.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  try {
    return JSON.parse(cleaned);
  } catch (parseError) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse AI response');
  }
};

// ============================================================
// UTILITY: Parse JSON fields from DB result
// ============================================================

const parseJsonFields = (data) => {
  const jsonFields = [
    'restrictions', 'injuries_and_pain_areas', 'training_preferences',
    'fitness_goals', 'training_experience', 'available_equipment',
    'time_availability', 'recovery_and_lifestyle', 'fitness_plan_overview',
    'weekly_training_targets', 'training_intensity_volume',
    'weekly_calorie_burn', 'example_weekly_flow'
  ];
  const result = data.toJSON ? data.toJSON() : { ...data };
  for (const field of jsonFields) {
    if (typeof result[field] === 'string') {
      try { result[field] = JSON.parse(result[field]); } catch (e) { /* keep as string */ }
    }
  }
  return result;
};

// ============================================================
// UTILITY: Label maps for readable prompts
// ============================================================

const LABEL_MAP = {
  no_running: 'No Running',
  no_overhead_pressing: 'No Overhead Pressing',
  no_heavy_squats: 'No Heavy Squats',
  doctor_recommended_limitations: 'Doctor-Recommended Limitations',
  pregnancy_postpartum_modifications: 'Pregnancy / Postpartum Modifications',
  limited_equipment: 'Limited Equipment',
  time_limited_sessions: 'Time-Limited Sessions (≤30 Min)',
  knee_pain: 'Knee Pain',
  lower_back_pain: 'Lower Back Pain',
  shoulder_impairment: 'Shoulder Impairment',
  wrist_pain: 'Wrist Pain',
  post_acl_tear: 'Post ACL Tear',
  chronic_tight_hips: 'Chronic Tight Hips',
  none: 'None',
  strength_training: 'Strength Training',
  hiit: 'HIIT',
  yoga_mobility: 'Yoga / Mobility',
  home_mobility: 'Home Mobility',
  gym_workouts: 'Gym Workouts',
  bodyweight_only: 'Bodyweight Only',
  short_workouts: 'Short Workouts',
  longer_training_sessions: 'Longer Training Sessions',
  cardio_focused: 'Cardio-Focused',
  minimal_equipment: 'Minimal Equipment',
  build_muscle: 'Build Muscle',
  lose_fat: 'Lose Fat',
  improve_conditioning: 'Improve Conditioning',
  get_stronger: 'Get Stronger',
  increase_mobility: 'Increase Mobility',
  improve_posture: 'Improve Posture',
  train_for_a_sport: 'Train For A Sport',
  improve_endurance: 'Improve Endurance',
  rehab_return_to_training: 'Rehab / Return To Training',
  stress_reduction: 'Stress Reduction',
  longevity_healthy_aging: 'Longevity & Healthy Aging',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  returning_after_break: 'Returning After Break',
  full_gym: 'Full Gym',
  dumbbells: 'Dumbbells',
  resistance_bands: 'Resistance Bands',
  kettlebell_only: 'Kettlebell Only',
  trx: 'TRX',
  home_gym: 'Home Gym',
  no_equipment: 'No Equipment',
  '3_days_week': '3 Days/Week',
  '5_days_week': '5 Days/Week',
  '20_min_sessions': '20 Min Sessions',
  '45_min_sessions': '45 Min Sessions',
  morning_training: 'Morning Training',
  evening_training: 'Evening Training',
  irregular_schedule: 'Irregular Schedule',
  poor_sleep: 'Poor Sleep',
  high_stress: 'High Stress',
  active_job: 'Active Job',
  sedentary_job: 'Sedentary Job',
  travels_frequently: 'Travels Frequently',
  night_shifts: 'Night Shifts',
  desk_job: 'Desk Job',
  athlete_schedule: 'Athlete Schedule'
};

const toLabels = (arr) => arr.map(v => LABEL_MAP[v] || v);

// ============================================================
// AI PROMPTS
// ============================================================

const FITNESS_PLAN_SYSTEM_PROMPT = `
You are an expert fitness coach and personal trainer. Based on the user's input, generate a comprehensive and personalized fitness plan.

You must respond ONLY with a valid JSON object (no markdown, no code blocks, no extra text). The JSON must have this exact structure:

{
  "fitness_plan_overview": {
    "emphasizes": ["Array of key training emphases, e.g. Compound Lifts (Squats, Deadlifts, Push, Pull, Carries)"],
    "avoids": ["Array of things to avoid based on restrictions and injuries"]
  },
  "goal": "Clear, specific fitness goal statement (2-3 paragraphs describing what this plan supports)",
  "weekly_training_targets": {
    "target_days_per_week": "e.g. 4-6 Training Days Per Week",
    "breakdown": [
      {
        "category": "e.g. Strength Training",
        "frequency": "e.g. 3-4 Days (Full-Body Or Upper/Lower Split)"
      }
    ],
    "daily_steps": "e.g. 7,000-10,000 (Lifestyle Activity Encouraged)",
    "summary": "Brief summary of the balanced structure"
  },
  "training_intensity_volume": {
    "recommended_training_load": [
      {
        "type": "e.g. Strength",
        "detail": "e.g. Moderate-High Intensity (RPE 7-9)"
      }
    ],
    "sets_per_muscle_group_per_week": "e.g. 10-18",
    "rest_between_sets": "e.g. 60-120 Seconds",
    "summary": "Brief summary of the progressive overload model"
  },
  "weekly_calorie_burn": {
    "estimated_weekly_burn": "e.g. 2,000-3,000 Active Calories",
    "notes": "Supporting notes about fat loss, nutrition, and AI adjustments"
  },
  "example_weekly_flow": [
    {
      "day": "Monday",
      "focus": "Strength",
      "example_session": "Full-Body Resistance (Squat, Push, Pull, Core)"
    },
    {
      "day": "Tuesday",
      "focus": "Conditioning",
      "example_session": "HIIT Intervals + Core (20-30 Min)"
    },
    {
      "day": "Wednesday",
      "focus": "Active Recovery",
      "example_session": "Walk + Mobility Flow (20-30 Min)"
    },
    {
      "day": "Thursday",
      "focus": "Strength",
      "example_session": "Lower Body + Posterior Chain"
    },
    {
      "day": "Friday",
      "focus": "Conditioning",
      "example_session": "Zone 2 Cardio + Light Core"
    },
    {
      "day": "Saturday",
      "focus": "Strength",
      "example_session": "Upper Body + Carries"
    },
    {
      "day": "Sunday",
      "focus": "Recovery",
      "example_session": "Mobility, Breathwork, Optional Light Walk"
    }
  ]
}

Important guidelines:
- Consider all restrictions, injuries, and pain areas when recommending exercises
- Tailor the plan to the user's fitness goals and experience level
- Account for available equipment and time constraints
- Include recovery and lifestyle factors in the plan
- Be specific with exercise recommendations
- Ensure the plan is safe and achievable
- The example_weekly_flow MUST always include all 7 days (Monday through Sunday)
`;

const WORKOUT_GENERATION_PROMPT = `
You are an expert fitness coach. Generate detailed daily workout plans for a week based on the user's fitness plan.

You must respond ONLY with a valid JSON object (no markdown, no code blocks, no extra text). The JSON must have this exact structure:

{
  "workouts": [
    {
      "day": "Monday",
      "workout_title": "Creative workout name",
      "workout_description": "Brief 1-2 sentence overview",
      "workout_data": {
        "warm_up": {
          "duration_minutes": 5,
          "exercises": [
            {
              "name": "Exercise name",
              "duration_seconds": 30,
              "description": "Brief instruction"
            }
          ]
        },
        "main_workout": {
          "exercises": [
            {
              "name": "Exercise name",
              "sets": 3,
              "reps": "8-12",
              "rest_seconds": 60,
              "description": "Brief form instruction",
              "muscle_group": "Primary muscle targeted",
              "equipment": "Equipment needed or None"
            }
          ]
        },
        "cool_down": {
          "duration_minutes": 5,
          "exercises": [
            {
              "name": "Exercise name",
              "duration_seconds": 30,
              "description": "Brief instruction"
            }
          ]
        },
        "total_duration_minutes": 45,
        "estimated_calories_burned": "200-300"
      }
    }
  ]
}

Important guidelines:
- Generate workouts for ALL 7 days (Monday through Sunday)
- Match exercises to the user's fitness level and goals
- Respect all restrictions and injury areas — never include exercises that aggravate them
- Only use equipment the user has available
- Follow the weekly flow structure provided
- Recovery days should include light mobility, stretching, or walking
- Provide clear, concise form instructions
`;

// ============================================================
// CONTROLLERS
// ============================================================

/**
 * GET /options
 * Return all valid dropdown options for the fitness plan form
 */
exports.getOptions = async (req, res) => {
  try {
    const buildOptions = (values) => values.map(value => ({
      value,
      label: LABEL_MAP[value] || value
    }));

    return responseSuccess(res, 200, 'Fitness plan options fetched successfully', {
      restrictions: buildOptions(VALID_RESTRICTIONS),
      injuries_and_pain_areas: buildOptions(VALID_INJURIES),
      training_preferences: buildOptions(VALID_TRAINING_PREFERENCES),
      fitness_goals: buildOptions(VALID_FITNESS_GOALS),
      training_experience: buildOptions(VALID_TRAINING_EXPERIENCE),
      available_equipment: buildOptions(VALID_EQUIPMENT),
      time_availability: buildOptions(VALID_TIME_AVAILABILITY),
      recovery_and_lifestyle: buildOptions(VALID_RECOVERY_LIFESTYLE)
    });
  } catch (error) {
    return responseError(res, 500, 'Failed to fetch fitness plan options', error.message);
  }
};

/**
 * POST /generate
 * Generate a new fitness plan using AI and save to DB
 */
exports.createFitnessPlan = async (req, res) => {
  try {
    const {
      restrictions,
      injuries_and_pain_areas,
      training_preferences,
      fitness_goals,
      training_experience,
      available_equipment,
      time_availability,
      recovery_and_lifestyle
    } = req.body;

    // Validate required fields
    if (!restrictions || !Array.isArray(restrictions) || restrictions.length === 0) {
      return responseError(res, 400, 'Restrictions is required and must be a non-empty array');
    }
    if (!injuries_and_pain_areas || !Array.isArray(injuries_and_pain_areas) || injuries_and_pain_areas.length === 0) {
      return responseError(res, 400, 'Injuries and pain areas is required and must be a non-empty array');
    }
    if (!training_preferences || !Array.isArray(training_preferences) || training_preferences.length === 0) {
      return responseError(res, 400, 'Training preferences is required and must be a non-empty array');
    }
    if (!fitness_goals || !Array.isArray(fitness_goals) || fitness_goals.length === 0) {
      return responseError(res, 400, 'Fitness goals is required and must be a non-empty array');
    }
    if (!training_experience || !Array.isArray(training_experience) || training_experience.length === 0) {
      return responseError(res, 400, 'Training experience is required and must be a non-empty array');
    }
    if (!available_equipment || !Array.isArray(available_equipment) || available_equipment.length === 0) {
      return responseError(res, 400, 'Available equipment is required and must be a non-empty array');
    }
    if (!time_availability || !Array.isArray(time_availability) || time_availability.length === 0) {
      return responseError(res, 400, 'Time availability is required and must be a non-empty array');
    }
    if (!recovery_and_lifestyle || !Array.isArray(recovery_and_lifestyle) || recovery_and_lifestyle.length === 0) {
      return responseError(res, 400, 'Recovery and lifestyle is required and must be a non-empty array');
    }

    // Build user message for AI
    const userMessage = `
Please generate a personalized fitness plan based on the following information:

RESTRICTIONS: ${toLabels(restrictions).join(', ')}
INJURIES AND PAIN AREAS: ${toLabels(injuries_and_pain_areas).join(', ')}
TRAINING PREFERENCES: ${toLabels(training_preferences).join(', ')}
FITNESS GOALS: ${toLabels(fitness_goals).join(', ')}
TRAINING EXPERIENCE: ${toLabels(training_experience).join(', ')}
AVAILABLE EQUIPMENT: ${toLabels(available_equipment).join(', ')}
TIME AVAILABILITY: ${toLabels(time_availability).join(', ')}
RECOVERY & LIFESTYLE: ${toLabels(recovery_and_lifestyle).join(', ')}

Generate a complete fitness plan with overview (emphasizes + avoids), goal, weekly training targets, training intensity & volume plan, weekly calorie burn estimate, and an example weekly flow for all 7 days.
`;

    const aiResponse = await callOpenAI(FITNESS_PLAN_SYSTEM_PROMPT, userMessage);
    const fitnessPlanData = parseAIResponse(aiResponse);

    // Deactivate any existing active plan for this user
    await FitnessPlan.update(
      { status: 'completed' },
      { where: { user_id: req.user.id, status: 'active' } }
    );

    // Save to database
    const fitnessPlan = await FitnessPlan.create({
      user_id: req.user.id,
      status: 'draft',
      restrictions,
      injuries_and_pain_areas,
      training_preferences,
      fitness_goals,
      training_experience,
      available_equipment,
      time_availability,
      recovery_and_lifestyle,
      fitness_plan_overview: fitnessPlanData.fitness_plan_overview,
      goal: fitnessPlanData.goal,
      weekly_training_targets: fitnessPlanData.weekly_training_targets,
      training_intensity_volume: fitnessPlanData.training_intensity_volume,
      weekly_calorie_burn: fitnessPlanData.weekly_calorie_burn,
      example_weekly_flow: fitnessPlanData.example_weekly_flow
    });

    return responseSuccess(res, 201, 'Fitness plan generated successfully', {
      fitness_plan: parseJsonFields(fitnessPlan)
    });
  } catch (error) {
    console.error('Generate fitness plan error:', error);
    return responseError(res, 500, 'Failed to generate fitness plan', error.message);
  }
};

/**
 * POST /accept/:id
 * Accept a draft fitness plan and set it as active
 */
exports.acceptPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const fitnessPlan = await FitnessPlan.findByPk(id);

    if (!fitnessPlan) {
      return responseError(res, 404, 'Fitness plan not found');
    }
    if (fitnessPlan.user_id !== req.user.id) {
      return responseError(res, 403, 'You are not authorized to access this fitness plan');
    }
    if (fitnessPlan.status === 'active') {
      return responseError(res, 400, 'This fitness plan is already active');
    }

    // Deactivate any existing active plan
    await FitnessPlan.update(
      { status: 'completed' },
      { where: { user_id: req.user.id, status: 'active' } }
    );

    // Set this plan as active
    fitnessPlan.status = 'active';
    await fitnessPlan.save();

    return responseSuccess(res, 200, 'Fitness plan accepted and activated', {
      fitness_plan: parseJsonFields(fitnessPlan)
    });
  } catch (error) {
    return responseError(res, 500, 'Failed to accept fitness plan', error.message);
  }
};

/**
 * GET /current
 * Get the user's current active fitness plan
 */
exports.getCurrentPlan = async (req, res) => {
  try {
    const fitnessPlan = await FitnessPlan.findOne({
      where: { user_id: req.user.id, status: 'active' },
      include: [{
        model: FitnessPlanWorkout,
        as: 'workouts',
        order: [['day', 'ASC']]
      }]
    });

    if (!fitnessPlan) {
      return responseSuccess(res, 200, 'No active fitness plan found', { fitness_plan: null });
    }

    const result = parseJsonFields(fitnessPlan);
    if (result.workouts) {
      result.workouts = result.workouts.map(w => {
        const workout = w.toJSON ? w.toJSON() : { ...w };
        if (typeof workout.workout_data === 'string') {
          try { workout.workout_data = JSON.parse(workout.workout_data); } catch (e) { /* keep */ }
        }
        return workout;
      });
    }

    return responseSuccess(res, 200, 'Current fitness plan fetched successfully', {
      fitness_plan: result
    });
  } catch (error) {
    return responseError(res, 500, 'Failed to fetch current fitness plan', error.message);
  }
};

/**
 * GET /detail/:id
 * Get a specific fitness plan by ID
 */
exports.getPlanDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const fitnessPlan = await FitnessPlan.findByPk(id, {
      include: [{
        model: FitnessPlanWorkout,
        as: 'workouts',
        order: [['day', 'ASC']]
      }]
    });

    if (!fitnessPlan) {
      return responseError(res, 404, 'Fitness plan not found');
    }
    if (fitnessPlan.user_id !== req.user.id) {
      return responseError(res, 403, 'You are not authorized to view this fitness plan');
    }

    const result = parseJsonFields(fitnessPlan);
    if (result.workouts) {
      result.workouts = result.workouts.map(w => {
        const workout = w.toJSON ? w.toJSON() : { ...w };
        if (typeof workout.workout_data === 'string') {
          try { workout.workout_data = JSON.parse(workout.workout_data); } catch (e) { /* keep */ }
        }
        return workout;
      });
    }

    return responseSuccess(res, 200, 'Fitness plan fetched successfully', {
      fitness_plan: result
    });
  } catch (error) {
    return responseError(res, 500, 'Failed to fetch fitness plan', error.message);
  }
};

/**
 * GET /list
 * Get paginated list of all user's fitness plans
 */
exports.listPlans = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { status } = req.query;

    const where = { user_id: req.user.id };
    if (status && ['draft', 'active', 'completed'].includes(status)) {
      where.status = status;
    }

    const { count, rows } = await FitnessPlan.findAndCountAll({
      where,
      order: [['created_date', 'DESC']],
      limit,
      offset
    });

    const fitnessPlans = rows.map(plan => parseJsonFields(plan));
    const totalPages = Math.ceil(count / limit);

    return responseSuccess(res, 200, 'Fitness plans fetched successfully', {
      fitness_plans: fitnessPlans,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    return responseError(res, 500, 'Failed to fetch fitness plans', error.message);
  }
};

/**
 * PUT /update/:id
 * Update a fitness plan's user input fields (Edit Fitness Plan flow)
 */
exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      restrictions,
      injuries_and_pain_areas,
      training_preferences,
      fitness_goals,
      training_experience,
      available_equipment,
      time_availability,
      recovery_and_lifestyle
    } = req.body;

    const fitnessPlan = await FitnessPlan.findByPk(id);

    if (!fitnessPlan) {
      return responseError(res, 404, 'Fitness plan not found');
    }
    if (fitnessPlan.user_id !== req.user.id) {
      return responseError(res, 403, 'You are not authorized to update this fitness plan');
    }

    // Update only provided fields
    const updateData = {};
    if (restrictions && Array.isArray(restrictions)) updateData.restrictions = restrictions;
    if (injuries_and_pain_areas && Array.isArray(injuries_and_pain_areas)) updateData.injuries_and_pain_areas = injuries_and_pain_areas;
    if (training_preferences && Array.isArray(training_preferences)) updateData.training_preferences = training_preferences;
    if (fitness_goals && Array.isArray(fitness_goals)) updateData.fitness_goals = fitness_goals;
    if (training_experience && Array.isArray(training_experience)) updateData.training_experience = training_experience;
    if (available_equipment && Array.isArray(available_equipment)) updateData.available_equipment = available_equipment;
    if (time_availability && Array.isArray(time_availability)) updateData.time_availability = time_availability;
    if (recovery_and_lifestyle && Array.isArray(recovery_and_lifestyle)) updateData.recovery_and_lifestyle = recovery_and_lifestyle;

    if (Object.keys(updateData).length === 0) {
      return responseError(res, 400, 'No valid fields to update');
    }

    await fitnessPlan.update(updateData);
    await fitnessPlan.reload();

    return responseSuccess(res, 200, 'Fitness plan updated successfully', {
      fitness_plan: parseJsonFields(fitnessPlan)
    });
  } catch (error) {
    return responseError(res, 500, 'Failed to update fitness plan', error.message);
  }
};

/**
 * DELETE /delete/:id
 * Delete a fitness plan and its associated workouts
 */
exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const fitnessPlan = await FitnessPlan.findByPk(id);

    if (!fitnessPlan) {
      return responseError(res, 404, 'Fitness plan not found');
    }
    if (fitnessPlan.user_id !== req.user.id) {
      return responseError(res, 403, 'You are not authorized to delete this fitness plan');
    }

    // Workouts cascade-delete via FK constraint
    await fitnessPlan.destroy();

    return responseSuccess(res, 200, 'Fitness plan deleted successfully', { id: parseInt(id) });
  } catch (error) {
    return responseError(res, 500, 'Failed to delete fitness plan', error.message);
  }
};

/**
 * POST /regenerate/:id
 * "Make changes and recreate" — re-run AI with (optionally updated) user inputs
 */
exports.regeneratePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const fitnessPlan = await FitnessPlan.findByPk(id);

    if (!fitnessPlan) {
      return responseError(res, 404, 'Fitness plan not found');
    }
    if (fitnessPlan.user_id !== req.user.id) {
      return responseError(res, 403, 'You are not authorized to regenerate this fitness plan');
    }

    // Allow optional field overrides from body
    const restrictions = req.body.restrictions || fitnessPlan.restrictions;
    const injuries_and_pain_areas = req.body.injuries_and_pain_areas || fitnessPlan.injuries_and_pain_areas;
    const training_preferences = req.body.training_preferences || fitnessPlan.training_preferences;
    const fitness_goals = req.body.fitness_goals || fitnessPlan.fitness_goals;
    const training_experience = req.body.training_experience || fitnessPlan.training_experience;
    const available_equipment = req.body.available_equipment || fitnessPlan.available_equipment;
    const time_availability = req.body.time_availability || fitnessPlan.time_availability;
    const recovery_and_lifestyle = req.body.recovery_and_lifestyle || fitnessPlan.recovery_and_lifestyle;

    // Ensure arrays
    const ensureArray = (val) => typeof val === 'string' ? JSON.parse(val) : val;

    const userMessage = `
Please generate a personalized fitness plan based on the following information:

RESTRICTIONS: ${toLabels(ensureArray(restrictions)).join(', ')}
INJURIES AND PAIN AREAS: ${toLabels(ensureArray(injuries_and_pain_areas)).join(', ')}
TRAINING PREFERENCES: ${toLabels(ensureArray(training_preferences)).join(', ')}
FITNESS GOALS: ${toLabels(ensureArray(fitness_goals)).join(', ')}
TRAINING EXPERIENCE: ${toLabels(ensureArray(training_experience)).join(', ')}
AVAILABLE EQUIPMENT: ${toLabels(ensureArray(available_equipment)).join(', ')}
TIME AVAILABILITY: ${toLabels(ensureArray(time_availability)).join(', ')}
RECOVERY & LIFESTYLE: ${toLabels(ensureArray(recovery_and_lifestyle)).join(', ')}

Generate a complete fitness plan with overview (emphasizes + avoids), goal, weekly training targets, training intensity & volume plan, weekly calorie burn estimate, and an example weekly flow for all 7 days.
`;

    const aiResponse = await callOpenAI(FITNESS_PLAN_SYSTEM_PROMPT, userMessage);
    const fitnessPlanData = parseAIResponse(aiResponse);

    // Update the plan with new AI data and user inputs
    await fitnessPlan.update({
      restrictions: ensureArray(restrictions),
      injuries_and_pain_areas: ensureArray(injuries_and_pain_areas),
      training_preferences: ensureArray(training_preferences),
      fitness_goals: ensureArray(fitness_goals),
      training_experience: ensureArray(training_experience),
      available_equipment: ensureArray(available_equipment),
      time_availability: ensureArray(time_availability),
      recovery_and_lifestyle: ensureArray(recovery_and_lifestyle),
      fitness_plan_overview: fitnessPlanData.fitness_plan_overview,
      goal: fitnessPlanData.goal,
      weekly_training_targets: fitnessPlanData.weekly_training_targets,
      training_intensity_volume: fitnessPlanData.training_intensity_volume,
      weekly_calorie_burn: fitnessPlanData.weekly_calorie_burn,
      example_weekly_flow: fitnessPlanData.example_weekly_flow,
      status: 'draft'
    });

    // Remove old workouts since the plan changed
    await FitnessPlanWorkout.destroy({ where: { fitness_plan_id: id } });

    await fitnessPlan.reload();

    return responseSuccess(res, 200, 'Fitness plan regenerated successfully', {
      fitness_plan: parseJsonFields(fitnessPlan)
    });
  } catch (error) {
    console.error('Regenerate fitness plan error:', error);
    return responseError(res, 500, 'Failed to regenerate fitness plan', error.message);
  }
};

/**
 * POST /generate-workouts/:id
 * Generate detailed daily workouts for a fitness plan (7 days)
 */
exports.generateWeeklyWorkouts = async (req, res) => {
  try {
    const { id } = req.params;

    const fitnessPlan = await FitnessPlan.findByPk(id);

    if (!fitnessPlan) {
      return responseError(res, 404, 'Fitness plan not found');
    }
    if (fitnessPlan.user_id !== req.user.id) {
      return responseError(res, 403, 'You are not authorized to generate workouts for this fitness plan');
    }

    const ensureArray = (val) => typeof val === 'string' ? JSON.parse(val) : val;
    const ensureObj = (val) => typeof val === 'string' ? JSON.parse(val) : val;

    const weeklyFlow = ensureObj(fitnessPlan.example_weekly_flow);

    const userMessage = `
Generate detailed daily workouts for the following fitness plan:

USER PROFILE:
- Restrictions: ${toLabels(ensureArray(fitnessPlan.restrictions)).join(', ')}
- Injuries: ${toLabels(ensureArray(fitnessPlan.injuries_and_pain_areas)).join(', ')}
- Training Preferences: ${toLabels(ensureArray(fitnessPlan.training_preferences)).join(', ')}
- Fitness Goals: ${toLabels(ensureArray(fitnessPlan.fitness_goals)).join(', ')}
- Experience Level: ${toLabels(ensureArray(fitnessPlan.training_experience)).join(', ')}
- Equipment: ${toLabels(ensureArray(fitnessPlan.available_equipment)).join(', ')}
- Time: ${toLabels(ensureArray(fitnessPlan.time_availability)).join(', ')}
- Recovery: ${toLabels(ensureArray(fitnessPlan.recovery_and_lifestyle)).join(', ')}

WEEKLY FLOW TO FOLLOW:
${JSON.stringify(weeklyFlow, null, 2)}

Generate complete workouts for all 7 days matching the weekly flow above. Each workout should include warm-up, main workout, and cool-down.
`;

    const aiResponse = await callOpenAI(WORKOUT_GENERATION_PROMPT, userMessage);
    const workoutData = parseAIResponse(aiResponse);

    // Delete existing workouts for the current week
    const currentWeek = await FitnessPlanWorkout.max('week_number', {
      where: { fitness_plan_id: id }
    });
    const newWeekNumber = (currentWeek || 0) + 1;

    // Calculate dates for the new week (starting from next Monday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + (newWeekNumber === 1 ? (daysUntilMonday === 7 ? 0 : daysUntilMonday) : daysUntilMonday + ((newWeekNumber - 1) * 7)));

    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const workouts = [];
    for (const workout of (workoutData.workouts || [])) {
      const dayIndex = dayOrder.indexOf(workout.day);
      const workoutDate = new Date(nextMonday);
      if (dayIndex > 0) {
        workoutDate.setDate(nextMonday.getDate() + dayIndex);
      }

      const created = await FitnessPlanWorkout.create({
        fitness_plan_id: parseInt(id),
        user_id: req.user.id,
        day: workout.day,
        workout_title: workout.workout_title,
        workout_description: workout.workout_description,
        workout_data: workout.workout_data,
        week_number: newWeekNumber,
        is_favorite: false,
        date: workoutDate.toISOString().split('T')[0]
      });
      workouts.push(created);
    }

    const result = workouts.map(w => {
      const data = w.toJSON();
      if (typeof data.workout_data === 'string') {
        try { data.workout_data = JSON.parse(data.workout_data); } catch (e) { /* keep */ }
      }
      return data;
    });

    return responseSuccess(res, 201, 'Weekly workouts generated successfully', {
      week_number: newWeekNumber,
      workouts: result
    });
  } catch (error) {
    console.error('Generate weekly workouts error:', error);
    return responseError(res, 500, 'Failed to generate weekly workouts', error.message);
  }
};

/**
 * PATCH /favorite-workout/:id
 * Toggle favorite status on a workout
 */
exports.toggleWorkoutFavorite = async (req, res) => {
  try {
    const { id } = req.params;

    const workout = await FitnessPlanWorkout.findByPk(id);

    if (!workout) {
      return responseError(res, 404, 'Workout not found');
    }
    if (workout.user_id !== req.user.id) {
      return responseError(res, 403, 'You are not authorized to modify this workout');
    }

    workout.is_favorite = !workout.is_favorite;
    await workout.save();

    return responseSuccess(res, 200, `Workout ${workout.is_favorite ? 'added to' : 'removed from'} favorites`, {
      workout_id: workout.id,
      is_favorite: workout.is_favorite
    });
  } catch (error) {
    return responseError(res, 500, 'Failed to toggle workout favorite', error.message);
  }
};

/**
 * GET /calendar
 * Get workouts for the calendar view (by month/year)
 */
exports.getCalendarWorkouts = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return responseError(res, 400, 'Month and year query parameters are required');
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const workouts = await FitnessPlanWorkout.findAll({
      where: {
        user_id: req.user.id,
        date: {
          [Op.between]: [
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
          ]
        }
      },
      order: [['date', 'ASC']],
      include: [{
        model: FitnessPlan,
        as: 'fitnessPlan',
        attributes: ['id', 'status']
      }]
    });

    const result = workouts.map(w => {
      const data = w.toJSON();
      if (typeof data.workout_data === 'string') {
        try { data.workout_data = JSON.parse(data.workout_data); } catch (e) { /* keep */ }
      }
      return data;
    });

    // Group by date for easy calendar rendering
    const calendarData = {};
    for (const workout of result) {
      if (!calendarData[workout.date]) {
        calendarData[workout.date] = [];
      }
      calendarData[workout.date].push(workout);
    }

    return responseSuccess(res, 200, 'Calendar workouts fetched successfully', {
      month: parseInt(month),
      year: parseInt(year),
      calendar: calendarData
    });
  } catch (error) {
    return responseError(res, 500, 'Failed to fetch calendar workouts', error.message);
  }
};

/**
 * GET /workouts-by-day
 * Get workouts for a specific date
 */
exports.getWorkoutsByDay = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return responseError(res, 400, 'Date query parameter is required (YYYY-MM-DD)');
    }

    const workouts = await FitnessPlanWorkout.findAll({
      where: {
        user_id: req.user.id,
        date
      },
      order: [['created_date', 'ASC']],
      include: [{
        model: FitnessPlan,
        as: 'fitnessPlan',
        attributes: ['id', 'status']
      }]
    });

    const result = workouts.map(w => {
      const data = w.toJSON();
      if (typeof data.workout_data === 'string') {
        try { data.workout_data = JSON.parse(data.workout_data); } catch (e) { /* keep */ }
      }
      return data;
    });

    return responseSuccess(res, 200, 'Workouts fetched successfully', {
      date,
      workouts: result
    });
  } catch (error) {
    return responseError(res, 500, 'Failed to fetch workouts', error.message);
  }
};
