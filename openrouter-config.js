/**
 * OpenRouter Configuration
 * Setup để sử dụng Claude models miễn phí từ OpenRouter
 */

require('dotenv').config();

const OPENROUTER_CONFIG = {
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseUrl: 'https://openrouter.ai/api/v1',
  models: {
    free: ['meta-llama/llama-3-8b-instruct', 'meta-llama/llama-2-7b-chat'],
    claude: ['claude-3.5-sonnet', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    recommended: 'meta-llama/llama-3-8b-instruct' // Free model
  },
  defaultModel: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3-8b-instruct',
  timeout: 30000,
  headers: {
    'HTTP-Referer': 'https://github.com/yourusername/ChappAt',
    'X-Title': 'ChappAt',
  }
};

module.exports = OPENROUTER_CONFIG;
