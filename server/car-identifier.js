#!/usr/bin/env node
/**
 * Car Model Identifier
 * Usage:
 *   node car-identifier.js <image-url>
 *   node car-identifier.js <path-to-local-image>
 *
 * Requires: ANTHROPIC_API_KEY environment variable
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { extname } from 'path';

const MEDIA_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

async function identifyCar(input) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let imageContent;
  if (input.startsWith('http://') || input.startsWith('https://')) {
    imageContent = { type: 'image', source: { type: 'url', url: input } };
  } else {
    const ext = extname(input).toLowerCase();
    const mediaType = MEDIA_TYPES[ext] || 'image/jpeg';
    const data = readFileSync(input).toString('base64');
    imageContent = { type: 'image', source: { type: 'base64', media_type: mediaType, data } };
  }

  console.log('Analyzing image...\n');

  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: [
          imageContent,
          {
            type: 'text',
            text: `Identify the car in this image. Provide:
1. Make (manufacturer)
2. Model
3. Year or year range (if identifiable)
4. Trim/variant (if identifiable)
5. Key identifying features that led to this identification
6. Confidence level (high/medium/low)

If there are multiple cars, identify the most prominent one. If no car is visible, say so.`,
          },
        ],
      },
    ],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      process.stdout.write(event.delta.text);
    }
  }

  const finalMessage = await stream.finalMessage();
  console.log(`\n\n--- Usage: ${finalMessage.usage.input_tokens} input / ${finalMessage.usage.output_tokens} output tokens ---`);
}

const input = process.argv[2];
if (!input) {
  console.error('Usage: node car-identifier.js <image-url-or-path>');
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is not set');
  process.exit(1);
}

identifyCar(input).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
