/**
 * AI Controller
 * Handles image content analysis (generating captions/hashtags) and text-to-hashtag generation
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const MOCK_CATEGORIES = {
  travel: {
    captions: [
      "Exploring new horizons and chasing sunsets. 🌍✨ #wanderlust",
      "Wanderlust state of mind. Where to next? ✈️🗺️",
      "Collecting moments, not things, on this beautiful journey. 📸🌴"
    ],
    hashtags: ["travel", "wanderlust", "explore", "adventure", "vacation"]
  },
  food: {
    captions: [
      "Good food is the foundation of genuine happiness. 🍕🤤 #yummy",
      "Feasting with my eyes first. Absolutely delicious! 🍽️✨",
      "Homemade goodness made with love and extra spice. 🧁🍓"
    ],
    hashtags: ["foodie", "instafood", "delicious", "yummy", "cooking"]
  },
  tech: {
    captions: [
      "Coding late nights and drinking caffeinated mornings. 💻☕ #programmer",
      "Building the future, one line of code at a time. 🚀⚡",
      "Bugs: fixed. Coffee: empty. Ready for the next build! 🧑‍💻⚙️"
    ],
    hashtags: ["programming", "developer", "coding", "tech", "software"]
  },
  nature: {
    captions: [
      "Nature never goes out of style. Breathing in the fresh air. 🌲💚 #earth",
      "Chasing golden hours and quiet forest walks. 🌅🍂",
      "Let the outdoor adventure begin. Finding peace in nature. 🗻🎒"
    ],
    hashtags: ["nature", "outdoors", "scenery", "hiking", "earth"]
  },
  pets: {
    captions: [
      "Paws and reflect: Life is better with a furry best friend. 🐾🐶",
      "Unconditional love wrapped in fur and wet noses. ❤️🐱",
      "Just a pet parent living in their animal's world. 🐕✨"
    ],
    hashtags: ["pets", "animals", "cute", "dogsofinstagram", "catlife"]
  },
  general: {
    captions: [
      "Just another day of creating aesthetic memories. ✨📸 #lifestyle",
      "Living life in full color and focusing on the good. 🌈💛",
      "Chasing dreams and staying grounded. Positive vibes only! 🚀🌟"
    ],
    hashtags: ["lifestyle", "goodvibes", "photooftheday", "aesthetic", "daily"]
  }
};

/**
 * Detect image category based on file name keywords
 * @param {string} filename 
 * @returns {string} Category string
 */
const detectCategory = (filename = '') => {
  const name = filename.toLowerCase();
  if (name.includes('travel') || name.includes('trip') || name.includes('vacation') || name.includes('beach') || name.includes('tour')) {
    return 'travel';
  }
  if (name.includes('food') || name.includes('eat') || name.includes('lunch') || name.includes('dinner') || name.includes('cook') || name.includes('recipe')) {
    return 'food';
  }
  if (name.includes('code') || name.includes('coding') || name.includes('tech') || name.includes('program') || name.includes('software') || name.includes('computer') || name.includes('dev') || name.includes('keyboard')) {
    return 'tech';
  }
  if (name.includes('nature') || name.includes('tree') || name.includes('forest') || name.includes('mountain') || name.includes('lake') || name.includes('outdoor')) {
    return 'nature';
  }
  if (name.includes('pet') || name.includes('dog') || name.includes('cat') || name.includes('animal') || name.includes('puppy') || name.includes('kitten')) {
    return 'pets';
  }
  return 'general';
};

/**
 * Generate suggested captions and hashtags based on uploaded image
 * POST /api/posts/generate-caption
 */
const generateCaption = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'Image file is required to generate captions' }
      });
    }

    const { path: filePath, originalname: filename } = req.file;
    const apiKey = process.env.OPENAI_API_KEY;
    const isRealKey = apiKey && apiKey.startsWith('sk-') && !apiKey.includes('your_openai');
    const isUrl = filePath && (filePath.startsWith('http://') || filePath.startsWith('https://'));

    let responseData;

    if (isRealKey && (isUrl || fs.existsSync(filePath))) {
      try {
        let imageUrlVal;
        if (isUrl) {
          imageUrlVal = filePath;
        } else {
          const imageBase64 = fs.readFileSync(filePath, { encoding: 'base64' });
          const imageMimeType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
          imageUrlVal = `data:${imageMimeType};base64,${imageBase64}`;
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Analyze this image and return a JSON object with two fields: "captions" (an array of 3 distinct, engaging social media caption options: one aesthetic/cool, one energetic/funny, and one professional/descriptive) and "hashtags" (an array of 5 highly relevant hashtags based on the image). Return only raw JSON, no markdown code block backticks.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: imageUrlVal
                    }
                  }
                ]
              }
            ],
            response_format: { type: 'json_object' }
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const content = result.choices[0].message.content;
          const parsed = JSON.parse(content);
          if (parsed.captions && parsed.hashtags) {
            responseData = parsed;
          }
        } else {
          const errorText = await response.text();
          logger.warn('OpenAI Vision API failed, using fallback', { error: errorText });
        }
      } catch (err) {
        logger.warn('OpenAI Vision call error, using local fallback', { error: err.message });
      }
    }

    // Fallback if OpenAI not set or failed
    if (!responseData) {
      const category = detectCategory(filename);
      responseData = MOCK_CATEGORIES[category];
    }

    // Cleanup uploaded temp file to prevent server bloat (skip for Cloudinary URLs)
    try {
      if (!isUrl && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupErr) {
      logger.warn('Failed to delete temp caption image', { path: filePath, error: cleanupErr.message });
    }

    res.status(200).json({
      success: true,
      captions: responseData.captions,
      hashtags: responseData.hashtags,
      message: 'Captions generated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate suggestions for hashtags based on provided caption text
 * POST /api/posts/generate-hashtags
 */
const generateHashtags = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({
        success: false,
        error: { message: 'Text body is required to generate hashtags' }
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const isRealKey = apiKey && apiKey.startsWith('sk-') && !apiKey.includes('your_openai');
    let hashtags;

    if (isRealKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'user',
                content: `Analyze the following text and suggest 5-8 relevant social media hashtags. Return only a JSON object containing a "hashtags" array of strings. Do not include markdown code block formatting. Text: "${text}"`
              }
            ],
            response_format: { type: 'json_object' }
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const content = result.choices[0].message.content;
          const parsed = JSON.parse(content);
          if (parsed.hashtags) {
            hashtags = parsed.hashtags;
          }
        }
      } catch (err) {
        logger.warn('OpenAI hashtag call failed, using local fallback', { error: err.message });
      }
    }

    // Local tag extraction fallback
    if (!hashtags) {
      const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3);

      const uniqueWords = [...new Set(words)];
      const categoryTags = [];
      const lowerText = text.toLowerCase();

      if (lowerText.includes('travel') || lowerText.includes('trip') || lowerText.includes('vacation')) {
        categoryTags.push('travel', 'wanderlust', 'adventure');
      }
      if (lowerText.includes('food') || lowerText.includes('yummy') || lowerText.includes('eat')) {
        categoryTags.push('foodie', 'instafood', 'yummy');
      }
      if (lowerText.includes('code') || lowerText.includes('program') || lowerText.includes('dev')) {
        categoryTags.push('programming', 'developer', 'tech');
      }

      hashtags = [...categoryTags, ...uniqueWords.slice(0, 5)];
    }

    res.status(200).json({
      success: true,
      hashtags: hashtags.slice(0, 8),
      message: 'Hashtags generated successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateCaption,
  generateHashtags,
  detectCategory,
  MOCK_CATEGORIES,
};
