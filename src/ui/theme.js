import chalk from 'chalk';

/**
 * UI theme and styling configuration
 */
export const theme = {
  colors: {
    user: chalk.green,
    agent: chalk.cyan,
    thinking: chalk.gray,
    tool: chalk.gray,
    system: chalk.yellow,
    debug: chalk.gray,
    prompt: chalk.cyan
  },

  labels: {
    user: 'You: ',
    agent: 'Agent: ',
    thinking: '[Thinking...] '
  }
};

/**
 * Format a user message
 */
export function formatUserMessage(text) {
  return theme.colors.user(theme.labels.user) + text;
}

/**
 * Convert markdown to blessed tags
 */
function markdownToBlessedTags(text) {
  return text
    // Bold: **text** or __text__ -> {bold}text{/bold}
    .replace(/\*\*(.+?)\*\*/g, '{bold}$1{/bold}')
    .replace(/__(.+?)__/g, '{bold}$1{/bold}')
    // Italic: *text* or _text_ -> {italic}$1{/italic}
    .replace(/\*(.+?)\*/g, '{italic}$1{/italic}')
    .replace(/_(.+?)_/g, '{italic}$1{/italic}')
    // Headings: ## -> cyan color
    .replace(/^(#{1,6})\s+(.+)$/gm, '{cyan-fg}{bold}$2{/bold}{/cyan-fg}')
    // Code blocks: `code` -> gray background
    .replace(/`([^`]+)`/g, '{gray-bg}{black-fg} $1 {/black-fg}{/gray-bg}');
}

/**
 * Format an agent message
 */
export function formatAgentMessage(text) {
  const formattedText = markdownToBlessedTags(text);
  return theme.colors.agent(theme.labels.agent) + formattedText;
}

/**
 * Format thinking text
 */
export function formatThinking(text) {
  return theme.colors.thinking(theme.labels.thinking + text);
}

/**
 * Format a tool call
 */
export function formatToolCall(name, input) {
  const inputStr = Object.keys(input).length > 0
    ? JSON.stringify(input)
    : '()';
  return theme.colors.tool(`[calling ${name}${inputStr !== '()' ? ' with ' + inputStr : inputStr}]`);
}

/**
 * Format a system message
 */
export function formatSystem(text) {
  return theme.colors.system(text);
}

/**
 * Format debug information
 */
export function formatDebug(text) {
  return theme.colors.debug(text);
}
