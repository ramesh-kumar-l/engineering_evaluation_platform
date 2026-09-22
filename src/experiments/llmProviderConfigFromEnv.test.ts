import { describe, expect, it } from 'vitest';
import {
  agentBudgetConfigFromEnv,
  llmProviderConfigFromEnv,
  MissingLlmConfigError,
} from './llmProviderConfigFromEnv.js';

describe('llmProviderConfigFromEnv', () => {
  it('throws MissingLlmConfigError when EEP_LLM_MODEL is unset', () => {
    expect(() => llmProviderConfigFromEnv({})).toThrow(MissingLlmConfigError);
  });

  it('throws when EEP_LLM_PROVIDER is unset or unrecognized', () => {
    expect(() => llmProviderConfigFromEnv({ EEP_LLM_MODEL: 'm' })).toThrow(MissingLlmConfigError);
    expect(() => llmProviderConfigFromEnv({ EEP_LLM_MODEL: 'm', EEP_LLM_PROVIDER: 'bogus' })).toThrow(
      MissingLlmConfigError,
    );
  });

  it('builds an anthropic config when an api key is present', () => {
    const config = llmProviderConfigFromEnv({
      EEP_LLM_PROVIDER: 'anthropic',
      EEP_LLM_MODEL: 'claude-x',
      EEP_LLM_API_KEY: 'k',
    });
    expect(config).toEqual({
      provider: 'anthropic',
      apiKey: 'k',
      model: 'claude-x',
      baseUrl: undefined,
      maxTokens: undefined,
    });
  });

  it('throws for anthropic without an api key — never falls back silently', () => {
    expect(() =>
      llmProviderConfigFromEnv({ EEP_LLM_PROVIDER: 'anthropic', EEP_LLM_MODEL: 'claude-x' }),
    ).toThrow(MissingLlmConfigError);
  });

  it('builds an openai-compatible config with apiKey optional (local server case)', () => {
    const config = llmProviderConfigFromEnv({
      EEP_LLM_PROVIDER: 'openai-compatible',
      EEP_LLM_MODEL: 'local-model',
      EEP_LLM_BASE_URL: 'http://localhost:11434/v1',
    });
    expect(config).toEqual({
      provider: 'openai-compatible',
      baseUrl: 'http://localhost:11434/v1',
      apiKey: undefined,
      model: 'local-model',
      maxTokens: undefined,
    });
  });

  it('throws for openai-compatible without a base url', () => {
    expect(() =>
      llmProviderConfigFromEnv({ EEP_LLM_PROVIDER: 'openai-compatible', EEP_LLM_MODEL: 'm' }),
    ).toThrow(MissingLlmConfigError);
  });

  it('builds a fake-deterministic config with no other env vars required', () => {
    const config = llmProviderConfigFromEnv({ EEP_LLM_PROVIDER: 'fake-deterministic' });
    expect(config).toEqual({ provider: 'fake-deterministic' });
  });

  it('parses EEP_LLM_MAX_TOKENS as an integer', () => {
    const config = llmProviderConfigFromEnv({
      EEP_LLM_PROVIDER: 'anthropic',
      EEP_LLM_MODEL: 'm',
      EEP_LLM_API_KEY: 'k',
      EEP_LLM_MAX_TOKENS: '2048',
    });
    expect(config.maxTokens).toBe(2048);
  });
});

describe('agentBudgetConfigFromEnv', () => {
  it('resolves undefined for every field when unset', () => {
    expect(agentBudgetConfigFromEnv({})).toEqual({
      maxTurns: undefined,
      maxTokensPerCompletion: undefined,
      wallClockBudgetMs: undefined,
    });
  });

  it('parses set values as integers', () => {
    const budget = agentBudgetConfigFromEnv({
      EEP_AGENT_MAX_TURNS: '10',
      EEP_LLM_MAX_TOKENS: '4096',
      EEP_AGENT_WALL_CLOCK_BUDGET_MS: '60000',
    });
    expect(budget).toEqual({ maxTurns: 10, maxTokensPerCompletion: 4096, wallClockBudgetMs: 60_000 });
  });
});
