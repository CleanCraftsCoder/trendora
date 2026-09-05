/**
 * AI Controller
 * Handles dynamic content analysis, caption & hashtag generation
 * Supports:
 * 1. Mistral AI API (MISTRAL_API_KEY)
 * 2. OpenAI API (OPENAI_API_KEY)
 * 3. Context-Aware Dynamic Generative NLP Engine (zero-dependency fallback)
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
 * Hash utility for seeded pseudo-random variation
 */
const stringHash = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

// Known compound hashtag dictionary for intelligent separation and expansion
const COMPOUND_DICTIONARY = {
  jantarmantar: 'Jantar Mantar',
  indiagate: 'India Gate',
  redfort: 'Red Fort',
  connaughtplace: 'Connaught Place',
  peacefulprotest: 'Peaceful Protest',
  savefarmers: 'Save Farmers',
  farmerprotest: 'Farmer Protest',
  farmersprotest: 'Farmers Protest',
  studentrights: 'Student Rights',
  humanrights: 'Human Rights',
  climaterally: 'Climate Rally',
  saveenvironment: 'Save Environment',
  goldenhour: 'Golden Hour',
  latteart: 'Latte Art',
  streetfood: 'Street Food',
  delhistreetfood: 'Delhi Street Food',
  buildinpublic: 'Build In Public',
  webdev: 'Web Development',
  webdevelopment: 'Web Development',
  machinelearning: 'Machine Learning',
  artificialintelligence: 'Artificial Intelligence',
  softwareengineering: 'Software Engineering',
  fitnessmotivation: 'Fitness Motivation',
  gymlife: 'Gym Life',
  matchday: 'Match Day',
  bleedblue: 'Bleed Blue',
  delhidiaries: 'Delhi Diaries',
  wanderlustlife: 'Wanderlust Life',
  worldcup: 'World Cup',
};

/**
 * Cleanly expand and title-case a hashtag
 */
