const calculateDailyTotals = (foodEntries) => {
  const totals = {};
  let totalWeight = 0;
  let totalWater = 0;

  foodEntries.forEach((entry) => {
    totalWeight += entry.total_weight_grams || 0;
    totalWater += entry.water_content_ml || 0;

    if (entry.nutritionalInfo && entry.nutritionalInfo.length > 0) {
      entry.nutritionalInfo.forEach((nutrient) => {
        if (!totals[nutrient.nutrient_name]) {
          totals[nutrient.nutrient_name] = {
            amount: 0,
            unit: nutrient.unit,
            daily_value_percent: 0,
          };
        }
        totals[nutrient.nutrient_name].amount += nutrient.amount || 0;
        totals[nutrient.nutrient_name].daily_value_percent +=
          nutrient.daily_value_percent || 0;
      });
    }
  });

  return {
    total_weight_grams: totalWeight,
    total_water_ml: totalWater,
    nutrients: totals,
  };
};

const groupEntriesByDate = (foodEntries) => {
  const grouped = {};

  foodEntries.forEach((entry) => {
    const date = new Date(entry.created_date).toISOString().split('T')[0];

    if (!grouped[date]) {
      grouped[date] = {
        date: date,
        entries_count: 0,
        grand_total_calories: 0,
        calories_by_type: {
          breakfast: { total_calories: 0, count: 0 },
          lunch: { total_calories: 0, count: 0 },
          dinner: { total_calories: 0, count: 0 },
          snack: { total_calories: 0, count: 0 },
        },
        entries: [],
        meal_totals: {
          breakfast: { count: 0, total_calories: 0 },
          lunch: { count: 0, total_calories: 0 },
          dinner: { count: 0, total_calories: 0 },
          snack: { count: 0, total_calories: 0 },
        },
        daily_totals: {
          total_weight_grams: 0,
          total_water_ml: 0,
          nutrients: {},
        },
      };
    }

    // Calculate calories for this entry
    let entryCalories = 0;
    if (entry.nutritionalInfo && entry.nutritionalInfo.length > 0) {
      entry.nutritionalInfo.forEach((nutrient) => {
        const nutrientNameLower = nutrient.nutrient_name.toLowerCase();
        if (nutrientNameLower.includes('calorie')) {
          entryCalories += parseFloat(nutrient.amount || 0);
        }
      });
    }

    // Add to food type totals
    const foodType = entry.food_type;
    if (grouped[date].calories_by_type[foodType]) {
      grouped[date].calories_by_type[foodType].total_calories += entryCalories;
      grouped[date].calories_by_type[foodType].count += 1;
    }

    grouped[date].grand_total_calories += entryCalories;
    grouped[date].entries_count++;

    grouped[date].entries.push({
      id: entry.id,
      food_name: entry.food_name,
      food_type: entry.food_type,
      food_time: entry.food_time,
      quantity: entry.total_weight_grams || 0,
      water_content_ml: entry.water_content_ml,
      food_image: entry.food_image,
      calories: entryCalories,
    });

    const mealType = entry.food_type;
    if (grouped[date].meal_totals[mealType]) {
      grouped[date].meal_totals[mealType].count++;
      grouped[date].meal_totals[mealType].total_calories += entryCalories;
    }

    grouped[date].daily_totals.total_weight_grams +=
      entry.total_weight_grams || 0;
    grouped[date].daily_totals.total_water_ml += entry.water_content_ml || 0;

    if (entry.nutritionalInfo && entry.nutritionalInfo.length > 0) {
      entry.nutritionalInfo.forEach((nutrient) => {
        if (!grouped[date].daily_totals.nutrients[nutrient.nutrient_name]) {
          grouped[date].daily_totals.nutrients[nutrient.nutrient_name] = {
            amount: 0,
            unit: nutrient.unit,
            daily_value_percent: 0,
          };
        }
        grouped[date].daily_totals.nutrients[nutrient.nutrient_name].amount +=
          nutrient.amount || 0;
        grouped[date].daily_totals.nutrients[
          nutrient.nutrient_name
        ].daily_value_percent += nutrient.daily_value_percent || 0;
      });
    }
  });

  // Round calorie values
  Object.keys(grouped).forEach((date) => {
    grouped[date].grand_total_calories = parseFloat(
      grouped[date].grand_total_calories.toFixed(2)
    );
    Object.keys(grouped[date].calories_by_type).forEach((type) => {
      grouped[date].calories_by_type[type].total_calories = parseFloat(
        grouped[date].calories_by_type[type].total_calories.toFixed(2)
      );
    });
  });

  return Object.values(grouped).sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
};

