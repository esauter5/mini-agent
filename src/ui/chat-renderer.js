import { formatUserMessage, formatAgentMessage, formatThinking, formatToolCall, formatSystem, formatDebug } from './theme.js';

/**
 * Manages rendering of chat messages to the blessed UI
 */
export class ChatRenderer {
  constructor(chatBox, screen) {
    this.chatBox = chatBox;
    this.screen = screen;
    this.chatContent = [];
    this.thinkingLineIdx = null;
    this.agentLineIdx = null;
  }

  /**
   * Add a user message
   */
  addUserMessage(message) {
    this.chatContent.push(formatUserMessage(message));
    this.chatContent.push('');
    this.render();
  }

  /**
   * Update agent response (streaming)
   */
  updateAgentResponse(text, isThinking, isStart) {
    if (isThinking) {
      if (isStart) {
        this.thinkingLineIdx = this.chatContent.length;
        this.chatContent.push(formatThinking(''));
      }
      if (this.thinkingLineIdx !== null) {
        this.chatContent[this.thinkingLineIdx] = formatThinking(text);
      }
    } else {
      if (isStart) {
        this.agentLineIdx = this.chatContent.length;
        this.chatContent.push(formatAgentMessage(''));
      }
      if (this.agentLineIdx !== null) {
        this.chatContent[this.agentLineIdx] = formatAgentMessage(text);
      }
    }
    this.render();
  }

  /**
   * Finalize the current response
   */
  finalizeResponse(hasThinking) {
    if (hasThinking) {
      this.chatContent.push('');
    }
    this.chatContent.push('');
    this.thinkingLineIdx = null;
    this.agentLineIdx = null;
    this.render();
  }

  /**
   * Add a tool call message
   */
  addToolCall(name, input) {
    this.chatContent.push(formatToolCall(name, input));
    this.render();
  }

  /**
   * Add a system message
   */
  addSystemMessage(message) {
    this.chatContent.push(formatSystem(message));
    this.chatContent.push('');
    this.render();
  }

  /**
   * Add debug information
   */
  addDebug(label, data) {
    this.chatContent.push(formatDebug(`→ ${label}:`));
    this.chatContent.push(formatDebug(JSON.stringify(data, null, 2)));
    this.chatContent.push('');
    this.render();
  }

  /**
   * Render the chat content to the screen
   */
  render() {
    this.chatBox.setContent(this.chatContent.join('\n'));
    this.chatBox.setScrollPerc(100);
    this.screen.render();
  }

  /**
   * Get the chat content array (for external manipulation)
   */
  getContent() {
    return this.chatContent;
  }
}
