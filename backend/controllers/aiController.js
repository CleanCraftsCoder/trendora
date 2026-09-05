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
 * Hash utility for deterministic or seeded generation
 */
const stringHash = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

/**
 * Dynamic caption generator engine
 * Produces creative, varied, post-specific captions and hashtags across 3 tones:
 * - Aesthetic ✨
 * - Energetic 🔥
 * - Professional 💼
 */
const generateDynamicCaptions = ({ filename = '', keywords = '', vibe = '', prompt = '', nonce = 0, fileSize = 0 }) => {
  const combinedText = `${filename} ${keywords} ${vibe} ${prompt}`.toLowerCase();
  
  let detectedCategory = detectCategory(filename);
  if (detectedCategory === 'general') {
    if (/art|design|style|color|draw|sketch|aesthetic/.test(combinedText)) detectedCategory = 'art';
    else if (/fitness|gym|workout|health|run|train|gains/.test(combinedText)) detectedCategory = 'fitness';
    else if (/city|urban|street|night|lights|skyline|nyc/.test(combinedText)) detectedCategory = 'city';
    else if (/coffee|cafe|morning|tea|breakfast|latte/.test(combinedText)) detectedCategory = 'coffee';
    else if (/sunset|sunrise|sky|clouds|goldenhour/.test(combinedText)) detectedCategory = 'sunset';
    else if (/music|vibe|sound|concert|beat|track/.test(combinedText)) detectedCategory = 'music';
    else if (/book|study|read|mindset|quote|learn|thoughts/.test(combinedText)) detectedCategory = 'mindset';
  }

  // Generate seed from combination of factors
  const randomShift = Math.floor(Math.random() * 5000);
  const seed = Math.abs(stringHash(combinedText) + Number(nonce || Date.now()) + Number(fileSize || 1024) + randomShift);
  const pick = (arr, offset = 0) => arr[(seed + offset) % arr.length];

  // Curated contextual subjects
  const subjectsMap = {
    travel: ['unexplored paths', 'the beauty of wandering', 'coastal breezes and open roads', 'chasing distant horizons', 'the art of getting lost', 'sun-drenched afternoons'],
    food: ['culinary comfort', 'the art of slow dining', 'homemade flavors made with intention', 'feasting with good company', 'sweet savory perfection', 'table memories'],
    tech: ['building digital frontiers', 'lines of code shaping tomorrow', 'creative problem solving', 'the late night breakthrough', 'turning concepts into software', 'next-gen builds'],
    nature: ['the quiet whisper of trees', 'untamed landscapes', 'earthy tones and crisp mountain air', 'sunlight filtering through the canopy', 'grounding into the present moment', 'deep forest greens'],
    pets: ['unconditional joy and wagging tails', 'curious paws and gentle hearts', 'the best kind of companionship', 'pure fluff and playful energy', 'everyday moments with a furry best friend'],
    art: ['creative expression', 'splashes of contrast and vision', 'colors that speak without words', 'visual rhythm and balance', 'giving form to imagination', 'abstract perspectives'],
    fitness: ['daily discipline and relentless focus', 'the sweat before the triumph', 'building strength from within', 'showing up when nobody is watching', 'moving with power and intent', 'heavy lifts and high standards'],
    city: ['urban rhythms and late night neon', 'concrete canyons and high energy', 'city lights reflecting memories', 'moving through the bustling streets', 'architecture and modern pace', 'midnight skylines'],
    coffee: ['the warmth of a fresh brew', 'steam rising into slow mornings', 'quiet cafe corners and deep thoughts', 'caffeine-fueled inspiration', 'the ritual of morning coffee', 'espresso shots and calm moments'],
    sunset: ['golden hour glow', 'the sky painted in amber and violet', 'watching daylight melt away', 'quiet serenity as the stars appear', 'the poetry of the evening sky', 'warm fading light'],
    mindset: ['intentional growth', 'clarity found in quiet moments', 'stepping into the next level', 'protecting your peace and focus', 'continuous evolution', 'silent victories'],
    general: ['the beauty of the everyday', 'living in full color', 'unfiltered moments of real life', 'holding onto small joys', 'the story unfolding behind the lens', 'spaces that inspire', 'authentic frames and real feelings', 'the simple things that mean the most']
  };

  const currentSubjects = subjectsMap[detectedCategory] || subjectsMap.general;
  const userKeywordClean = (keywords || prompt || '').trim().replace(/[^\w\s]/g, '');
  const subject1 = userKeywordClean || pick(currentSubjects, 1);
  const subject2 = userKeywordClean || pick(currentSubjects, 3);
  const subject3 = userKeywordClean || pick(currentSubjects, 7);

  // Tone 1: Aesthetic ✨
  const aestheticTemplates = [
    `Finding quiet magic in ${subject1}. A gentle reminder that peace is created from within. ✨🌿`,
    `Soft light, calm thoughts, and ${subject1}. Letting the moments speak for themselves. 🕊️💫`,
    `Somewhere between daydreaming and doing. Forever fascinated by ${subject1}. ☁️📸`,
    `Curating peace, one frame at a time. The poetry found in ${subject1}. 🕯️✨`,
    `Golden hues and good company. Creating a life that feels good on the inside. 🌅🧡`,
    `A little blur, a lot of life. Completely immersed in ${subject1}. 🎞️🤍`,
    `Noticing the subtle details that usually slip by. ${subject1} in full bloom. 🌸✨`,
    `Collecting moments that don't need a filter. Pure ${subject1} essence. 🌾✨`,
    `When the lighting and the vibe align just right. Embracing ${subject1}. 🌙✨`,
    `A visual diary entry: gentle thoughts, slow sips, and ${subject1}. ☕📖`
  ];

  // Tone 2: Energetic 🔥
  const energeticTemplates = [
    `Unstoppable momentum! 🚀 Dialed in on ${subject2} and turning the dial all the way up. What are you chasing today? Drop it below! 👇🔥`,
    `Main character energy on 100%! 💥 No shortcuts, no excuses—just pure dedication to ${subject2}. Let's get it! ⚡🎯`,
    `Big goals, bigger focus. When you're passionate about ${subject2}, the energy is contagious! Who's locked in with me? 🥊🔥`,
    `New day, new canvas, maximum impact! ⚡ Taking on ${subject2} with everything I've got. What's your top goal this week? 💬💥`,
    `Fueling the fire with good vibes and relentless hustle. 🔥 ${subject2} is just getting started! 🚀✨`,
    `Keep showing up until they can't ignore the work. 📈 High energy, zero doubt! ⚡🔥`,
    `Making bold moves only! 💥 Diving headfirst into ${subject2}. Rate this energy 1-10! 👇⚡`,
    `Leveling up every single chapter. 🏆 Never trade discipline for convenience. We stay building! 💥🚀`,
    `Energy is currency—spend it where it grows! ⚡ Bringing pure fire to ${subject2}. Let's make it count! 🔥🎯`
  ];

  // Tone 3: Professional 💼
  const professionalTemplates = [
    `Perspective and execution in harmony. Focusing on intentional craft, sustainable progress, and ${subject3}. 📊💡`,
    `Behind every meaningful outcome is a series of deliberate steps. Reflecting on the process of ${subject3}. 📈🤝`,
    `Elevating standards and exploring new frontiers. Consistency remains the ultimate competitive edge in ${subject3}. 🌐✨`,
    `A thoughtful look into ${subject3}. The future belongs to those who build with precision and clarity. 💼📌`,
    `Mastering the fundamentals while embracing the evolution of ${subject3}. Continuous growth is non-negotiable. 🎯🚀`,
    `Balancing strategic vision with authentic execution. Finding clarity in ${subject3}. 🧭✨`,
    `Deep focus produces deep results. Taking notes on where ${subject3} is headed next. 💡📑`,
    `Innovation isn't about complexity; it's about solving the right problems with elegance. Insights on ${subject3}. 🔍💼`
  ];

  const caption1 = pick(aestheticTemplates, 0);
  const caption2 = pick(energeticTemplates, 3);
  const caption3 = pick(professionalTemplates, 6);

  // Dynamic hashtag pools
  const categoryTagsMap = {
    travel: ['travelgram', 'wanderlust', 'exploremore', 'roamtheplanet', 'passportready', 'stayandwander'],
    food: ['foodie', 'instafood', 'culinaryart', 'delicious', 'foodphotography', 'tasteofhome'],
    tech: ['coding', 'developer', 'softwareengineering', 'techcommunity', 'buildinpublic', 'innovation'],
    nature: ['naturelovers', 'wildlifephotography', 'earthfocus', 'optoutside', 'greatoutdoors', 'landscape'],
    pets: ['petsofinstagram', 'cutepets', 'doglife', 'catsofinsta', 'furryfriend', 'animallover'],
    art: ['creativecommunity', 'visualart', 'artoftheday', 'designinspiration', 'aestheticart', 'contemporary'],
    fitness: ['fitlife', 'gymmotivation', 'workoutroutine', 'discipline', 'healthylifestyle', 'pushyourlimits'],
    city: ['cityscape', 'urbanphotography', 'streetvibes', 'citylife', 'nightphotography', 'metropolis'],
    coffee: ['coffeetime', 'coffeelover', 'baristadaily', 'caffeinevibes', 'morningritual', 'cafevibes'],
    sunset: ['sunsetlovers', 'goldenhour', 'skylovers', 'dusk', 'sunsetphotography', 'chasinglight'],
    mindset: ['growthmindset', 'selfgrowth', 'mindsetmatters', 'positivevibes', 'dailyinspiration', 'focus'],
    general: ['trendora', 'lifestyle', 'goodvibes', 'photooftheday', 'creatorcommunity', 'aesthetic', 'visualsoflife']
  };

  const pool = categoryTagsMap[detectedCategory] || categoryTagsMap.general;
  const generalPool = categoryTagsMap.general;

  const selectedTags = new Set();
  if (userKeywordClean) {
    selectedTags.add(userKeywordClean.toLowerCase().replace(/\s+/g, ''));
  }
  for (let i = 0; i < 4; i++) {
    selectedTags.add(pick(pool, i * 2 + 1));
  }
  for (let i = 0; i < 3; i++) {
    selectedTags.add(pick(generalPool, i * 3 + 2));
  }

  return {
    captions: [caption1, caption2, caption3],
    hashtags: Array.from(selectedTags).slice(0, 8),
  };
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

    const { path: filePath, originalname: filename, size: fileSize } = req.file;
    const { prompt = '', vibe = '', keywords = '', nonce = Date.now() } = req.body || {};
    
    const apiKey = process.env.OPENAI_API_KEY;
    const isRealKey = apiKey && apiKey.startsWith('sk-') && !apiKey.includes('mock') && !apiKey.includes('your_openai') && !apiKey.includes('local');
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

        const userPromptText = prompt || keywords || vibe 
          ? `User guidance/keywords: "${prompt || keywords || vibe}".`
          : '';

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
                    text: `Analyze this image and ${userPromptText} Return a JSON object with two fields: "captions" (an array of 3 distinct, highly engaging social media captions: 1. Aesthetic ✨, 2. Energetic/Hype 🔥, 3. Professional/Reflective 💼) and "hashtags" (an array of 6-8 trending, relevant hashtags). Return only raw JSON without markdown backticks.`
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
          logger.warn('OpenAI Vision API failed, using dynamic generator fallback', { error: errorText });
        }
      } catch (err) {
        logger.warn('OpenAI Vision call error, using dynamic generator fallback', { error: err.message });
      }
    }

    // Dynamic generation fallback (runs when OpenAI is mock or unavailable)
    if (!responseData) {
      responseData = generateDynamicCaptions({
        filename,
        keywords,
        vibe,
        prompt,
        nonce,
        fileSize,
      });
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
  generateDynamicCaptions,
  stringHash,
  MOCK_CATEGORIES,
};
