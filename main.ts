import dotenv from 'dotenv';
dotenv.config();

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { type TokenUsage } from './utils';
import { initDb, initSchema } from './db';
import { generateEmbeddings } from './generateEmbeddings';

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

  const { name, description, ingredients } = recipe;

  // Generate embedding for the recipe description
  const embeddingArray = await generateEmbeddings(
    `${name} ${description} ${ingredients
      .map((ingredient) => ingredient.item)
      .join(' ')}`
  );

  // Convert the embedding array to a Postgres vector literal
  const embeddingVector = `[${embeddingArray.join(',')}]`;

  // Save the recipe and embedding to the database
  await db.query(
    `
    INSERT INTO recipes (name, description, servings, equipment, ingredients, steps, totalTime, embedding)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
    `,
    [
      recipe.name,
      recipe.description,
      recipe.servings,
      JSON.stringify(recipe.equipment),
      JSON.stringify(recipe.ingredients),
      JSON.stringify(recipe.steps),
      recipe.totalTime,
      embeddingVector,
    ]
  );
}

// Read recipes from dataabase
async function readRecipes(db) {
  const result = await db.query(`
    SELECT 
      id,
      name, 
      description,
      servings,
      equipment,
      ingredients,
      steps,
      totalTime,
      embedding
    FROM recipes;
  `);

  console.log(result);
}

async function queryRecipes(db, query: string, limit = 5) {
  const queryEmbeddingArray = await generateEmbeddings(query);

  // Convert the embedding array to a Postgres vector literal
  const queryEmbeddingVector = `'[${queryEmbeddingArray.join(',')}]'`;

  // Perform the similarity search using the "<->" operator for Euclidean distance or "<#>" for cosine distance
  const res = await db.query(
    `
    SELECT 
      id, 
      name, 
      description, 
      ingredients,
      steps,
      -(embedding <#> ${queryEmbeddingVector}) AS similarity
    FROM recipes
    ORDER BY similarity DESC
    LIMIT $1;
    `,
    [limit]
  );

  console.log(res.rows);

  return res.rows;
}

const recipes = [
  'Butter chicken for 2 persons',
  'Chicken madras for 4 persons',
  'Chicken vindaloo for 2 persons',
  'Pasta pesto for 2 persons',
  'Pasta carbonara for 2 persons',
  'Pasta alla Gricia for 2 persons',
  'Paella valenciana for 6 persons',
  'Gazpacho for 4 persons',
  'Tortilla española for 4 persons',
  'Patatas bravas for 4 persons',
  'Coq au vin for 4 persons',
  'Beef bourguignon for 6 persons',
  'Ratatouille for 4 persons',
  'Cassoulet for 6 persons',
  'Bouillabaisse for 4 persons',
  'Albondigas en salsa for 4 persons',
];

async function main() {
  const db = await initDb();
  await initSchema(db);

  // for (const recipe of recipes) {
  //   await createRecipe(db, recipe);
  // }

  // await readRecipes(db);
  await queryRecipes(db, 'Potatoes', 3);
}

main();
