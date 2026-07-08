const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('./env');

// Initialize the Gemini API client
let genAI = null;

if (env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
} else {
  console.warn('⚠️ GEMINI_API_KEY is not set. AI features will fail.');
}

// Get models
const getModel = (modelName) => {
  if (!genAI) throw new Error('Gemini API is not configured');
  // Fallback for safety: use a known-good default.
  const resolvedName = modelName || 'gemini-1.5-flash';
  return genAI.getGenerativeModel({ model: resolvedName });
};

// Keep a single source of truth for chat model.
const DEFAULT_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-2.0-flash';


module.exports = {
  genAI,
  getModel,
  DEFAULT_CHAT_MODEL
};

