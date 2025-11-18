import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const defaults = {
  anthropic: {
    model: 'claude-sonnet-4-5-20250929',
    maxTokens: 4096,
    thinkingBudget: 3000
  },
  sandbox: {
    directory: path.join(path.dirname(__dirname), '..', 'sandbox')
  },
  ui: {
    maxInputLines: 10,
    pasteThreshold: 50,
    pasteDetectionMs: 10,
    pasteEndDelayMs: 100
  }
};
