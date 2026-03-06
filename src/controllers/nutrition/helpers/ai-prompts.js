exports.getFoodImageAnalysisPrompt = () => {
  const systemPrompt = 'You are an expert nutritionist and food analysis assistant. Return ONLY valid JSON — no markdown, no code fences, no explanations.';

  const userPrompt = `Analyze this food image and provide a comprehensive nutritional breakdown.
Return ONLY valid JSON with no additional text, using this exact structure:

{
  "dish_name": "name of the dish",
  "description": "brief description of the food",
  "portion_size": "estimated serving size (e.g., 1 cup, 200g, 1 plate)",
  "total_weight_grams": 0,
  "water_content_ml": 0,
  "nutritional_info": {
    "calories": {
      "amount_g": 0,
      "daily_value_percent": 0
    },
    "protein_g": {
      "amount_g": 0,
      "daily_value_percent": 0
    },
    "total_fat": {
      "amount_g": 0,
      "daily_value_percent": 0
    },
    "saturated_fat": {
      "amount_g": 0,
      "daily_value_percent": 0
    },
    "trans_fat": {
      "amount_g": 0,
      "daily_value_percent": 0
    },
    "polyunsaturated_fat": {
      "amount_g": 0
    },
    "monounsaturated_fat": {
      "amount_g": 0
    },
    "cholesterol": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "sodium": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "total_carbohydrates": {
      "amount_g": 0,
      "daily_value_percent": 0
    },
    "dietary_fiber": {
      "amount_g": 0,
      "daily_value_percent": 0
    },
    "sugars": {
      "amount_g": 0
    },
    "added_sugars": {
      "amount_g": 0,
      "daily_value_percent": 0
    },
    "vitamin_d": {
      "amount_mcg": 0,
      "daily_value_percent": 0
    },
    "calcium": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "iron": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "potassium": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "vitamin_a": {
      "amount_mcg": 0,
      "daily_value_percent": 0
    },
    "vitamin_c": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "vitamin_e": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "vitamin_k": {
      "amount_mcg": 0,
      "daily_value_percent": 0
    },
    "thiamin_b1": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "riboflavin_b2": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "niacin_b3": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "vitamin_b6": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "folate_b9": {
      "amount_mcg": 0,
      "daily_value_percent": 0
    },
    "vitamin_b12": {
      "amount_mcg": 0,
      "daily_value_percent": 0
    },
    "magnesium": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "phosphorus": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "zinc": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "copper": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "manganese": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "selenium": {
      "amount_mcg": 0,
      "daily_value_percent": 0
    }
  },
  "ingredients_detected": [{
    "name": "ingredient name",
    "calories": 0,
    "protein_g": 0,
    "carbohydrates_g": 0,
    "fat_g": 0,
    "quantity": "estimated quantity (e.g. 50g, 1 tbsp)"
  }],
  "grocery_items": [
    {
      "name": "grocery item name",
      "approx_quantity_to_buy": "e.g., 500g pack or 1 unit",
      "category": "e.g., dairy, produce, grains, protein"
    }
  ],
  "health_notes": "any relevant health information or allergen warnings"
}`;

  return { systemPrompt, userPrompt };
};

