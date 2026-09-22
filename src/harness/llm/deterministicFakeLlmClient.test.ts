import { describe, expect, it } from 'vitest';
import { DeterministicFakeLlmClient } from './deterministicFakeLlmClient.js';
import type { LlmCompletionRequest } from './llmClient.types.js';

function requestWithMessages(messages: LlmCompletionRequest['messages']): LlmCompletionRequest {
  return { systemPrompt: 'system', messages, tools: [] };
}

describe('DeterministicFakeLlmClient', () => {
  it('identifies itself as the fake-deterministic provider', () => {
    const client = new DeterministicFakeLlmClient();
    expect(client.providerLabel).toBe('fake-deterministic');
    expect(client.model).toBe('deterministic-fake-v1');
  });

  it('accepts a custom model label', () => {
    const client = new DeterministicFakeLlmClient('custom-label');
    expect(client.model).toBe('custom-label');
  });

  it('calls list_files with no arguments when no tool result is present yet', async () => {
    const client = new DeterministicFakeLlmClient();
    const result = await client.complete(requestWithMessages([{ role: 'user', content: 'Fix the bug.' }]));

    expect(result.toolCalls).toEqual([{ id: 'smoke-list-files', name: 'list_files', arguments: {} }]);
  });

  it('concludes with no tool calls once a tool result is present in the conversation', async () => {
    const client = new DeterministicFakeLlmClient();
    const result = await client.complete(
      requestWithMessages([
        { role: 'user', content: 'Fix the bug.' },
        { role: 'assistant', content: '', toolCalls: [{ id: 'c1', name: 'list_files', arguments: {} }] },
        { role: 'tool', toolCallId: 'c1', toolName: 'list_files', content: 'a.js\nb.js' },
      ]),
    );

    expect(result.toolCalls).toEqual([]);
  });

  it('is a pure function of its request — identical input always yields identical output', async () => {
    const client = new DeterministicFakeLlmClient();
    const request = requestWithMessages([{ role: 'user', content: 'Fix the bug.' }]);

    const first = await client.complete(request);
    const second = await client.complete(request);

    expect(first).toEqual(second);
  });
});
