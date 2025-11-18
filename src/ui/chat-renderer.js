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
    this.spinnerLineIdx = null;
    this.spinnerInterval = null;
    this.spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.spinnerFrame = 0;
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
      // If starting and we don't have an agent line yet, create one
      // (This handles the case where spinner wasn't shown)
      if (isStart && this.agentLineIdx === null) {
        this.agentLineIdx = this.chatContent.length;
        this.chatContent.push(formatAgentMessage(''));
      }
      // Update the agent line (either from spinner or newly created)
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
   * Start an animated spinner with a message
   */
  startSpinner(message) {
    // Stop any existing spinner
    this.stopSpinner();

    // Create agent line for spinner
    this.agentLineIdx = this.chatContent.length;
    this.chatContent.push('');
    this.spinnerFrame = 0;

    // Animate the spinner on the agent line
    this.spinnerInterval = setInterval(() => {
      const frame = this.spinnerFrames[this.spinnerFrame];
      // Format as agent message with spinner
      this.chatContent[this.agentLineIdx] = formatAgentMessage(`${frame} ${message}`);
      this.render();
      this.spinnerFrame = (this.spinnerFrame + 1) % this.spinnerFrames.length;
    }, 80);
  }

  /**
   * Stop the spinner
   */
  stopSpinner() {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
    }
    // Note: We don't remove the line anymore - it will be reused for the agent response
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
