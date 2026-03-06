const { responseSuccess, responseError } = require('../../utils/response');
const axios = require('axios');
const fs = require('fs');
const StoredFood = require('../../models/storedFoods.model');
const { Op } = require('sequelize');
const { getFoodImageAnalysisPrompt, getFoodImageAccurateAnalysisPrompt } = require('./helpers/ai-prompts');
const NutritionalInfo = require('../../models/nutritionalInfo.model');
const FoodEntry = require('../../models/foodEntry.model');
const GroceryItem = require('../../models/groceriesItem.model');
const FoodIngredient = require('../../models/foodIngredient.model');
const path = require("path");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Retry function with exponential backoff for rate limit errors
const retryWithBackoff = async (fn, maxRetries = 3, initialDelay = 1000) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (error.response?.status === 429 && i < maxRetries - 1) {
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

const downloadAndSaveImage = async (imageUrl, fileName) => {
  try {
    if (!imageUrl) return null;

    const uploadsDir = path.join(__dirname, '../../public/uploads/food_images');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const uniqueName = `${Date.now()}-${fileName || 'food'}.png`;
    const filePath = path.join(uploadsDir, uniqueName);

    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'arraybuffer',
    });

    fs.writeFileSync(filePath, response.data);

    return uniqueName;
  } catch (error) {
    console.error('Error downloading image:', error.message);
    return null;
  }
};

exports.analyzeFoodImage = async (req, res) => {
  try {
    const imagePath = req.file?.path;
    if (!imagePath) {
      return responseError(res, 400, 'No image uploaded');
    }

    const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });
    const url = 'https://api.openai.com/v1/chat/completions';
    const { systemPrompt, userPrompt } = getFoodImageAnalysisPrompt();

    const payload = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY || OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    let nutritionData = response.data.choices[0].message.content;

    nutritionData = nutritionData
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    let parsedData;
    try {
      parsedData = JSON.parse(nutritionData);
    } catch (err) {
      return responseError(res, 500, 'Returned invalid JSON', nutritionData);
    }

    return responseSuccess(
      res,
      200,
      'Food image analyzed successfully',
      parsedData
    );
  } catch (error) {
    return responseError(
      res,
      500,
      'Error analyzing food image',
      error.response?.data || error.message
    );
  }
};

exports.analyzeAccurateFoodImage = async (req, res) => {
  try {
    const imagePath = req.file?.path;
    if (!imagePath) {
      return responseError(res, 400, 'No image uploaded');
    }

    if (!fs.existsSync(imagePath)) {
      return responseError(res, 400, 'Image file not found');
    }

    const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });
    const mimeType = req.file?.mimetype || getMimeType(imagePath);
    const url = 'https://api.openai.com/v1/chat/completions';
    const { systemPrompt, userPrompt } = getFoodImageAccurateAnalysisPrompt();

    const payload = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: 'high',
              },
            },
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
      max_tokens: 3000,
      temperature: 0.1,
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY || OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    let nutritionData = response.data.choices[0].message.content;

    nutritionData = nutritionData
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    let parsedData;
    try {
      parsedData = JSON.parse(nutritionData);
    } catch (err) {
      return responseError(res, 500, 'Returned invalid JSON', nutritionData);
    }

    return responseSuccess(
      res,
      200,
      'Food image analyzed successfully',
      parsedData
    );
  } catch (error) {
    return responseError(
      res,
      500,
      'Error analyzing food image',
      error.response?.data || error.message
    );
  }
};