exports.getFoodImageAccurateAnalysisPrompt = () => {
  const systemPrompt = `You are an expert nutritionist and certified dietitian with 20+ years of experience in food portion estimation and nutritional analysis. You have been trained on thousands of food images and USDA nutritional databases. Return ONLY valid JSON — no markdown, no code fences, no explanations.`;

  const userPrompt = `Analyze this food image carefully and provide an accurate nutritional breakdown.

ESTIMATION GUIDELINES (follow strictly):
1. PORTION SIZE: Look for visual cues like plate size (standard dinner plate = 25-27cm), utensils, hands, or common objects for scale
2. FOOD IDENTIFICATION: Identify each visible ingredient separately before calculating totals
3. COOKING METHOD: Consider if food is fried, grilled, steamed, etc. as this affects calories significantly
4. HIDDEN INGREDIENTS: Account for oils, sauces, dressings that may not be fully visible
5. ACCURACY: Use USDA food database values as reference. Be conservative with estimates - it's better to slightly underestimate than overestimate
6. WEIGHT: A standard dinner plate of food is typically 300-500g. A bowl of rice/pasta is typically 150-250g cooked

Return ONLY valid JSON with no additional text, using this exact structure:

{
  "dish_name": "name of the dish",
  "description": "brief description of the food",
  "portion_size": "estimated serving size (e.g., 1 cup, 200g, 1 plate)",
  "total_weight_grams": 0,
  "water_content_ml": 0,
  "nutritional_info": {
    "calories": {
      "amount_g": 0,
      "daily_value_percent": 0
    },
    "protein_g": {
      "amount_g": 0,
      "daily_value_percent": 0
    },
    "total_fat": {
      "amount_g": 0,
      "daily_value_percent": 0
    },
    "saturated_fat": {
      "amount_g": 0,
      "daily_value_percent": 0
    },
    "trans_fat": {
      "amount_g": 0,
      "daily_value_percent": 0
    },
    "polyunsaturated_fat": {
      "amount_g": 0
    },
    "monounsaturated_fat": {
      "amount_g": 0
    },
    "cholesterol": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "sodium": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "total_carbohydrates": {
      "amount_g": 0,
      "daily_value_percent": 0
    },
    "dietary_fiber": {
      "amount_g": 0,
      "daily_value_percent": 0
    },
    "sugars": {
      "amount_g": 0
    },
    "added_sugars": {
      "amount_g": 0,
      "daily_value_percent": 0
    },
    "vitamin_d": {
      "amount_mcg": 0,
      "daily_value_percent": 0
    },
    "calcium": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "iron": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "potassium": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "vitamin_a": {
      "amount_mcg": 0,
      "daily_value_percent": 0
    },
    "vitamin_c": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "vitamin_e": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "vitamin_k": {
      "amount_mcg": 0,
      "daily_value_percent": 0
    },
    "thiamin_b1": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "riboflavin_b2": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "niacin_b3": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "vitamin_b6": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "folate_b9": {
      "amount_mcg": 0,
      "daily_value_percent": 0
    },
    "vitamin_b12": {
      "amount_mcg": 0,
      "daily_value_percent": 0
    },
    "magnesium": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "phosphorus": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "zinc": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "copper": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "manganese": {
      "amount_mg": 0,
      "daily_value_percent": 0
    },
    "selenium": {
      "amount_mcg": 0,
      "daily_value_percent": 0
    }
  },
  "ingredients_detected": [{
    "name": "ingredient name",
    "calories": 0,
    "protein_g": 0,
    "carbohydrates_g": 0,
    "fat_g": 0,
    "quantity": "estimated quantity (e.g. 50g, 1 tbsp)"
  }],
  "grocery_items": [
    {
      "name": "grocery item name",
      "approx_quantity_to_buy": "e.g., 500g pack or 1 unit",
      "category": "e.g., dairy, produce, grains, protein"
    }
  ],
  "health_notes": "any relevant health information or allergen warnings",
  "confidence": {
    "food_identification": "high/medium/low - how confident you are in identifying the food",
    "portion_estimation": "high/medium/low - how confident you are in the portion size",
    "nutrition_accuracy": "high/medium/low - overall confidence in nutritional values",
    "notes": "any factors affecting accuracy (e.g., image quality, obscured food, unusual presentation)"
  }
}`;

  return { systemPrompt, userPrompt };
};