const calculateAverageNutrition = (foodEntries, totalDays) => {
  const totals = {};
  let totalWeight = 0;
  let totalWater = 0;

  foodEntries.forEach((entry) => {
    totalWeight += entry.total_weight_grams || 0;
    totalWater += entry.water_content_ml || 0;

    if (entry.nutritionalInfo && entry.nutritionalInfo.length > 0) {
      entry.nutritionalInfo.forEach((nutrient) => {
        if (!totals[nutrient.nutrient_name]) {
          totals[nutrient.nutrient_name] = {
            total_amount: 0,
            unit: nutrient.unit,
            total_daily_value_percent: 0,
          };
        }
        totals[nutrient.nutrient_name].total_amount += nutrient.amount || 0;
        totals[nutrient.nutrient_name].total_daily_value_percent +=
          nutrient.daily_value_percent || 0;
      });
    }
  });

  const averages = {};
  Object.keys(totals).forEach((nutrientName) => {
    averages[nutrientName] = {
      average_amount: (totals[nutrientName].total_amount / totalDays).toFixed(
        2
      ),
      unit: totals[nutrientName].unit,
      average_daily_value_percent: (
        totals[nutrientName].total_daily_value_percent / totalDays
      ).toFixed(2),
    };
  });

  return {
    average_weight_grams: (totalWeight / totalDays).toFixed(2),
    average_water_ml: (totalWater / totalDays).toFixed(2),
    nutrients: averages,
  };
};

const getTargetNutrients = () => {
  return {
    calories: ['calories', 'energy'],
    protein_g: ['protein', 'protein_g'],
    total_fat: ['total_fat', 'fat', 'total fat'],
    saturated_fat: ['saturated_fat', 'saturated fat'],
    trans_fat: ['trans_fat', 'trans fat'],
    polyunsaturated_fat: ['polyunsaturated_fat', 'polyunsaturated fat'],
    monounsaturated_fat: ['monounsaturated_fat', 'monounsaturated fat'],
    cholesterol: ['cholesterol'],
    sodium: ['sodium'],
    total_carbohydrates: [
      'carbohydrate',
      'carbs',
      'total_carbohydrates',
      'total carbohydrates',
    ],
    dietary_fiber: ['fiber', 'dietary_fiber', 'dietary fiber'],
    sugars: ['sugar', 'sugars', 'total_sugars'],
    added_sugars: ['added_sugars', 'added sugars'],
    vitamin_d: ['vitamin_d', 'vitamin d'],
    calcium: ['calcium'],
    iron: ['iron'],
    potassium: ['potassium'],
    vitamin_a: ['vitamin_a', 'vitamin a'],
    vitamin_c: ['vitamin_c', 'vitamin c'],
    vitamin_e: ['vitamin_e', 'vitamin e'],
    vitamin_k: ['vitamin_k', 'vitamin k'],
    thiamin_b1: ['thiamin', 'thiamin_b1', 'vitamin_b1', 'vitamin b1'],
    riboflavin_b2: ['riboflavin', 'riboflavin_b2', 'vitamin_b2', 'vitamin b2'],
    niacin_b3: ['niacin', 'niacin_b3', 'vitamin_b3', 'vitamin b3'],
    vitamin_b6: ['vitamin_b6', 'vitamin b6'],
    folate_b9: ['folate', 'folate_b9', 'vitamin_b9', 'vitamin b9'],
    vitamin_b12: ['vitamin_b12', 'vitamin b12'],
    magnesium: ['magnesium'],
    phosphorus: ['phosphorus'],
    zinc: ['zinc'],
    copper: ['copper'],
    manganese: ['manganese'],
    selenium: ['selenium'],
  };
};

const stringToArray = (str) => {
  if (!str || str.trim() === '') return [];
  return str
    .split(';')
    .map((item) => item.trim())
    .filter((item) => item !== '');
};

module.exports = {
  calculateDailyTotals,
  groupEntriesByDate,
  calculateAverageNutrition,
  getTargetNutrients,
  stringToArray,
};
