import type { LlmClient, LlmCompletionRequest, LlmCompletionResult } from './llmClient.types.js';

const EXPLORE_MESSAGE =
  'Reproduction smoke agent: listing files, then concluding without editing anything. ' +
  'This client never attempts to solve the task — it exists to prove the pipeline mechanics ' +
  '(harness, verifiers, metrics, reporting, dashboard) reproduce identically across machines, ' +
  'not to measure any context provider\'s quality.';
const DONE_MESSAGE = 'Reproduction smoke agent: no further action — concluding this run.';

/**
 * Zero-cost, zero-network, fully deterministic `LlmClient` for Phase 12's smoke reproduction path
 * (see project-memory-bank/phases/phase-12.md and ADR-017 in 14-decisions.md). Its response is a
 * pure function of `request.messages` — no internal mutable state — so it is safe to reuse across
 * every run in a comparison loop (`runComparisonExperiment.ts` builds one agent/client and reuses
 * it for every task × condition × repetition): before any tool has returned a result, it calls
 * `list_files`; once a tool result is present in the conversation, it concludes with no further
 * tool calls. It never reads or writes fixture content, so it can never be tuned — even by
 * accident — to make one condition look better than another, satisfying the scientific-integrity
 * rule in project-memory-bank/00-project-charter.md by construction rather than by disclaimer.
 */
export class DeterministicFakeLlmClient implements LlmClient {
  readonly providerLabel = 'fake-deterministic';
  readonly model: string;

  constructor(model = 'deterministic-fake-v1') {
    this.model = model;
  }

  complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const hasToolResult = request.messages.some((message) => message.role === 'tool');
    if (hasToolResult) {
      return Promise.resolve({ role: 'assistant', content: DONE_MESSAGE, toolCalls: [] });
    }
    return Promise.resolve({
      role: 'assistant',
      content: EXPLORE_MESSAGE,
      toolCalls: [{ id: 'smoke-list-files', name: 'list_files', arguments: {} }],
    });
  }
}
