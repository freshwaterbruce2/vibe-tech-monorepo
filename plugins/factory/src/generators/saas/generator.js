'use strict';

const { formatFiles, generateFiles, joinPathFragments } = require('@nx/devkit');

const { normalizeOptions } = require('../../utils/normalize-options');
const { writeSaasProject } = require('../../utils/write-project');

async function saasGenerator(tree, schema) {
  const options = normalizeOptions(schema, 'saas');

  if (tree.exists(options.projectRoot)) {
    throw new Error(`Project root already exists: ${options.projectRoot}`);
  }

  const DEFAULT_PRD = {
    displayName: options.displayName,
    features: [
      { key: 'analytics.revenue', name: 'Premium Analytics', description: 'Access premium revenue and usage insights' },
      { key: 'ai.assistant', name: 'AI Coding Assistant', description: 'Use AI code completion and chat assistant' }
    ],
    pricingTiers: [
      { key: 'free', name: 'Free', price: 0, features: [] },
      { key: 'pro', name: 'Pro', price: 19, features: ['analytics.revenue', 'ai.assistant'] }
    ],
    dbSchema: {
      tables: [
        {
          name: 'tasks',
          columns: [
            { name: 'id', type: 'INTEGER PRIMARY KEY AUTOINCREMENT' },
            { name: 'title', type: 'TEXT NOT NULL' },
            { name: 'completed', type: 'INTEGER DEFAULT 0' },
            { name: 'created_at', type: 'TEXT DEFAULT CURRENT_TIMESTAMP' }
          ]
        }
      ]
    }
  };

  let prd = DEFAULT_PRD;

  if (schema.prompt) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn('WARNING: OPENROUTER_API_KEY is not set. Skipping AI intent normalization and falling back to default PRD.');
    } else {
      try {
        console.log(`Normalizing intent with AI for prompt: "${schema.prompt}"...`);
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://codeberg.org/Vibe-Tech/vibe-tech-monorepo',
            'X-Title': 'VibeTech App Generator'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `You are an expert SaaS system architect. Output ONLY a raw, valid JSON object with no markdown wrapping, matching this JSON schema:
{
  "type": "object",
  "properties": {
    "displayName": { "type": "string" },
    "features": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "key": { "type": "string" },
          "name": { "type": "string" },
          "description": { "type": "string" }
        },
        "required": ["key", "name", "description"]
      }
    },
    "pricingTiers": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "key": { "type": "string" },
          "name": { "type": "string" },
          "price": { "type": "number" },
          "features": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["key", "name", "price", "features"]
      }
    },
    "dbSchema": {
      "type": "object",
      "properties": {
        "tables": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "columns": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "name": { "type": "string" },
                    "type": { "type": "string" }
                  },
                  "required": ["name", "type"]
                }
              }
            },
            "required": ["name", "columns"]
          }
        }
      },
      "required": ["tables"]
    }
  },
  "required": ["displayName", "features", "pricingTiers", "dbSchema"]
}

Make sure features contains at least two features (e.g. dot-separated like "analytics.revenue", "ai.assistant").
Make sure pricingTiers contains 'free' (price 0) and at least one paid tier (e.g. 'pro' or 'starter' or 'business').
Make sure dbSchema contains at least two tables relevant to the application concept (e.g. users, tasks, bookings).`
              },
              {
                role: 'user',
                content: `Vague App Idea: "${schema.prompt}"`
              }
            ],
            temperature: 0.2
          })
        });

        if (!response.ok) {
          throw new Error(`OpenRouter returned status ${response.status}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanedText);
          if (parsed.displayName && Array.isArray(parsed.features) && Array.isArray(parsed.pricingTiers) && parsed.dbSchema) {
            prd = parsed;
            console.log(`Successfully expanded vague idea into PRD for "${prd.displayName}"!`);
          } else {
            console.warn('Parsed PRD did not match expected structure. Falling back to default PRD.');
          }
        } else {
          console.warn('No content returned in OpenRouter response. Falling back to default PRD.');
        }
      } catch (err) {
        console.error('Failed to perform intent normalization:', err);
        console.warn('Falling back to default PRD.');
      }
    }
  }

  if (prd.displayName) {
    options.displayName = prd.displayName;
  }

  writeSaasProject(tree, options);
  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files'),
    options.projectRoot,
    {
      ...options,
      apiPort: options.port + 1000,
      prd,
      tmpl: '',
    }
  );

  await formatFiles(tree);
}

module.exports = saasGenerator;
module.exports.default = saasGenerator;
