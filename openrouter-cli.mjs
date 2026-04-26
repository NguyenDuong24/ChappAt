#!/usr/bin/env node

/**
 * OpenRouter CLI Tool
 * Usage: node openrouter-cli.mjs "Your prompt here" [--model llama-3-8b]
 * 
 * Examples:
 *   node openrouter-cli.mjs "What is React?"
 *   node openrouter-cli.mjs "Explain async/await" --model claude-3-haiku
 *   node openrouter-cli.mjs "Write a function" --stream
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = process.env.AI_BASE_URL || process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

const DEFAULT_CONFIG = {
  model: process.env.AI_MODEL || process.env.OPENROUTER_MODEL || 'google/gemma-4-26b-a4b-it:free',
  temperature: 0.7,
  maxTokens: 2048,
  stream: false
};

const MODELS = {
  'gemma-free': 'google/gemma-4-26b-a4b-it:free',
  'llama-3-8b': 'meta-llama/llama-3-8b-instruct',
  'llama-2-7b': 'meta-llama/llama-2-7b-chat',
  'claude-opus': 'claude-3-opus',
  'claude-sonnet': 'claude-3-sonnet',
  'claude-haiku': 'claude-3-haiku',
  'mistral': 'mistralai/mistral-7b-instruct'
};

function parseArgs(args) {
  const config = { ...DEFAULT_CONFIG };
  let prompt = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--model' && i + 1 < args.length) {
      const modelAlias = args[++i];
      config.model = MODELS[modelAlias] || modelAlias;
    } else if (arg === '--stream') {
      config.stream = true;
    } else if (arg === '--temp' && i + 1 < args.length) {
      config.temperature = parseFloat(args[++i]);
    } else if (arg === '--tokens' && i + 1 < args.length) {
      config.maxTokens = parseInt(args[++i]);
    } else if (!arg.startsWith('--')) {
      prompt = arg;
    }
  }

  return { prompt, config };
}

async function callOpenRouter(prompt, config) {
  if (!OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not set in .env file');
    console.error('Get your key at: https://openrouter.ai/keys');
    process.exit(1);
  }

  if (!prompt) {
    console.error('❌ Please provide a prompt');
    console.error('Usage: node openrouter-cli.mjs "Your prompt here"');
    process.exit(1);
  }

  const payload = {
    model: config.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    stream: config.stream
  };

  const headers = {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://github.com/chappat',
    'X-Title': 'ChappAt CLI'
  };

  try {
    console.log(`🚀 Using model: ${config.model}\n${'='.repeat(50)}\n`);

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error ${response.status}: ${error}`);
    }

    if (config.stream) {
      await handleStreamResponse(response);
    } else {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      console.log(content);
      console.log(`\n${'='.repeat(50)}`);
      console.log(`✅ Complete`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function handleStreamResponse(response) {
  const reader = response.body;
  
  for await (const chunk of reader) {
    const text = chunk.toString();
    const lines = text.split('\n').filter(l => l.trim());
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') break;
        
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) process.stdout.write(content);
        } catch (e) {
          // Skip parse errors
        }
      }
    }
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Stream complete`);
}

// Main
const args = process.argv.slice(2);
const { prompt, config } = parseArgs(args);
callOpenRouter(prompt, config);