const generateFoodImage = async (dishName, description) => {
  try {
    const imagePrompt = `Professional food photography of ${dishName}. ${description || ''}. Appetizing presentation on a clean plate, soft natural lighting, shallow depth of field, top-down or 45-degree angle view, restaurant quality plating.`;

    const imageResponse = await retryWithBackoff(() =>
      axios.post(
        "https://api.openai.com/v1/images/generations",
        {
          model: "dall-e-3",
          prompt: imagePrompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      ),
      3,
      2000
    );

    return imageResponse.data.data[0]?.url || null;
  } catch (error) {
    console.error("Error generating food image:", error.message);
    return null;
  }
};

exports.analyzeFoodFromText = async (req, res) => {
  try {
    const { food_name, amount, generate_image = true } = req.body;

    if (!food_name) {
      return responseError(res, 400, "food_name is required");
    }

    const systemPrompt =
      "You are an expert nutritionist and food analysis assistant. Return ONLY valid JSON — no markdown, no code fences, no explanations.";

    const userPrompt = `
Analyze the following food item from text:

Food: ${food_name}
Amount/Quantity: ${amount || "not provided"}

Generate nutritional breakdown as per EXACT format:

{
  "dish_name": "name of the dish",
  "description": "brief description of the food",
  "portion_size": "estimated serving size (e.g., 1 cup, 200g, 1 plate)",
  "total_weight_grams": 0,
  "water_content_ml": 0,
  "nutritional_info": {
    "calories": { "amount_g": 0, "daily_value_percent": 0 },
    "protein_g": { "amount_g": 0, "daily_value_percent": 0 },
    "total_fat": { "amount_g": 0, "daily_value_percent": 0 },
    "saturated_fat": { "amount_g": 0, "daily_value_percent": 0 },
    "trans_fat": { "amount_g": 0, "daily_value_percent": 0 },
    "polyunsaturated_fat": { "amount_g": 0 },
    "monounsaturated_fat": { "amount_g": 0 },
    "cholesterol": { "amount_mg": 0, "daily_value_percent": 0 },
    "sodium": { "amount_mg": 0, "daily_value_percent": 0 },
    "total_carbohydrates": { "amount_g": 0, "daily_value_percent": 0 },
    "dietary_fiber": { "amount_g": 0, "daily_value_percent": 0 },
    "sugars": { "amount_g": 0 },
    "added_sugars": { "amount_g": 0, "daily_value_percent": 0 },
    "vitamin_d": { "amount_mcg": 0, "daily_value_percent": 0 },
    "calcium": { "amount_mg": 0, "daily_value_percent": 0 },
    "iron": { "amount_mg": 0, "daily_value_percent": 0 },
    "potassium": { "amount_mg": 0, "daily_value_percent": 0 },
    "vitamin_a": { "amount_mcg": 0, "daily_value_percent": 0 },
    "vitamin_c": { "amount_mg": 0, "daily_value_percent": 0 },
    "vitamin_e": { "amount_mg": 0, "daily_value_percent": 0 },
    "vitamin_k": { "amount_mcg": 0, "daily_value_percent": 0 },
    "thiamin_b1": { "amount_mg": 0, "daily_value_percent": 0 },
    "riboflavin_b2": { "amount_mg": 0, "daily_value_percent": 0 },
    "niacin_b3": { "amount_mg": 0, "daily_value_percent": 0 },
    "vitamin_b6": { "amount_mg": 0, "daily_value_percent": 0 },
    "folate_b9": { "amount_mcg": 0, "daily_value_percent": 0 },
    "vitamin_b12": { "amount_mcg": 0, "daily_value_percent": 0 },
    "magnesium": { "amount_mg": 0, "daily_value_percent": 0 },
    "phosphorus": { "amount_mg": 0, "daily_value_percent": 0 },
    "zinc": { "amount_mg": 0, "daily_value_percent": 0 },
    "copper": { "amount_mg": 0, "daily_value_percent": 0 },
    "manganese": { "amount_mg": 0, "daily_value_percent": 0 },
    "selenium": { "amount_mcg": 0, "daily_value_percent": 0 }
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
}
`;

    const aiResponse = await retryWithBackoff(() =>
      axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4.1",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.2,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        }
      )
    );

    const raw = aiResponse.data.choices[0].message.content;

    let jsonOutput;
    try {
      jsonOutput = JSON.parse(raw);
    } catch (e) {
      return responseError(res, 500, "AI returned invalid JSON", raw);
    }

    if (generate_image) {
      const foodImageUrl = await generateFoodImage(
        jsonOutput.dish_name || food_name,
        jsonOutput.description
      );

      if (foodImageUrl) {
        const sanitizedName = (jsonOutput.dish_name || food_name)
          .replace(/[^a-zA-Z0-9]/g, '-')
          .toLowerCase();
        const savedImagePath = await downloadAndSaveImage(foodImageUrl, sanitizedName);
        jsonOutput.generated_image_url = foodImageUrl;
        jsonOutput.saved_image_path = savedImagePath;
      }
    }

    return responseSuccess(res, 200, "Food analysis completed", jsonOutput);
  } catch (error) {
    console.error(error);
    return responseError(res, 500, "Server error", error.message);
  }
};

