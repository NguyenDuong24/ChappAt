/**
 * OpenRouter Client - Simple API wrapper
 * Usage: node openrouter-client.js "Your prompt here"
 */

const fetch = require('node-fetch');
const config = require('./openrouter-config');

class OpenRouterClient {
  constructor(apiKey = null, model = null) {
    this.apiKey = apiKey || config.apiKey;
    this.model = model || config.defaultModel;
    this.baseUrl = config.baseUrl;
    
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is not set. Please set it in .env file');
    }
  }

  async chat(messages, options = {}) {
    try {
      const payload = {
        model: this.model,
        messages: Array.isArray(messages) ? messages : [{ role: 'user', content: messages }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2048,
        ...options
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...config.headers
        },
        body: JSON.stringify(payload),
        timeout: config.timeout
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error ${response.status}: ${error}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenRouter Client Error:', error.message);
      throw error;
    }
  }

  async stream(messages, onChunk = null) {
    try {
      const payload = {
        model: this.model,
        messages: Array.isArray(messages) ? messages : [{ role: 'user', content: messages }],
        stream: true,
        temperature: 0.7,
        max_tokens: 2048
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...config.headers
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error ${response.status}`);
      }

      let fullResponse = '';
      for await (const chunk of response.body) {
        const text = chunk.toString();
        const lines = text.split('\n').filter(l => l.trim());
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                fullResponse += content;
                if (onChunk) onChunk(content);
                process.stdout.write(content);
              }
            } catch (e) {
              // Skip parse errors
            }
          }
        }
      }
      return fullResponse;
    } catch (error) {
      console.error('Stream Error:', error.message);
      throw error;
    }
  }

  setModel(model) {
    this.model = model;
  }

  getAvailableModels() {
    return config.models;
  }
}

module.exports = OpenRouterClient;
