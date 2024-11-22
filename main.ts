import dotenv from 'dotenv';
dotenv.config();

import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

const prompt = `
    Lasagna for 4 persons.
`;

const system = `
    You are an expert chef who has worked at a Michelin restaurant for more than 20 years. 
    You must create recipes for dishes that the user gives you. Ensure to list equipment, ingredients and cooking time.

    The user will indicate how many persons will be eating the dish. Adjust the ingredients based on this.
`;

async function createRecipe() {
  // Generate the recipe and wait for entire response
  const { text } = await generateText({
    model: anthropic('claude-3-5-sonnet-latest'),
    topP: 1,
    system,
    prompt,
  });

  console.log(text);

  // Generate the recipe and stream the generated tokens on the fly
  const result = await streamText({
    model: openai('gpt-4o-mini'),
    temperature: 1,
    system,
    prompt,
  });

  // result.textStream is both a ReadableStream and an AsyncIterable
  for await (const chunk of result.textStream) {
    console.log(chunk);
  }
}

createRecipe();

// For an overview of Vercel AI SDK models, providers, compatibilities and capabilities:
// https://sdk.vercel.ai/docs/foundations/providers-and-models
