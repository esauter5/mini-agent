import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const defaults = {
  anthropic: {
    model: 'claude-sonnet-4-5-20250929',
    maxTokens: 4096,
    thinkingBudget: 3000,
    systemPrompt: `You are a friendly and curious AI assistant. Engage naturally with users, ask clarifying questions when needed, and use available tools thoughtfully. Keep responses concise but thorough.

Today's date is {DATE}.`
  },
  sandbox: {
    directory: path.join(path.dirname(__dirname), '..', 'sandbox')
  },
  ui: {
    maxInputLines: 10,
    pasteThreshold: 50,
    pasteDetectionMs: 10,
    pasteEndDelayMs: 100
  },
  tools: {
    webSearch: {
      enabled: true,
      maxUses: 5
    }
  }
};
