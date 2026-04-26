/**
 * OpenRouter Configuration
 * Setup để sử dụng Claude models miễn phí từ OpenRouter
 */

require('dotenv').config();

const OPENROUTER_CONFIG = {
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseUrl: process.env.AI_BASE_URL || process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  models: {
    free: ['google/gemma-4-26b-a4b-it:free', 'meta-llama/llama-3-8b-instruct'],
    claude: ['claude-3.5-sonnet', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    recommended: 'google/gemma-4-26b-a4b-it:free'
  },
  defaultModel: process.env.AI_MODEL || process.env.OPENROUTER_MODEL || 'google/gemma-4-26b-a4b-it:free',
  timeout: 30000,
  headers: {
    'HTTP-Referer': 'https://github.com/yourusername/ChappAt',
    'X-Title': 'ChappAt',
  }
};

module.exports = OPENROUTER_CONFIG;
