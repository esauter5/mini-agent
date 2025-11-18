/**
 * Handles streaming responses from the Anthropic API
 */
export class StreamingHandler {
  constructor() {
    this.fullResponse = [];
    this.currentText = '';
    this.thinkingText = '';
  }

  /**
   * Process a streaming event
   * @param {object} event - The streaming event
   * @param {Function} onTextUpdate - Callback when text updates (text, isThinking)
   * @param {Function} onToolCall - Callback when a tool is called (name, input)
   */
  handleEvent(event, onTextUpdate, onToolCall) {
    if (event.type === 'content_block_start') {
      this.handleBlockStart(event, onTextUpdate, onToolCall);
    } else if (event.type === 'content_block_delta') {
      this.handleBlockDelta(event, onTextUpdate);
    }
  }

  /**
   * Handle content_block_start event
   */
  handleBlockStart(event, onTextUpdate, onToolCall) {
    if (event.content_block.type === 'text') {
      this.fullResponse.push({ type: 'text', text: '' });
      // Notify that agent started responding
      if (this.fullResponse.filter(r => r.type === 'text').length === 1) {
        onTextUpdate && onTextUpdate(this.currentText, false, true);
      }
    } else if (event.content_block.type === 'tool_use') {
      this.fullResponse.push({
        type: 'tool_use',
        id: event.content_block.id,
        name: event.content_block.name,
        input: {}
      });
    } else if (event.content_block.type === 'thinking') {
      this.fullResponse.push({
        type: 'thinking',
        thinking: '',
        signature: null
      });
      // Notify that thinking started
      onTextUpdate && onTextUpdate(this.thinkingText, true, true);
    } else if (event.content_block.type === 'server_tool_use') {
      // Built-in tool use (like web_search)
      this.fullResponse.push({
        type: 'server_tool_use',
        id: event.content_block.id,
        name: event.content_block.name,
        input: event.content_block.input || {}
      });
      // Notify immediately during streaming
      onToolCall && onToolCall(event.content_block.name, event.content_block.input || {});
    } else if (event.content_block.type === 'web_search_tool_result') {
      // Web search results from built-in tool
      this.fullResponse.push({
        type: 'web_search_tool_result',
        tool_use_id: event.content_block.tool_use_id,
        content: event.content_block.content || []
      });
    } else {
      // Unknown block type - create generic placeholder
      this.fullResponse.push({
        type: event.content_block.type,
        data: event.content_block
      });
    }
  }

  /**
   * Handle content_block_delta event
   */
  handleBlockDelta(event, onTextUpdate) {
    const index = event.index;

    // Safety check: ensure the block exists
    if (!this.fullResponse[index]) {
      // Silently ignore deltas for blocks that don't exist yet
      return;
    }

    if (event.delta.type === 'text_delta') {
      this.fullResponse[index].text += event.delta.text;
      this.currentText += event.delta.text;
      onTextUpdate && onTextUpdate(this.currentText, false, false);
    } else if (event.delta.type === 'thinking_delta') {
      this.fullResponse[index].thinking += event.delta.thinking;
      this.thinkingText += event.delta.thinking;
      onTextUpdate && onTextUpdate(this.thinkingText, true, false);
    } else if (event.delta.type === 'signature_delta') {
      this.fullResponse[index].signature = event.delta.signature;
    } else if (event.delta.type === 'input_json_delta') {
      if (!this.fullResponse[index].inputJson) {
        this.fullResponse[index].inputJson = '';
      }
      this.fullResponse[index].inputJson += event.delta.partial_json;
    }
  }

  /**
   * Get the cleaned response blocks
   * @returns {Array<object>} Cleaned response blocks
   */
  getResponse() {
    return this.fullResponse.map(block => {
      if (block.type === 'tool_use') {
        let parsedInput = {};
        if (block.inputJson) {
          try {
            parsedInput = JSON.parse(block.inputJson);
          } catch (e) {
            // If parsing fails, use empty object
          }
        }
        return {
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: parsedInput
        };
      } else if (block.type === 'thinking') {
        // Return thinking block EXACTLY as received - must be unmodified per API docs
        return {
          type: 'thinking',
          thinking: block.thinking,
          signature: block.signature
        };
      } else if (block.type === 'server_tool_use') {
        // Built-in tool use - return as is
        return {
          type: 'server_tool_use',
          id: block.id,
          name: block.name,
          input: block.input
        };
      } else if (block.type === 'web_search_tool_result') {
        // Web search results - MUST be preserved with encrypted content for citations
        return {
          type: 'web_search_tool_result',
          tool_use_id: block.tool_use_id,
          content: block.content
        };
      } else if (block.type === 'text') {
        // Text blocks
        return {
          type: 'text',
          text: block.text || ''
        };
      }

      // Unknown block type - return as is
      return block;
    });
  }

  /**
   * Reset the handler for a new stream
   */
  reset() {
    this.fullResponse = [];
    this.currentText = '';
    this.thinkingText = '';
  }

  /**
   * Check if thinking was included
   */
  hasThinking() {
    return this.thinkingText.length > 0;
  }
}
