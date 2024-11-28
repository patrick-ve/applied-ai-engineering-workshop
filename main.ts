import dotenv from 'dotenv';
dotenv.config();

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { type TokenUsage } from './utils';
import { initDb, initSchema } from './db/db';
import { generateEmbeddings } from './db/embeddings';

const recipeSchema = z.object({
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

const system = `
    You are an expert chef who has worked at a Michelin restaurant for more than 20 years. 
    You must create recipes for dishes that the user gives you. Ensure to list equipment, ingredients and cooking time.
    Also ensure to create a description for the recipe in 2-3 sentences, which tells the background and history of the dish.

    The user will indicate how many persons will be eating the dish. Adjust the ingredients based on this.
`;

async function createRecipe(db, recipeInput: string) {
  const { object: recipe }: { object: Recipe; usage: TokenUsage } =
    await generateObject({
      model: openai('gpt-4o-mini'),
      schema: recipeSchema,
      system,
      prompt: recipeInput,
    });

  console.dir(recipe, { depth: null });

  const recipeText = `Recipe: ${recipe.name}. Description: ${recipe.description}`;
  const embeddingArray = await generateEmbeddings(recipeText);

  // Convert the embedding array to a Postgres vector literal
  const embeddingVector = `[${embeddingArray.join(',')}]`;

  await db.query(
    `
    INSERT INTO recipes (name, description, servings, equipment, ingredients, steps, totalTime, embedding)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
    `,
    [
      recipe.name,
      recipe.description,
      recipe.servings,
      recipe.equipment,
      recipe.ingredients,
      recipe.steps,
      recipe.totalTime,
      embeddingVector,
    ]
  );
}

async function queryRecipes(db, query: string, limit = 5) {
  const queryEmbeddingArray = await generateEmbeddings(query);

  // Convert the embedding array to a Postgres vector literal
  const queryEmbeddingVector = `'[${queryEmbeddingArray.join(',')}]'`;

  // Perform the similarity search using the "<->" operator for Euclidean distance or "<#>" for cosine distance
  const res = await db.query(
    `
    SELECT 
      name, 
      description,
      ingredients,
      -(embedding <#> ${queryEmbeddingVector}) AS similarity
    FROM recipes
    ORDER BY similarity DESC
    LIMIT $1;
    `,
    [limit]
  );

  console.dir(res.rows, { depth: null });

  return res.rows;
}

async function main() {
  const db = await initDb();
  await initSchema(db);

  await queryRecipes(db, 'Spicy food', 3);
}

main();
