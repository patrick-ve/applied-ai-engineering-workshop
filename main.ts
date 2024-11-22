import dotenv from 'dotenv';
dotenv.config();

import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { calculateLLMCost, type TokenUsage } from './utils';

// Define schema for recipe data
const recipeSchema = z.object({
  recipe: z.object({
    name: z.string().describe('Name of the recipe'),
    servings: z
      .number()
      .describe('Number of people the recipe serves'),
    equipment: z
      .array(z.string())
      .describe('List of kitchen equipment needed'),
    ingredients: z
      .array(
        z.object({
          item: z.string().describe('Name of the ingredient'),
          amount: z.number().describe('Quantity of the ingredient'),
          unit: z
            .enum([
              'cup',
              'cups',
              'tablespoon',
              'tablespoons',
              'teaspoon',
              'teaspoons',
              'gram',
              'grams',
              'kilogram',
              'kilograms',
              'milliliter',
              'milliliters',
              'liter',
              'liters',
              'ounce',
              'ounces',
              'pound',
              'pounds',
              'pinch',
              'dash',
            ])
            .or(z.literal('pieces'))
            .or(z.literal('teaspoons'))
            .optional()
            .describe('Unit of measurement for the ingredient'),
        })
      )
      .describe('List of ingredients with their quantities'),
    steps: z
      .array(z.string())
      .describe('Step-by-step cooking instructions'),
    totalTime: z.number().describe('Total cooking time in minutes'),
  }),
});

type Recipe = z.infer<typeof recipeSchema>;

const prompt = `Pasta pesto alla Genovese for 4 persons`;

const system = `
    You are an expert chef who has worked at a Michelin restaurant for more than 20 years. 
    You must create recipes for dishes that the user gives you. Ensure to list equipment, ingredients and cooking time.

    The user will indicate how many persons will be eating the dish. Adjust the ingredients based on this.
`;

async function createRecipe() {
  const {
    object: recipe,
    usage,
  }: { object: Recipe; usage: TokenUsage } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: recipeSchema,
    system,
    prompt,
  });

  console.dir(recipe, { depth: null });
  console.dir(usage, { depth: null });
  calculateLLMCost('OPEN_AI', usage);
}

createRecipe();
