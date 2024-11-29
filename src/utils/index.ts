import dotenv from 'dotenv';
dotenv.config();

import { openai } from '@ai-sdk/openai';
import { pipeline, Tensor } from '@huggingface/transformers';
import { generateObject } from 'ai';
import { Recipe, recipeSchema } from '../models/recipe';
import { Query, querySchema } from '../models/query';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

type LLMProvider = 'OPEN_AI' | 'ANTHROPIC';

const GPT_4o_MINI_COSTS_PER_1M_INPUT_TOKENS = 0.15;
const GPT_4o_MINI_COSTS_PER_1M_OUTPUT_TOKENS = 0.6;
const CLAUDE_SONNET_COSTS_PER_1M_INPUT_TOKENS = 3;
const CLAUDE_SONNET_COSTS_PER_1M_OUTPUT_TOKENS = 15;

export function calculateLLMCost(
  provider: LLMProvider,
  usage: TokenUsage
): void {
  const inputCostPer1M =
    provider === 'OPEN_AI'
      ? GPT_4o_MINI_COSTS_PER_1M_INPUT_TOKENS
      : CLAUDE_SONNET_COSTS_PER_1M_INPUT_TOKENS;

  const outputCostPer1M =
    provider === 'OPEN_AI'
      ? GPT_4o_MINI_COSTS_PER_1M_OUTPUT_TOKENS
      : CLAUDE_SONNET_COSTS_PER_1M_OUTPUT_TOKENS;

  const inputCost = (usage.promptTokens / 1_000_000) * inputCostPer1M;
  const outputCost =
    (usage.completionTokens / 1_000_000) * outputCostPer1M;

  console.log(
    `Total costs for generating recipe: $${Number(
      (inputCost + outputCost).toFixed(6)
    )}`
  );
}

export async function generateEmbeddings(
  text: string,
  modelName = 'nomic-ai/nomic-embed-text-v1'
): Promise<number[]> {
  let featureExtractor;

  if (!featureExtractor) {
    featureExtractor = await pipeline(
      'feature-extraction',
      modelName
    );
  }

  const embeddings: Tensor = await featureExtractor(text, {
    pooling: 'mean',
    normalize: true,
  });

  return Array.from(embeddings.ort_tensor.cpuData);
}

export async function createRecipe(db, recipeInput: string) {
  const systemPrompt = `
    You are an expert chef who has worked at a Michelin restaurant for more than 20 years.
    You must create recipes for dishes that the user gives you. Ensure to list equipment, ingredients and cooking time.
    Also ensure to create a description for the recipe in 2-3 sentences, which tells the background and history of the dish.
  
    The user will indicate how many persons will be eating the dish. Adjust the ingredients based on this.
  `;

  const { object: recipe }: { object: Recipe; usage: TokenUsage } =
    await generateObject({
      model: openai('gpt-4o-mini'),
      schema: recipeSchema,
      system: systemPrompt,
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

export async function logRecipes(db) {
  const { rows } = await db.query('SELECT * FROM recipes');
  console.dir(rows, { depth: null });
}

export async function queryDatabase(db, input: string) {
  const systemPrompt = `
    You are a SQL (Postgres) and data visualization expert. Your job is to help the user write a SQL query to retrieve the data they need. The table schema is as follows:

    recipes (
      id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      servings INTEGER NOT NULL,
      equipment JSONB,
      ingredients JSONB,
      steps JSONB,
      totalTime INTEGER NOT NULL,
      embedding vector(768)
    );
    
    Only retrieval queries are allowed.
    
    For text fields like name and description, use the ILIKE operator and convert both the search term and the field to lowercase using LOWER() function. For example: LOWER(name) ILIKE LOWER('%search_term%').

    For JSONB arrays (equipment, ingredients, steps), use the jsonb_array_elements function to search within arrays. For example:
    SELECT * FROM recipes, jsonb_array_elements(ingredients) as ingredient 
    WHERE ingredient->>'name' ILIKE '%search_term%'
    
    The embedding field can be used for similarity search using the <-> operator (cosine distance).
    For example: SELECT * FROM recipes ORDER BY embedding <-> query_embedding LIMIT 5
    
    Note: totalTime is in minutes
    Note: when searching for cooking times, consider grouping into categories like "quick" (< 30 mins), "medium" (30-60 mins), "long" (> 60 mins)
    
    EVERY QUERY SHOULD RETURN QUANTITATIVE DATA THAT CAN BE PLOTTED ON A CHART! There should always be at least two columns. If the user asks for a single column, return the column and the count of the column. For example, if they ask about cooking times, return both the time category and the count of recipes in that category.
  `;

  const { object }: { object: Query } = await generateObject({
    model: openai('gpt-4o-mini'),
    system: systemPrompt,
    prompt: `Generate the query necessary to retrieve the data the user wants: ${input}`,
    schema: querySchema,
  });

  const queryWithNormalizedSpaces = object.query.replace(/\s+/g, ' ');
  console.log(queryWithNormalizedSpaces);

  const { rows } = await db.query(queryWithNormalizedSpaces);
  console.log('\nQuery results:');
  console.dir(rows, { depth: null });
}