const expandTag = (tag = '') => {
  const clean = tag.replace(/^#/, '').toLowerCase().trim();
  if (!clean) return '';
  if (COMPOUND_DICTIONARY[clean]) return COMPOUND_DICTIONARY[clean];

  // Check for CamelCase in original tag
  const camelSplit = tag.replace(/^#/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
  if (camelSplit !== tag.replace(/^#/, '')) return camelSplit;

  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

/**
 * Parse raw input containing hashtags and plain text keywords
 */
const parseHashtagPrompt = (rawText = '') => {
  const hashtagMatches = rawText.match(/#[a-zA-Z0-9_]+/g) || [];
  const hashtags = hashtagMatches.map((t) => t.replace(/^#/, '').trim()).filter(Boolean);
  const plainWords = rawText
    .replace(/#[a-zA-Z0-9_]+/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);

  const combinedTokens = [
    ...hashtags,
    ...plainWords,
  ];

  return { hashtags, plainWords, combinedTokens };
};

/**
 * Detect semantic domain and context parameters from prompt tokens
 */
const detectDomainContext = (tokens = [], rawText = '', filename = '') => {
  const fullText = `${rawText} ${filename} ${tokens.join(' ')}`.toLowerCase();

  // 1. Civic Action / Protest / Democratic Assembly
  if (/protest|rally|jantar|mantar|demonstrat|strike|march|justice|rights|democracy|solidarity|inqilab|activism|movement|standtogether|peacefulprotest|revolution|azadi|dharna|morcha/i.test(fullText)) {
    const isJantarMantar = /jantar|mantar/i.test(fullText);
    const location = isJantarMantar ? 'Jantar Mantar' : (/delhi/i.test(fullText) ? 'Delhi' : '');
    const subject = isJantarMantar ? 'Jantar Mantar' : (tokens.find((t) => /protest|rights|justice|rally/i.test(t)) || 'peaceful assembly');
    return { domain: 'protest', location, subject: expandTag(subject) || 'Peaceful Assembly', isJantarMantar };
  }

  // 2. Tech / Coding / AI
  if (/tech|code|coding|dev|program|software|ai|hackathon|web3|javascript|python|frontend|backend|buildinpublic|algorithm|developer|computer/i.test(fullText)) {
    const mainTag = tokens.find((t) => /ai|code|coding|dev|tech|software|python|javascript|hackathon/i.test(t)) || 'Tech & Code';
    return { domain: 'tech', subject: expandTag(mainTag) };
  }

  // 3. Sports & Cricket
  if (/cricket|ipl|football|soccer|match|game|stadium|championship|trophy|tournament|pitch/i.test(fullText)) {
    const mainTag = tokens.find((t) => /cricket|ipl|match|stadium|tournament/i.test(t)) || 'Cricket Match';
    return { domain: 'cricket', subject: expandTag(mainTag) };
  }

  // 4. Fitness & Workout
  if (/gym|workout|fitness|run|marathon|training|athlete|muscle|lift|gains|fitnessmotivation/i.test(fullText)) {
    const mainTag = tokens.find((t) => /gym|workout|fitness|training|run/i.test(t)) || 'Fitness Journey';
    return { domain: 'fitness', subject: expandTag(mainTag) };
  }

  // 5. Food & Dining
  if (/food|foodie|eat|delicious|yummy|cook|recipe|dinner|lunch|biryani|pizza|burger|chai|coffee|cafe|dessert|streetfood|restaurant/i.test(fullText)) {
    const mainTag = tokens.find((t) => /food|biryani|pizza|burger|chai|coffee|cafe|streetfood/i.test(t)) || 'Culinary Delights';
    return { domain: 'food', subject: expandTag(mainTag) };
  }

  // 6. Travel & Heritage & City
  if (/travel|trip|vacation|explore|wanderlust|beach|mountain|delhi|mumbai|goa|himalaya|flight|roadtrip|tour|resort|monument|heritage/i.test(fullText)) {
    const mainTag = tokens.find((t) => /travel|trip|beach|mountain|delhi|goa|mumbai|heritage/i.test(t)) || 'Travel Adventures';
    return { domain: 'travel', subject: expandTag(mainTag) };
  }

  // 7. Nature & Landscapes
  if (/nature|forest|tree|sunset|sunrise|sky|river|ocean|lake|clouds|rain|monsoon|green|earth|landscape/i.test(fullText)) {
    const mainTag = tokens.find((t) => /nature|sunset|sunrise|forest|mountain|rain|monsoon/i.test(t)) || 'Nature Wonders';
    return { domain: 'nature', subject: expandTag(mainTag) };
  }

  // 8. Pets & Animals
  if (/pet|dog|puppy|cat|kitten|animal|paw|furry|bird/i.test(fullText)) {
    const mainTag = tokens.find((t) => /dog|puppy|cat|pet/i.test(t)) || 'Furry Friends';
    return { domain: 'pets', subject: expandTag(mainTag) };
  }

  // 9. Art & Style & Music
  if (/art|music|song|concert|dance|draw|paint|sketch|fashion|outfit|style|creative|photography|portrait/i.test(fullText)) {
    const mainTag = tokens.find((t) => /art|music|fashion|style|photo|design/i.test(t)) || 'Creative Expressions';
    return { domain: 'art', subject: expandTag(mainTag) };
  }

  // 10. Motivation & Hustle
  if (/motivat|mindset|grind|hustle|discipline|success|growth|inspire|leadership|focus/i.test(fullText)) {
    const mainTag = tokens.find((t) => /motivat|mindset|grind|hustle|goals|growth/i.test(t)) || 'Daily Grind';
    return { domain: 'motivation', subject: expandTag(mainTag) };
  }

  // Fallback: Open domain
  const fallbackSubject = tokens.length > 0 
    ? tokens.slice(0, 2).map(expandTag).join(' & ') 
    : (filename ? filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') : 'Special Moments');

  return { domain: 'general', subject: fallbackSubject };
};

/**
 * Context-Aware Dynamic Caption Generator Engine
 * Synthesizes dynamic, authentic, topic-specific captions & hashtags across 3 tones:
 * - Aesthetic ✨
 * - Energetic 🔥
 * - Professional / Reflective 💼
 */
const generateDynamicCaptions = ({ filename = '', keywords = '', vibe = '', prompt = '', nonce = 0, fileSize = 0 }) => {
  const combinedRaw = `${prompt} ${keywords} ${vibe}`.trim();
  const { hashtags, plainWords, combinedTokens } = parseHashtagPrompt(combinedRaw);
  const context = detectDomainContext(combinedTokens, combinedRaw, filename);

  const seed = Math.abs(stringHash(`${combinedRaw} ${filename}`) + Number(nonce || Date.now()) + Number(fileSize || 1024));
  const pick = (arr, offset = 0) => arr[(seed + offset) % arr.length];

  const loc = context.location || '';
  const subj = context.subject || 'This Journey';

  let aestheticCaptions = [];
  let energeticCaptions = [];
  let professionalCaptions = [];
  let dynamicTagPool = [];

  switch (context.domain) {
    case 'protest': {
      const locPhrase = loc ? `at ${loc}` : 'together';
      aestheticCaptions = [
        `When voices unite, silence breaks. Standing in solidarity ${locPhrase}—where democratic courage meets the quiet strength of collective resolve. 🕊️🕯️`,
        `History is made by those who show up. Resolute, peaceful, and standing shoulder-to-shoulder ${locPhrase} for justice and truth. ✨🤝`,
        `A sea of unified determination. When people stand with one heart and one purpose ${locPhrase}, hope becomes a powerful force. 🤍🕯️`,
        `Grounded in purpose and dignity. The spirit of truth and solidarity echoing peacefully ${locPhrase}. 🕊️✨`
      ];

      energeticCaptions = [
        `Democracy in action! The collective roar for justice echoes loud and clear through ${loc || 'the grounds'}. We stand together, louder and stronger than ever! 📢🔥✊`,
        `Unshakable conviction, unbroken spirit! Standing strong side-by-side ${locPhrase}. Real change happens when we refuse to be silent! ⚡💥💪`,
        `Power to the people! United we stand, fearless we speak. The energy and solidarity ${locPhrase} today is monumental! 🚩🔥`,
        `No stepping back, no backing down! Raising our voices ${locPhrase} with pure passion, courage, and relentless momentum! ⚡📣🔥`
      ];

      professionalCaptions = [
        `Grounded in principle and driven by collective responsibility. Citizens gathering peacefully ${locPhrase} to advocate for accountability, justice, and civic rights. 🏛️📜`,
        `A defining moment of democratic engagement. Observing the peaceful demonstration ${locPhrase} as citizens advocate for meaningful reform. ⚖️🤝`,
        `Democracy thrives when civic participation is active and unwavering. Reflecting on the discipline, solidarity, and courage witnessed ${locPhrase} today. 🌐💡`,
        `Constructive dissent remains the cornerstone of democratic progress. Key reflections on the peaceful citizen assembly ${locPhrase}. 📊🏛️`
      ];

      dynamicTagPool = [
        loc ? loc.replace(/\s+/g, '') : 'Protest',
        'Protest',
        'DemocracyInAction',
        'PeoplesVoice',
        'StandInSolidarity',
        'PeacefulProtest',
        'JusticeNow',
        'RaiseYourVoice',
        'CitizenRights',
        'UnitedForChange'
      ];
      break;
    }

    case 'tech': {
      aestheticCaptions = [
        `Translating ideas into logic. Late night keystrokes and algorithms shaping the digital architecture of tomorrow. 💻✨`,
        `The quiet beauty of clean code and creative problem solving. Finding flow in ${subj}. ☕🕊️`,
        `Turning concepts into reality, one commit at a time. The craft behind modern technology. 🌐🤍`
      ];

      energeticCaptions = [
        `Building the future in real-time! 🚀 High velocity, zero blockers, and dialed in on ${subj}. What are you shipping today? Drop it below! ⚡🔥`,
        `Breakthroughs don't happen by waiting. Relentless execution, continuous builds, and pure momentum! 💥🧑‍💻⚡`,
        `Turning coffee into production code! ☕⚡ Full stack energy pushing boundaries in ${subj}. Let's get it! 🚀🔥`
      ];

      professionalCaptions = [
        `Architecting scalable systems and modern infrastructure. Deliberate engineering principles applied to ${subj}. 📊💡`,
        `Engineering excellence is built on intentional design, clean abstractions, and team alignment. Insights on ${subj}. 💼🌐`,
        `Navigating technological complexity with simplicity and rigor. Future perspectives on ${subj}. 📈🔍`
      ];

      dynamicTagPool = ['tech', 'coding', 'developer', 'programming', 'softwareengineering', 'buildinpublic', 'webdev', 'innovation'];
      break;
    }

    case 'cricket': {
      aestheticCaptions = [
        `Under the stadium lights, every second holds breath. The timeless emotion, craft, and glory of ${subj} uniting millions. 🏏✨`,
        `Pure poetry on the pitch. The thud of the willow, the roar of the crowd, and moments etched forever in memory. 🕊️🏏`,
        `More than just a game—it's a heartbeat, a shared dream, and unforgettable camaraderie on the field. 🌟🏟️`
      ];

      energeticCaptions = [
        `MATCH DAY FEVER! 🏆 High stakes, roaring crowds, and pure adrenaline on the pitch. Who are you backing for the win? Let's hear it! 🔥⚡🏏`,
        `Electric atmosphere and championship intensity! 💥 Backing the boys with everything we've got! Who's taking home the glory? 🚀🔥`,
        `Big hits, nail-biting finishes, and uncontainable energy! 🏏⚡ This is why we live for the game! 💥🔥`
      ];

      professionalCaptions = [
        `Strategic discipline, mental composure, and high-performance execution under pressure. Lessons from ${subj}. 📊🏆`,
        `A masterclass in teamwork and athletic excellence. Analyzing the defining moments of today's match. 📈🏏`,
        `Consistent execution separates good teams from championship contenders. Reflecting on strategy and gameplay in ${subj}. 🏅🤝`
      ];

      dynamicTagPool = ['cricket', 'matchday', 'ipl', 'cricketlovers', 'bleedblue', 'gameday', 'championship', 'cricketfever'];
      break;
    }

    case 'fitness': {
      aestheticCaptions = [
        `Quiet discipline before the world wakes up. Honoring the body, moving with intention, and embracing the journey. 🌿⚡`,
        `Progress isn't loud—it's built in the daily consistency and mindful dedication to ${subj}. ✨🤍`,
        `Finding balance between strength and serenity. Breathing deep, lifting mindfully, and staying grounded. 🕊️💪`
      ];

      energeticCaptions = [
        `No shortcuts, no excuses! 💥 Relentless energy dialed into ${subj}. Put in the work when nobody is watching! ⚡🥊🔥`,
        `Main character energy on 100%! 🚀 Heavy sets, sweat, and pure determination. Are you showing up today? Let's get it! 💥💪`,
        `Leveling up every single day! ⚡ Break your limits before your limits break you! Let's conquer the day! 🔥🏋️`
      ];

      professionalCaptions = [
        `Long-term wellness is built on sustainable systems, structured recovery, and deliberate discipline. 📊💡`,
        `Consistency over intensity. Principles of sustainable physical conditioning and mental clarity in ${subj}. 📈🎯`,
        `Bridging athletic performance with mental endurance. Strategic insights on habits and execution. 💼🏋️`
      ];

      dynamicTagPool = ['fitness', 'workout', 'gymmotivation', 'discipline', 'healthylifestyle', 'pushyourlimits', 'strength', 'fitlife'];
      break;
    }

    case 'food': {
      const isCoffee = /coffee|cafe|latte|chai|tea|espresso/i.test(combinedRaw);
      aestheticCaptions = [
        `Savoring slow dining, rich aromas, and flavors crafted with heart. Pure culinary comfort in ${subj}. 🍽️✨`,
        `The table is where memories are seasoned. Golden crusts, simmering spices, and wholesome company. 🌿🤤`,
        `Feasting with the eyes first. Beautiful textures, authentic recipes, and comfort on a plate. 🍓💛`
      ];

      energeticCaptions = [
        `Flavor explosion incoming! 🤤🔥 Dive into ${subj}—absolute perfection on a plate! Who's craving this right now? Tag a foodie below! 👇🍕`,
        `Unapologetically delicious! 💥 When the food is this good, conversation can wait! Rate this bite 1-10! 🤤🔥`,
        `Foodie heaven unlocked! 🚀 Irresistible spices and soul-satisfying taste! Let the feast begin! 🍽️💥`
      ];

      professionalCaptions = [
        `Honoring culinary traditions while embracing modern gastronomy. A thoughtful look at artisanal craft in ${subj}. 🍷📊`,
        `From ingredient sourcing to presentation: the delicate balance of flavor architecture and dining hospitality. 🍽️💼`,
        `Culinary innovation and sustainable dining. Exploring the art and business of ${subj}. 📈🧑‍🍳`
      ];

      dynamicTagPool = isCoffee
        ? ['coffee', 'coffeetime', 'latte', 'cafevibes', 'baristadaily', 'coffeelover', 'foodie', 'trendora']
        : ['foodie', 'instafood', 'delicious', 'culinaryart', 'foodphotography', 'tasteofhome', 'yummy', 'streetfood'];
      break;
    }

    case 'travel': {
      aestheticCaptions = [
        `Collecting moments where the road meets the horizon. Soft coastal breezes, golden hours, and ${subj}. 🌅✈️`,
        `Somewhere between wandering and wondering. Letting the rhythm of the journey unfold gently. 🗺️🌾`,
        `Unfiltered vistas and timeless memories. Finding pieces of myself in the beauty of ${subj}. 📸🕊️`
      ];

      energeticCaptions = [
        `Next stop: pure adventure! 🚀 Bag packed, compass set, and ready to explore ${subj}! Who's on for the journey? Let's go! 🌴🔥`,
        `Wanderlust state of mind! 💥 Open roads, breathtaking heights, and nonstop thrill! What's next on your bucket list? 🗺️⚡`,
        `Chasing horizons at full speed! ✈️ Live with no excuses and travel with no regrets! 🌍🔥`
      ];

      professionalCaptions = [
        `Experiencing cultural heritage, architectural marvels, and the shifting dynamics of global travel. Insights from ${subj}. 🌐🏛️`,
        `Travel broadens perspective and sharpens strategic clarity. Reflections from exploring ${subj}. 📈✈️`,
        `Sustainable tourism and cultural stewardship. Documenting the intersection of preservation and exploration in ${subj}. 🧭💼`
      ];

      dynamicTagPool = ['travel', 'wanderlust', 'exploremore', 'roamtheplanet', 'passportready', 'stayandwander', 'adventure', 'travelgram'];
      break;
    }

    case 'nature': {
      aestheticCaptions = [
        `The quiet whisper of the wind through the leaves. Grounding into the earth and soaking in ${subj}. 🌲💚`,
        `Golden light filtering through open skies. Nature reminds us that everything blooms in its own time. 🌅🍂`,
        `Deep greens, crisp air, and tranquil serenity. Finding deep peace in the great outdoors. 🗻🕊️`
      ];

      energeticCaptions = [
        `Conquering the trails and soaking in the epic views! 🏞️ Nature energy is unmatched! Who's heading outdoors this weekend? ⚡🥾`,
        `Wild, untamed, and breathtaking! 💥 Leave the city noise behind and embrace the rush of the wild! 🌲🔥`,
        `Into the wilderness we go! 🚀 Fresh air, high peaks, and pure mountain spirit! Let's get outside! 🗻⚡`
      ];

      professionalCaptions = [
        `Environmental stewardship, biodiversity conservation, and ecological resilience. Contemplating ${subj}. 🌿📊`,
        `The restorative power of natural environments on mental focus, productivity, and leadership presence. 💼🌲`,
        `Preserving our planet's natural ecosystems: understanding balance, impact, and sustainable action. 🌍📈`
      ];

      dynamicTagPool = ['nature', 'outdoors', 'earthfocus', 'wildlifephotography', 'landscape', 'optoutside', 'scenery', 'wilderness'];
      break;
    }

    case 'pets': {
      aestheticCaptions = [
        `Gentle paws, soft warmth, and quiet companionship. Life is simply gentler with ${subj}. 🐾❤️`,
        `Unconditional loyalty wrapped in fur and wet noses. Cherishing the simple moments together. 🐶🐱✨`,
        `A heart full of love and a home full of pawprints. Grateful for our furry family member. 🐾🕊️`
      ];

      energeticCaptions = [
        `Pure zoomies and nonstop happiness! 🐶⚡ Who runs the house? Obviously this little superstar! Drop a heart for the fluff! 👇❤️💥`,
        `Living rent-free and ruling the entire world! 🐕🔥 Maximum cuteness alert! Can you even resist this face? 😍🐾`,
        `Furry tornado on the loose! 🎾🐾 High energy, big bark, and 100% good vibes all day long! 🚀⚡`
      ];

      professionalCaptions = [
        `The science of human-animal bonds: how companion animals enhance emotional resilience, reduce stress, and improve well-being. 🐾📊`,
        `Responsible pet companionship, animal welfare standards, and ethical care practices in ${subj}. 💼🐾`,
        `Reflections on dedication, empathy, and lifelong care commitments to our animal companions. 📈🐶`
      ];

      dynamicTagPool = ['pets', 'animals', 'cute', 'dogsofinstagram', 'catlife', 'furryfriend', 'animallover', 'petlovers'];
      break;
    }

    case 'art': {
      aestheticCaptions = [
        `Colors speaking where words fall silent. Deep contrast, graceful textures, and the heartbeat of ${subj}. 🎨✨`,
        `A canvas of raw thoughts and deliberate strokes. Giving tangible shape to imagination. 🕊️🖌️`,
        `Immersed in creative flow. Embracing the beauty of imperfect, authentic expression. 🕯️🎭`
      ];

      energeticCaptions = [
        `Bold visions and fearless colors! 💥 Bringing pure creative heat to ${subj}! What emotion does this evoke for you? 👇🎨⚡`,
        `Creative pulse on fire! 🔥 Breaking conventional boundaries and making art that demands attention! 🚀🖌️`,
        `Pure inspiration unleashed! ⚡ Turn imagination into impact! Never apologize for creating bold work! 💥🎨`
      ];

      professionalCaptions = [
        `Balancing creative intuition with structured craftsmanship. A critical examination of form, texture, and concept in ${subj}. 📊💡`,
        `The economics of contemporary design and visual culture. Exploring how creative capital shapes industry trends. 💼🎨`,
        `Curating aesthetic identity and narrative depth through deliberate visual composition. 📈🖼️`
      ];

      dynamicTagPool = ['art', 'creativecommunity', 'visualart', 'artoftheday', 'designinspiration', 'aestheticart', 'contemporary', 'artist'];
      break;
    }

    case 'celebration': {
      aestheticCaptions = [
        `Laughter that echoes into the night, warm lights, and cherished bonds. Celebrating ${subj} with deep gratitude. ✨🕯️`,
        `Moments made of golden memories and togetherness. Surrounded by the ones who make life beautiful. 💛🎉`,
        `A milestone celebrated with heart, elegance, and unforgettable smiles. Grateful for this chapter. 🕊️🥂`
      ];

      energeticCaptions = [
        `PARTY TIME! 🎉💥 High energy, loud music, and non-stop celebration for ${subj}! Let's make tonight legendary! 🚀🔥`,
        `Turn the music all the way up! 🥂⚡ Celebrating big wins and creating unforgettable memories with the best crew! 💥🎊`,
        `Pure joy and celebration vibes! 🥳 Celebrating life, milestones, and great moments! Let's go! 🔥🎉`
      ];

      professionalCaptions = [
        `Commemorating meaningful milestones and organizational achievements. Honoring the collaborative journey behind ${subj}. 📊🤝`,
        `Cultivating community culture and shared success through intentional celebration and acknowledgment. 💼🏆`,
        `Reflecting on heritage, shared traditions, and collective milestones in ${subj}. 📈🌐`
      ];

      dynamicTagPool = ['celebration', 'festival', 'wedding', 'party', 'goodtimes', 'milestone', 'memories', 'cheers'];
      break;
    }

    case 'motivation': {
      aestheticCaptions = [
        `Quiet mornings, focused intentions, and steady inner growth. Honoring the process of becoming in ${subj}. 🌿✨`,
        `Clarity is found in quiet consistency. Choosing deliberate progress over hurried chaos. 🕊️💡`,
        `Growth doesn't happen overnight—it blooms in the patience and faith of daily practice. 🤍🌱`
      ];

      energeticCaptions = [
        `Fuel the fire with relentless drive! 🚀 No distractions, no limits—pure locked-in focus on ${subj}! Who's grinding today? Let's win! ⚡🔥`,
        `Your only competition is who you were yesterday! 💥 Keep showing up until success is your only option! 🥊🔥`,
        `Stay hungry, stay humble, and outwork every single obstacle! ⚡ Big dreams require relentless execution! 🚀💪`
      ];

      professionalCaptions = [
        `High performance is built on deliberate systems, cognitive discipline, and consistent prioritization. 📊🎯`,
        `Strategic leadership and executive mindset: navigating uncertainty with poise, clarity, and execution. 💼💡`,
        `Building sustainable momentum: aligning personal purpose with operational excellence in ${subj}. 📈🧭`
      ];

      dynamicTagPool = ['motivation', 'mindset', 'growthmindset', 'discipline', 'hustle', 'success', 'dailyinspiration', 'focus'];
      break;
    }

    default: {
      // General / Open-Domain Dynamic Synthesis
      aestheticCaptions = [
        `Noticing the subtle details that usually slip by. Immersed in the quiet beauty of ${subj}. ✨🌿`,
        `Gentle light, calm thoughts, and genuine moments. Letting ${subj} speak for itself. 🕊️📸`,
        `Somewhere between daydreaming and doing. Curating moments of peace and authentic joy in ${subj}. ☁️💛`
      ];

      energeticCaptions = [
        `Unstoppable momentum! 🚀 Dialed in on ${subj} and bringing 100% positive energy to everything. What are you chasing today? ⚡🔥`,
        `Big goals, bold moves, and maximum impact! 💥 Taking on ${subj} with everything I've got! Let's get it! ⚡🎯`,
        `Energy is currency—spend it where it grows! 🔥 Bringing pure fire and genuine passion to ${subj}! Let's make it count! 🚀💥`
      ];

      professionalCaptions = [
        `Perspective, craftsmanship, and execution in harmony. Focusing on intentional progress in ${subj}. 📊💡`,
        `Behind every meaningful outcome is a series of deliberate, thoughtful steps. Reflecting on ${subj}. 📈🤝`,
        `Elevating standards and exploring new frontiers. Consistency remains the ultimate competitive edge in ${subj}. 🌐✨`
      ];

      dynamicTagPool = ['trendora', 'lifestyle', 'goodvibes', 'photooftheday', 'creatorcommunity', 'aesthetic', 'visualsoflife', 'dailyinspiration'];
      break;
    }
  }

  // Pick one distinct caption from each tone
  const caption1 = pick(aestheticCaptions, 0);
  const caption2 = pick(energeticCaptions, 1);
  const caption3 = pick(professionalCaptions, 2);

  // Blend custom user hashtags at the front of hashtag suggestions
  const finalHashtagsSet = new Set();
  hashtags.forEach((t) => finalHashtagsSet.add(t.toLowerCase().replace(/[^a-z0-9]/g, '')));
  combinedTokens.forEach((t) => finalHashtagsSet.add(t.toLowerCase().replace(/[^a-z0-9]/g, '')));
  if (context.location) {
    finalHashtagsSet.add(context.location.toLowerCase().replace(/\s+/g, ''));
  }
  dynamicTagPool.forEach((t) => finalHashtagsSet.add(t.toLowerCase().replace(/[^a-z0-9]/g, '')));

  const finalHashtags = Array.from(finalHashtagsSet).filter(Boolean).slice(0, 8);

  return {
    captions: [caption1, caption2, caption3],
    hashtags: finalHashtags,
  };
};

/**
 * Call Mistral AI chat completions API
 */
const callMistralAPI = async ({ prompt = '', keywords = '', vibe = '', filename = '' }) => {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey || !apiKey.trim() || apiKey.includes('your_mistral')) {
    return null;
  }

  const model = process.env.MISTRAL_MODEL || 'mistral-small-latest';
  const fullPrompt = [prompt, keywords, vibe].filter(Boolean).join(' ');

  const systemMessage = `You are Trendora's dynamic social media AI assistant.
Your job is to generate creative, compelling, and relevant social media content based on the user's prompt or hashtags.
Respond with a valid JSON object with EXACTLY this structure:
{
  "captions": [
    "Aesthetic & Evocative caption with fitting emojis ✨",
    "Energetic & Impactful caption with hype emojis 🔥",
    "Professional, Reflective, or Journalistic caption 💼"
  ],
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5", "hashtag6", "hashtag7"]
}
Do NOT return any markdown, backticks, or other text outside the JSON object.`;

  const userMessage = `Generate 3 dynamic captions and 7 relevant hashtags for: "${fullPrompt || filename || 'special moments'}".`;

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.75,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.captions) && parsed.captions.length >= 3) {
          return {
            captions: parsed.captions.slice(0, 3),
            hashtags: (parsed.hashtags || []).map((t) => t.replace(/^#/, '').toLowerCase()).slice(0, 8),
          };
        }
      }
    } else {
      const errText = await response.text();
      logger.warn('Mistral API error', { status: response.status, error: errText });
    }
  } catch (err) {
    logger.warn('Mistral API call failed', { error: err.message });
  }

  return null;
};

/**
 * Call OpenAI API if configured
 */
const callOpenAIAPI = async ({ prompt = '', keywords = '', vibe = '', filePath = null, filename = '' }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const isRealKey = apiKey && apiKey.startsWith('sk-') && !apiKey.includes('mock') && !apiKey.includes('your_openai') && !apiKey.includes('local');
  if (!isRealKey) return null;

  const isUrl = filePath && (filePath.startsWith('http://') || filePath.startsWith('https://'));
  const userPromptText = [prompt, keywords, vibe].filter(Boolean).join(' ');

  try {
    let messageContent = [];

    if (filePath && (isUrl || fs.existsSync(filePath))) {
      let imageUrlVal;
      if (isUrl) {
        imageUrlVal = filePath;
      } else {
        const imageBase64 = fs.readFileSync(filePath, { encoding: 'base64' });
        const imageMimeType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
        imageUrlVal = `data:${imageMimeType};base64,${imageBase64}`;
      }

      messageContent = [
        {
          type: 'text',
          text: `Analyze this image and user guidance: "${userPromptText}". Return a JSON object with: "captions" (3 distinct captions: 1. Aesthetic ✨, 2. Energetic 🔥, 3. Professional 💼) and "hashtags" (6-8 trending relevant hashtags). Return only raw JSON without markdown.`
        },
        {
          type: 'image_url',
          image_url: { url: imageUrlVal }
        }
      ];
    } else {
      messageContent = `Generate 3 distinct social media captions (1. Aesthetic ✨, 2. Energetic 🔥, 3. Professional 💼) and 6-8 relevant hashtags for: "${userPromptText || filename}". Return only raw JSON with keys "captions" and "hashtags".`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: filePath ? 'gpt-4o-mini' : (process.env.OPENAI_MODEL || 'gpt-3.5-turbo'),
        messages: [{ role: 'user', content: messageContent }],
        response_format: { type: 'json_object' }
      }),
    });

    if (response.ok) {
      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed.captions && parsed.hashtags) {
          return {
            captions: parsed.captions.slice(0, 3),
            hashtags: parsed.hashtags.map((h) => h.replace(/^#/, '').toLowerCase()).slice(0, 8),
          };
        }
      }
    }
  } catch (err) {
    logger.warn('OpenAI API call failed', { error: err.message });
  }

  return null;
};

/**
 * Generate suggested captions and hashtags based on prompt / hashtags or uploaded image
 * POST /api/posts/generate-caption
 */
const generateCaption = async (req, res, next) => {
  try {
    const { prompt = '', vibe = '', keywords = '', nonce = Date.now() } = req.body || {};
    const hasFile = !!req.file;

    // Both image and prompt/keywords are optional, but at least ONE must be provided
    if (!hasFile && !prompt.trim() && !keywords.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide an image, prompt, or hashtags to generate captions' }
      });
    }

    const filePath = req.file ? req.file.path : null;
    const filename = req.file ? req.file.originalname : '';
    const fileSize = req.file ? req.file.size : 0;

    let responseData = null;

    // 1. Try Mistral API (Primary user preference)
    if (process.env.MISTRAL_API_KEY && process.env.MISTRAL_API_KEY.trim()) {
      try {
        responseData = await callMistralAPI({ prompt, keywords, vibe, filename });
      } catch (err) {
        logger.warn('Mistral execution error, falling back', { error: err.message });
      }
    }

    // 2. Try OpenAI API (if real key configured)
    if (!responseData) {
      responseData = await callOpenAIAPI({ prompt, keywords, vibe, filePath, filename });
    }

    // 3. Dynamic generation fallback (High precision context-aware NLP engine)
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

    // Cleanup uploaded temp file to prevent disk bloat (skip for Cloudinary URLs)
    if (filePath && !filePath.startsWith('http://') && !filePath.startsWith('https://')) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupErr) {
        logger.warn('Failed to delete temp caption image', { path: filePath, error: cleanupErr.message });
      }
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
 * Generate suggestions for hashtags based on provided caption or prompt
 * POST /api/posts/generate-hashtags
 */
const generateHashtags = async (req, res, next) => {
  try {
    const { text = '', prompt = '' } = req.body || {};
    const inputContent = (text || prompt || '').trim();
    if (!inputContent) {
      return res.status(400).json({
        success: false,
        error: { message: 'Text or hashtag prompt is required to generate hashtags' }
      });
    }

    let hashtags = null;

    // 1. Try Mistral API
    if (process.env.MISTRAL_API_KEY && process.env.MISTRAL_API_KEY.trim()) {
      try {
        const mistralRes = await callMistralAPI({ prompt: inputContent });
        if (mistralRes && mistralRes.hashtags && mistralRes.hashtags.length > 0) {
          hashtags = mistralRes.hashtags;
        }
      } catch (err) {
        logger.warn('Mistral hashtag error', { error: err.message });
      }
    }

    // 2. Try Dynamic Context-Aware Generator
    if (!hashtags) {
      const dynamicRes = generateDynamicCaptions({ prompt: inputContent, keywords: inputContent });
      hashtags = dynamicRes.hashtags;
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
  callMistralAPI,
  callOpenAIAPI,
  MOCK_CATEGORIES,
};