exports.getMealPlanGenerationPrompt = (mealPlanner) => {
  return `
You are a certified nutritionist and fitness coach creating a HIGHLY PERSONALIZED meal and fitness plan.

CRITICAL: Analyze the user's specific preferences below and create a UNIQUE plan tailored to their exact needs. DO NOT use generic templates.

User Profile:
- Food Restrictions: ${mealPlanner.food_restrictions || 'None'}
- Food Allergies: ${mealPlanner.food_allergies || 'None'}
- Food Preferences: ${mealPlanner.food_preferences || 'None'}
- Nutrition/Fitness Goals: ${mealPlanner.nutrition_goals || 'General Health'}

Instructions:
1. Analyze their SPECIFIC goals and restrictions carefully
2. Calculate personalized calorie and macro targets based on their goals
3. Design a fitness plan that matches their fitness goals (weight loss = more cardio, muscle gain = more strength training, etc.)
4. Create meal examples that align with their dietary preferences and avoid their allergens/restrictions
5. Adjust meal timing based on their lifestyle and fitness schedule
6. Make the plan realistic and actionable for THIS specific user

Return ONLY valid JSON (no markdown, no code fences):

{
  "goalSection": {
    "title": "Goal",
    "description": "Write a personalized 2-3 sentence paragraph that specifically addresses this user's goals: ${mealPlanner.nutrition_goals || 'General Health'}. Mention their dietary approach if relevant."
  },
  "dailyCalories": {
    "title": "Daily Total Calories",
    "target": "Calculate appropriate calorie range based on their goal (e.g., 1600-1800 for weight loss, 2200-2500 for muscle gain, 1900-2100 for maintenance)",
    "breakdown": {
      "protein": "Adjust % and grams based on goal (higher for muscle gain, moderate for others)",
      "fats": "Appropriate % and grams for their dietary preference",
      "carbs": "Adjust based on preferences (lower for keto/low-carb, higher for athletic performance)"
    },
    "note": "Explain specifically how THIS calorie/macro split helps achieve THEIR stated goal"
  },
  "fitnessSection": {
    "title": "Daily Calorie Expenditure & Fitness Plan",
    "recommended": "Calculate recommended daily calorie burn based on their fitness goals and create a specific weekly workout structure",
    "weeklyFitnessPlan": [
      "Design 5-7 workout days specific to their goal. For weight loss: more cardio/HIIT. For muscle gain: more strength training with specific muscle groups. For general health: balanced mix. Include duration and intensity."
    ]
  },
  "mealPlanOverview": {
    "title": "Meal Plan Overview",
    "emphasizes": [
      "List 5-7 specific food categories and examples that match their preferences (vegetarian/vegan = plant proteins, keto = high-fat foods, etc.)",
      "Consider their restrictions: ${mealPlanner.food_restrictions || 'None'}",
      "Align with their dietary preference: ${mealPlanner.food_preferences || 'balanced diet'}",
      "Use ✅ emoji for each item"
    ],
    "avoids": [
      "List 3-5 specific foods they should avoid based on:",
      "1. Their allergies: ${mealPlanner.food_allergies || 'None'}",
      "2. Their restrictions: ${mealPlanner.food_restrictions || 'None'}",
      "3. Foods that conflict with their goals",
      "Use ❌ emoji for each item"
    ]
  },
  "dailyFlow": {
    "title": "Example of Daily Flow",
    "schedule": [
      {
        "time": "7:00 AM",
        "meal": "Breakfast",
        "example": "Specific meal name that matches their profile",
        "description": "A brief 1-2 sentence description of this meal",
        "servings": 1,
        "prep_time_minutes": 10,
        "cook_time_minutes": 15,
        "total_time_minutes": 25,
        "ingredients": [
          { "name": "ingredient name", "quantity": "amount with unit (e.g., 2 cups, 500g)" }
        ],
        "cooking_steps_instructions": [
          { "step": 1, "description": "Detailed step-by-step cooking instruction" }
        ],
        "nutrition_facts": {
          "calories": 0,
          "protein_g": 0,
          "carbohydrates_g": 0,
          "fat_g": 0,
          "fiber_g": 0,
          "sugar_g": 0,
          "sodium_mg": 0
        },
        "groceries": [
          { "item": "Ingredient name", "quantity": "Approx quantity" }
        ]
      }
    ]
  }

Instructions for dailyFlow.schedule:
- Create 4-6 meal/snack times with SPECIFIC meal examples
- Match their dietary preferences (vegan meals for vegans, high-protein for muscle gain, etc.)
- AVOID their allergens (${mealPlanner.food_allergies || 'None'})
- Respect their restrictions (${mealPlanner.food_restrictions || 'None'})
- Are realistic and easy to prepare
- Include a brief description for each meal
- List all ingredients with quantities
- Provide step-by-step cooking instructions
- Include accurate nutrition facts per serving
- 'groceries' must include all ingredients required to prepare the meal with quantities
}

IMPORTANT: Make this plan truly unique to this user. Two users with different goals/preferences should get completely different plans.
`;
};

exports.getRecipeGenerationPrompt = (options) => {
  const { dish_name, servings, dietary_preferences, cooking_time } = options;

  const servingsText = servings ? `for ${servings} servings` : 'for 2-4 servings';
  const dietaryText = dietary_preferences ? `Dietary preferences: ${dietary_preferences}.` : '';
  const timeText = cooking_time ? `Target cooking time: ${cooking_time} minutes.` : '';

  return `
You are a professional chef and recipe creator. Create a detailed, easy-to-follow recipe for "${dish_name}" ${servingsText}.

${dietaryText}
${timeText}

Return ONLY valid JSON (no markdown, no code fences, no explanations):

{
  "dish_name": "${dish_name}",
  "description": "A brief 1-2 sentence description of this dish - what it is, its origin, and what makes it special",
  "servings": ${servings || 4},
  "prep_time_minutes": 0,
  "cook_time_minutes": 0,
  "total_time_minutes": 0,
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": "amount with unit (e.g., 2 cups, 500g, 1 tbsp)"
    }
  ],
  "instructions": [
    {
      "step": 1,
      "description": "Detailed step-by-step cooking instruction"
    }
  ],
  "nutrition_facts": {
    "calories": 0,
    "protein_g": 0,
    "carbohydrates_g": 0,
    "fat_g": 0,
    "fiber_g": 0,
    "sugar_g": 0,
    "sodium_mg": 0
  }
}

IMPORTANT:
- Add a simple, informative description about the dish
- Make ingredients precise and measurements accurate
- Write clear, beginner-friendly step-by-step instructions
- Include all necessary ingredients
- Number instructions sequentially
- Make instructions detailed and easy to follow
- Provide accurate nutritional estimates per serving
- Include realistic prep and cook times
`;
};
