import Anthropic from '@anthropic-ai/sdk';
import { StreamingHandler } from './streaming-handler.js';

/**
 * Core agent that handles conversation with Claude
 */
export class Agent {
  constructor(config, toolRegistry) {
    this.config = config;
    this.toolRegistry = toolRegistry;
    this.client = new Anthropic({ apiKey: config.anthropic.apiKey });
    this.messages = [];
  }

  /**
   * Build the tools array including custom and built-in tools
   * @returns {Array} Tools array for the API
   */
  getTools() {
    const tools = [...this.toolRegistry.getDefinitions()];

    // Add built-in web search if enabled
    if (this.config.tools.webSearch.enabled) {
      tools.push({
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: this.config.tools.webSearch.maxUses
      });
    }

    return tools;
  }

  /**
   * Build the system prompt with current date
   * @returns {string} System prompt with date inserted
   */
  getSystemPrompt() {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return this.config.anthropic.systemPrompt.replace('{DATE}', today);
  }

  /**
   * Send a message and get a response
   * @param {string} userMessage - The user's message
   * @param {object} callbacks - Callbacks for streaming updates
   * @param {Function} callbacks.onTextUpdate - Called when text updates (text, isThinking, isStart)
   * @param {Function} callbacks.onToolCall - Called when a tool is called (toolName, input)
   * @param {Function} callbacks.onDebug - Called with debug info (type, data)
   * @returns {Promise<string>} The final response text
   */
  async sendMessage(userMessage, callbacks = {}) {
    const { onTextUpdate, onToolCall, onDebug } = callbacks;

    // Add user message to history
    const userMsg = { role: 'user', content: userMessage };
    onDebug && onDebug('outgoing', userMsg);
    this.messages.push(userMsg);

    let finalText = '';

    while (true) {
      // Send request to API
      onDebug && onDebug('request', { messages: this.messages });

      const stream = await this.client.messages.stream({
        model: this.config.anthropic.model,
        max_tokens: this.config.anthropic.maxTokens,
        system: this.getSystemPrompt(),
        thinking: {
          type: 'enabled',
          budget_tokens: this.config.anthropic.thinkingBudget
        },
        tools: this.getTools(),
        messages: this.messages
      });

      // Handle streaming response
      const streamHandler = new StreamingHandler();

      for await (const event of stream) {
        streamHandler.handleEvent(event, onTextUpdate, onToolCall);
      }

      // Get cleaned response
      const response = streamHandler.getResponse();
      onDebug && onDebug('response', { role: 'assistant', content: response });

      // Add to message history
      this.messages.push({ role: 'assistant', content: response });

      // Extract text and tool calls
      const textBlocks = response.filter(c => c.type === 'text');
      if (textBlocks.length > 0) {
        finalText = textBlocks.map(b => b.text).join('');
      }

      const toolCalls = response.filter(c => c.type === 'tool_use');

      // If no tool calls, we're done
      if (toolCalls.length === 0) {
        break;
      }

      // Execute tools
      const toolResults = [];
      for (const toolCall of toolCalls) {
        onToolCall && onToolCall(toolCall.name, toolCall.input);

        // Built-in tools (like web_search_20250305) are executed server-side by Anthropic
        // Only execute custom tools from our registry
        if (!toolCall.name.startsWith('web_search')) {
          const result = await this.toolRegistry.execute(toolCall.name, toolCall.input);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolCall.id,
            content: result
          });
        }
        // For built-in tools, results are automatically included by the API
      }

      // Send tool results back (only if we have custom tool results)
      if (toolResults.length > 0) {
        onDebug && onDebug('tool_results', { role: 'user', content: toolResults });
        this.messages.push({ role: 'user', content: toolResults });
      }
    }

    return finalText;
  }

  /**
   * Get conversation history
   * @returns {Array<object>}
   */
  getMessages() {
    return this.messages;
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.messages = [];
  }
}
