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
 * Format an agent message
 */
export function formatAgentMessage(text) {
  return theme.colors.agent(theme.labels.agent) + text;
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
