import { initDb, initSchema } from "./src/db";

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
type LLMProvider = "OPEN_AI" | "ANTHROPIC";

const GPT_4o_MINI_COSTS_PER_1M_INPUT_TOKENS = 0.15;
const GPT_4o_MINI_COSTS_PER_1M_OUTPUT_TOKENS = 0.6;
const CLAUDE_SONNET_COSTS_PER_1M_INPUT_TOKENS = 3;
const CLAUDE_SONNET_COSTS_PER_1M_OUTPUT_TOKENS = 15;

export function calculateLLMCost(
  provider: LLMProvider,
  usage: TokenUsage
): void {
  const inputCostPer1M =
    provider === "OPEN_AI"
      ? GPT_4o_MINI_COSTS_PER_1M_INPUT_TOKENS
      : CLAUDE_SONNET_COSTS_PER_1M_INPUT_TOKENS;

  const outputCostPer1M =
    provider === "OPEN_AI"
      ? GPT_4o_MINI_COSTS_PER_1M_OUTPUT_TOKENS
      : CLAUDE_SONNET_COSTS_PER_1M_OUTPUT_TOKENS;

  const inputCost = (usage.promptTokens / 1_000_000) * inputCostPer1M;
  const outputCost = (usage.completionTokens / 1_000_000) * outputCostPer1M;

  console.log(
    `Total costs for generating recipe: $${Number(
      (inputCost + outputCost).toFixed(6)
    )}`
  );
}

async function initializeDatabase() {
  const db = await initDb();
  await initSchema(db);
}

initializeDatabase();
