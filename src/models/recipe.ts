import { z } from 'zod';

export const recipeSchema = z.object({
  name: z.string().describe('Name of the recipe'),
  description: z
    .string()
    .describe('Description of the recipe in 2-3 sentences.'),
  servings: z.number().describe('Number of people the recipe serves'),
  equipment: z
    .array(z.string())
    .describe('List of kitchen equipment needed'),
  ingredients: z
    .array(
      z.object({
        item: z.string().describe('Name of the ingredient'),
        amount: z.number().describe('Quantity of the ingredient'),
        unit: z
          .string()
          .optional()
          .describe('Unit of measurement for the ingredient'),
      })
    )
    .describe('List of ingredients with their quantities'),
  steps: z
    .array(z.string())
    .describe('Step-by-step cooking instructions'),
  totalTime: z.number().describe('Total cooking time in minutes'),
});

export type Recipe = z.infer<typeof recipeSchema>;
