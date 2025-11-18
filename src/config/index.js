import dotenv from 'dotenv';
import { defaults } from './defaults.js';

dotenv.config();

export const config = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.MODEL || defaults.anthropic.model,
    maxTokens: parseInt(process.env.MAX_TOKENS) || defaults.anthropic.maxTokens,
    thinkingBudget: parseInt(process.env.THINKING_BUDGET) || defaults.anthropic.thinkingBudget,
    systemPrompt: process.env.SYSTEM_PROMPT || defaults.anthropic.systemPrompt
  },
  sandbox: {
    directory: process.env.SANDBOX_DIR || defaults.sandbox.directory
  },
  ui: {
    maxInputLines: parseInt(process.env.MAX_INPUT_LINES) || defaults.ui.maxInputLines,
    pasteThreshold: parseInt(process.env.PASTE_THRESHOLD) || defaults.ui.pasteThreshold,
    pasteDetectionMs: parseInt(process.env.PASTE_DETECTION_MS) || defaults.ui.pasteDetectionMs,
    pasteEndDelayMs: parseInt(process.env.PASTE_END_DELAY_MS) || defaults.ui.pasteEndDelayMs
  },
  tools: {
    webSearch: {
      enabled: process.env.WEB_SEARCH_ENABLED !== 'false', // Enabled by default
      maxUses: parseInt(process.env.WEB_SEARCH_MAX_USES) || defaults.tools.webSearch.maxUses
    }
  }
};

// Validate required config
if (!config.anthropic.apiKey) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required');
}