exports.searchStoredFoods = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    if (!search || search.trim() === '') {
      return responseError(res, 400, 'Search query parameter is required');
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (isNaN(pageNum) || pageNum < 1) {
      return responseError(res, 400, 'Invalid page number. Must be >= 1');
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return responseError(
        res,
        400,
        'Invalid limit. Must be between 1 and 100'
      );
    }

    const offset = (pageNum - 1) * limitNum;

    const totalCount = await StoredFood.count({
      where: {
        dish_name: {
          [Op.like]: `%${search}%`,
        },
      },
    });

    const storedFoods = await StoredFood.findAll({
      where: {
        dish_name: {
          [Op.like]: `%${search}%`,
        },
      },
      order: [['created_date', 'DESC']],
      limit: limitNum,
      offset: offset,
    });

    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    if (!storedFoods || storedFoods.length === 0) {
      return responseSuccess(res, 200, 'No stored foods found', {
        pagination: {
          current_page: pageNum,
          total_pages: totalPages,
          total_items: totalCount,
          items_per_page: limitNum,
          items_on_current_page: 0,
          has_next_page: hasNextPage,
          has_prev_page: hasPrevPage,
          next_page: hasNextPage ? pageNum + 1 : null,
          prev_page: hasPrevPage ? pageNum - 1 : null,
        },
        items: [],
      });
    }

    const formattedResults = storedFoods.map((food) => {
      const parseIfString = (field) => {
        if (!field) return null;
        return typeof field === 'string' ? JSON.parse(field) : field;
      };

      return {
        id: food.id,
        dish_name: food.dish_name || '',
        food_image: food.food_image || null,
        description: food.description || '',
        water_content_ml: food.water_content_ml || null,
        nutritional_info: parseIfString(food.nutritional_info) || {},
        ingredients_detected: parseIfString(food.ingredients_detected) || [],
        grocery_items: parseIfString(food.grocery_items) || [],
        health_notes: food.health_notes || '',
        created_date: food.created_date,
        updated_date: food.updated_date,
      };
    });

    return responseSuccess(res, 200, 'Stored foods fetched successfully', {
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_items: totalCount,
        items_per_page: limitNum,
        items_on_current_page: formattedResults.length,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage,
        next_page: hasNextPage ? pageNum + 1 : null,
        prev_page: hasPrevPage ? pageNum - 1 : null,
      },
      items: formattedResults,
    });
  } catch (error) {
    return responseError(
      res,
      500,
      'Server error while searching stored foods',
      error.message
    );
  }
};

