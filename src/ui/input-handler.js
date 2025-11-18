/**
 * Handles input box logic including paste detection and multiline input
 */
export class InputHandler {
  constructor(inputBox, inputContainer, chatBox, screen, config) {
    this.inputBox = inputBox;
    this.inputContainer = inputContainer;
    this.chatBox = chatBox;
    this.screen = screen;
    this.config = config;

    this.lastInputTime = Date.now();
    this.inputBuffer = '';
    this.pasteStartIndex = -1;
    this.isPasting = false;

    this.setupEventHandlers();
  }

  /**
   * Setup keyboard event handlers
   */
  setupEventHandlers() {
    this.inputBox.on('keypress', async (ch, key) => {
      await this.handleKeypress(ch, key);
    });

    this.inputBox.key(['C-c'], () => {
      process.exit(0);
    });
  }

  /**
   * Handle keypress events
   */
  async handleKeypress(ch, key) {
    const now = Date.now();
    const timeSinceLastInput = now - this.lastInputTime;
    this.lastInputTime = now;

    // Detect if we're in the middle of a paste (rapid keypresses)
    if (timeSinceLastInput < this.config.ui.pasteDetectionMs) {
      this.isPasting = true;
      clearTimeout(this.inputBox._pasteEndTimeout);
      this.inputBox._pasteEndTimeout = setTimeout(() => {
        this.isPasting = false;
      }, this.config.ui.pasteEndDelayMs);
    }

    // Handle plain Enter to submit (NOT Shift+Enter which adds newline, and NOT during paste)
    if (key.name === 'enter' && !key.shift && !key.ctrl && !key.meta && !this.isPasting) {
      await this.handleSubmit();
      return;
    }

    // Adjust height after any keypress
    setTimeout(() => {
      this.adjustHeight();
    }, 0);

    // Detect paste events (rapid character input)
    if (timeSinceLastInput < this.config.ui.pasteDetectionMs && ch && !key.name) {
      if (this.inputBuffer.length === 0) {
        this.pasteStartIndex = this.inputBox.getValue().length;
      }
      this.inputBuffer += ch;

      clearTimeout(this.inputBox._pasteTimeout);
      this.inputBox._pasteTimeout = setTimeout(() => {
        if (this.inputBuffer.length > this.config.ui.pasteThreshold) {
          const currentValue = this.inputBox.getValue();
          const beforePaste = currentValue.substring(0, this.pasteStartIndex);
          this.inputBox.setValue(beforePaste + `[Content pasted: ${this.inputBuffer.length} characters]`);
          this.adjustHeight();
          this.screen.render();
        }
        this.inputBuffer = '';
        this.pasteStartIndex = -1;
      }, 50);
    } else {
      this.inputBuffer = '';
      this.pasteStartIndex = -1;
    }
  }

  /**
   * Handle input submission
   */
  async handleSubmit() {
    const userInput = this.inputBox.getValue().trim();

    if (!userInput) {
      this.inputBox.clearValue();
      this.adjustHeight();
      this.screen.render();
      return null;
    }

    // Clear input immediately
    this.inputBox.clearValue();
    this.adjustHeight();
    this.screen.render();

    return userInput;
  }

  /**
   * Adjust input box height based on content
   */
  adjustHeight() {
    const content = this.inputBox.getValue();
    const lines = content.split('\n');
    const lineCount = lines.length;

    const maxLines = this.config.ui.maxInputLines;
    const newHeight = Math.min(lineCount + 2, maxLines + 2);

    if (this.inputContainer.height !== newHeight) {
      this.inputContainer.height = newHeight;
      this.inputBox.height = lineCount;
      this.updateChatBoxHeight();
    }
  }

  /**
   * Update chat box height based on input box size
   */
  updateChatBoxHeight() {
    const inputHeight = this.inputContainer.height;
    this.chatBox.height = `100%-${inputHeight}`;
    this.screen.render();
  }

  /**
   * Set callback for when user submits input
   */
  onSubmit(callback) {
    this.submitCallback = callback;
  }

  /**
   * Process submissions
   */
  async processSubmit() {
    const result = await this.handleSubmit();
    if (result && this.submitCallback) {
      await this.submitCallback(result);
    }
  }

  /**
   * Focus the input box
   */
  focus() {
    this.inputBox.focus();
  }
}
