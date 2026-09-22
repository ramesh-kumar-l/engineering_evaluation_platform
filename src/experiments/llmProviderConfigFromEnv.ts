import type { LlmProviderConfig } from '../harness/llm/createLlmClient.js';

/** Thrown when required environment configuration for the LLM backend is missing or invalid. */
export class MissingLlmConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingLlmConfigError';
  }
}

export interface AgentBudgetConfig {
  readonly maxTurns?: number;
  readonly maxTokensPerCompletion?: number;
  readonly wallClockBudgetMs?: number;
}

function parseOptionalInt(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Resolves an `LlmProviderConfig` from explicit environment variables — never a hardcoded default
 * vendor (ADR-013 in project-memory-bank/14-decisions.md, and 11-security.md's "no source code
 * leaves the local machine unless the user explicitly configures that"). Throws
 * `MissingLlmConfigError` with an actionable message rather than silently picking a provider when
 * configuration is absent.
 *
 * Recognized variables:
 * - `EEP_LLM_PROVIDER`: `"anthropic"` (Claude), `"openai-compatible"` (ChatGPT, Gemini's
 *   OpenAI-compatibility endpoint, or a local OpenAI-compatible server such as Ollama/LM Studio),
 *   or `"fake-deterministic"` (Phase 12's zero-cost smoke reproduction path — never a real vendor).
 * - `EEP_LLM_MODEL`: the model name/id, required for `anthropic`/`openai-compatible`; not needed
 *   for `fake-deterministic`.
 * - `EEP_LLM_API_KEY`: required for `anthropic`; optional for `openai-compatible` (a local server
 *   may need none).
 * - `EEP_LLM_BASE_URL`: required for `openai-compatible`; optional override for `anthropic`.
 * - `EEP_LLM_MAX_TOKENS`: optional integer.
 */
export function llmProviderConfigFromEnv(env: NodeJS.ProcessEnv = process.env): LlmProviderConfig {
  const provider = env.EEP_LLM_PROVIDER;

  if (provider === 'fake-deterministic') {
    return { provider: 'fake-deterministic' };
  }

  const model = env.EEP_LLM_MODEL;
  const maxTokens = parseOptionalInt(env.EEP_LLM_MAX_TOKENS);

  if (!model) {
    throw new MissingLlmConfigError(
      'EEP_LLM_MODEL must be set (e.g. "claude-sonnet-5", "gpt-4o", "gemini-2.0-flash", or a local model name).',
    );
  }

  if (provider === 'anthropic') {
    const apiKey = env.EEP_LLM_API_KEY;
    if (!apiKey) {
      throw new MissingLlmConfigError('EEP_LLM_API_KEY must be set when EEP_LLM_PROVIDER=anthropic.');
    }
    return { provider: 'anthropic', apiKey, model, baseUrl: env.EEP_LLM_BASE_URL, maxTokens };
  }

  if (provider === 'openai-compatible') {
    const baseUrl = env.EEP_LLM_BASE_URL;
    if (!baseUrl) {
      throw new MissingLlmConfigError(
        "EEP_LLM_BASE_URL must be set when EEP_LLM_PROVIDER=openai-compatible (e.g. https://api.openai.com/v1, Gemini's OpenAI-compatibility endpoint, or a local server URL).",
      );
    }
    return { provider: 'openai-compatible', baseUrl, apiKey: env.EEP_LLM_API_KEY, model, maxTokens };
  }

  throw new MissingLlmConfigError(
    `EEP_LLM_PROVIDER must be "anthropic", "openai-compatible", or "fake-deterministic" (got ${provider === undefined ? 'unset' : JSON.stringify(provider)}).`,
  );
}

/**
 * Resolves the solving agent's turn/token/wall-clock budgets from environment variables, falling
 * back to `LlmSolvingAgent`'s own defaults for anything unset.
 */
export function agentBudgetConfigFromEnv(env: NodeJS.ProcessEnv = process.env): AgentBudgetConfig {
  return {
    maxTurns: parseOptionalInt(env.EEP_AGENT_MAX_TURNS),
    maxTokensPerCompletion: parseOptionalInt(env.EEP_LLM_MAX_TOKENS),
    wallClockBudgetMs: parseOptionalInt(env.EEP_AGENT_WALL_CLOCK_BUDGET_MS),
  };
}
