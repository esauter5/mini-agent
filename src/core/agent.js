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
        thinking: {
          type: 'enabled',
          budget_tokens: this.config.anthropic.thinkingBudget
        },
        tools: this.toolRegistry.getDefinitions(),
        messages: this.messages
      });

      // Handle streaming response
      const streamHandler = new StreamingHandler();

      for await (const event of stream) {
        streamHandler.handleEvent(event, onTextUpdate);
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

        const result = await this.toolRegistry.execute(toolCall.name, toolCall.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: result
        });
      }

      // Send tool results back
      onDebug && onDebug('tool_results', { role: 'user', content: toolResults });
      this.messages.push({ role: 'user', content: toolResults });
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