const isValidUrl = (string) => {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

exports.addFoodEntry = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return responseError(
        res,
        401,
        "Unauthorized: User ID not found in token"
      );
    }

    const { foods } = req.body;

    let uploadedImage = null;

    if (req.file) {
      uploadedImage = path.basename(req.file.path);
    } else if (req.files && req.files.length > 0) {
      uploadedImage = path.basename(req.files[0].path);
    }

    let foodEntries = [];

    if (Array.isArray(foods)) {
      foodEntries = await Promise.all(foods.map(async (f) => {
        let foodImage = f.food_image || uploadedImage || null;

        if (foodImage && isValidUrl(foodImage)) {
          const sanitizedName = (f.food_name || 'food')
            .replace(/[^a-zA-Z0-9]/g, '-')
            .toLowerCase();
          const savedPath = await downloadAndSaveImage(foodImage, sanitizedName);
          foodImage = savedPath || foodImage;
        }

        return {
          ...f,
          food_image: foodImage,
        };
      }));
    } else if (req.body.food_name) {
      let foodImage = req.body.food_image || uploadedImage || null;

      if (foodImage && isValidUrl(foodImage)) {
        const sanitizedName = (req.body.food_name || 'food')
          .replace(/[^a-zA-Z0-9]/g, '-')
          .toLowerCase();
        const savedPath = await downloadAndSaveImage(foodImage, sanitizedName);
        foodImage = savedPath || foodImage;
      }

      foodEntries = [
        {
          food_name: req.body.food_name,
          food_type: req.body.food_type,
          food_time: req.body.food_time,
          ai_details: req.body.ai_details,
          total_weight_grams: req.body.total_weight_grams,
          water_content_ml: req.body.water_content_ml,
          food_entry_source: req.body.food_entry_source,
          food_image: foodImage,
        },
      ];
    } else {
      return responseError(
        res,
        400,
        `Invalid request format. Provide either "foods" array or single food entry`
      );
    }

    if (foodEntries.length === 0) {
      return responseError(res, 400, "No food entries provided");
    }

    const validFoodTypes = ["breakfast", "lunch", "dinner", "snack"];
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;

    for (let i = 0; i < foodEntries.length; i++) {
      const food = foodEntries[i];

      if (!food.food_name || !food.food_type || !food.food_time) {
        return responseError(
          res,
          400,
          `Missing required fields in entry ${i + 1}`
        );
      }

      if (!validFoodTypes.includes(food.food_type)) {
        return responseError(
          res,
          400,
          `Invalid food_type in entry ${i + 1}.`
        );
      }

      if (!timeRegex.test(food.food_time)) {
        return responseError(
          res,
          400,
          `Invalid time format in entry ${i + 1}`
        );
      }

      if (food.food_entry_source) {
        const sourceMap = {
          'manual': 'manual',
          'imageupload': 'imageUpload',
          'ai': 'AI',
          'image_upload': 'imageUpload',
          'image-upload': 'imageUpload',
          'imageuploadaccurate': 'imageUploadAccurate',
          'image_upload_accurate': 'imageUploadAccurate',
          'image-upload-accurate': 'imageUploadAccurate'
        };
        const normalizedSource = sourceMap[food.food_entry_source.toString().toLowerCase().trim()];
        if (!normalizedSource) {
          return responseError(
            res,
            400,
            `Invalid food_entry_source in entry ${i + 1}. Received: "${food.food_entry_source}". Must be one of: manual, imageUpload, AI, imageUploadAccurate`
          );
        }
        food.food_entry_source = normalizedSource;
      }
    }

    const results = [];
    let totalNutrition = 0;
    let totalGrocery = 0;

    for (const foodData of foodEntries) {
      try {
        const entry = await FoodEntry.create({
          user_id: userId,
          food_name: foodData.food_name,
          food_type: foodData.food_type,
          food_time: foodData.food_time,
          total_weight_grams: foodData.total_weight_grams || null,
          water_content_ml: foodData.water_content_ml || null,
          date: foodData.date || new Date().toISOString().split("T")[0],
          food_entry_source: foodData.food_entry_source || null,
          food_image: foodData.food_image || null,
        });

        let nutritionCount = 0;
        let groceryCount = 0;
        let ingredientCount = 0;
        let savedNutritionRecords = [];
        let savedGroceryItems = [];
        let savedIngredients = [];

        if (foodData.ai_details) {
          try {
            const parsed =
              typeof foodData.ai_details === "string"
                ? JSON.parse(foodData.ai_details)
                : foodData.ai_details;

            const { nutritional_info, grocery_items, ingredients_detected } = parsed.data || parsed;

            if (nutritional_info) {
              const nutritionRecords = Object.entries(nutritional_info)
                .filter(([key, val]) => val)
                .map(([key, val]) => ({
                  user_id: userId,
                  food_entry_id: entry.id,
                  nutrient_name: key,
                  amount: parseFloat(
                    val.amount_g ||
                    val.amount_mg ||
                    val.amount_mcg ||
                    val.amount ||
                    0
                  ),
                  unit: val.amount_g
                    ? "g"
                    : val.amount_mg
                      ? "mg"
                      : val.amount_mcg
                        ? "mcg"
                        : "",
                  daily_value_percent: parseFloat(
                    val.daily_value_percent || 0
                  ),
                  date: entry.date,
                }));

              if (nutritionRecords.length > 0) {
                const createdNutrition =
                  await NutritionalInfo.bulkCreate(nutritionRecords);
                nutritionCount = createdNutrition.length;
                savedNutritionRecords = createdNutrition;
              }
            }

            if (grocery_items && grocery_items.length > 0) {
              const groceries = grocery_items.map((g) => ({
                user_id: userId,
                food_entry_id: entry.id,
                name: g.name,
                approx_quantity_to_buy: g.approx_quantity_to_buy || "",
                category: g.category || "",
                date: entry.date,
              }));

              const createdGroceries = await GroceryItem.bulkCreate(groceries);
              groceryCount = createdGroceries.length;
              savedGroceryItems = createdGroceries;
            }

            if (ingredients_detected && ingredients_detected.length > 0) {
              const ingredients = ingredients_detected.map((ing) => ({
                user_id: userId,
                food_entry_id: entry.id,
                name: ing.name,
                calories: parseFloat(ing.calories || 0),
                protein_g: parseFloat(ing.protein_g || 0),
                carbohydrates_g: parseFloat(ing.carbohydrates_g || 0),
                fat_g: parseFloat(ing.fat_g || 0),
                quantity: ing.quantity || "",
                date: entry.date,
              }));

              const createdIngredients = await FoodIngredient.bulkCreate(ingredients);
              ingredientCount = createdIngredients.length;
              savedIngredients = createdIngredients;
            }
          } catch (err) {
            console.error("Error parsing AI details:", err);
          }
        }

        totalNutrition += nutritionCount;
        totalGrocery += groceryCount;

        results.push({
          id: entry.id,
          food_name: entry.food_name,
          food_type: entry.food_type,
          food_time: entry.food_time,
          total_weight_grams: entry.total_weight_grams,
          water_content_ml: entry.water_content_ml,
          date: entry.date,
          food_entry_source: entry.food_entry_source,
          food_image: entry.food_image || null,
          created_date: entry.created_date,
          nutrition_count: nutritionCount,
          grocery_count: groceryCount,
          ingredient_count: ingredientCount,
          nutritional_info: savedNutritionRecords,
          grocery_items: savedGroceryItems,
          ingredients_detected: savedIngredients,
        });
      } catch (err) {
        results.push({
          food_name: foodData.food_name,
          error: err.message,
          success: false,
        });
      }
    }

    return responseSuccess(res, 201, "Food entries processed", {
      total_entries: results.length,
      entries: results,
    });
  } catch (error) {
    console.error(error);
    return responseError(res, 500, "Server error", error.message);
  }
};
