import blessed from 'blessed';
import { ChatRenderer } from './chat-renderer.js';
import { InputHandler } from './input-handler.js';
import { formatSystem } from './theme.js';

/**
 * Blessed terminal UI for the agent
 */
export class BlessedUI {
  constructor(agent, config) {
    this.agent = agent;
    this.config = config;
    this.debugMode = false;
    this.toolsMode = false;
    this.thinkingMode = false;

    this.setupScreen();
    this.setupChatBox();
    this.setupInputBox();
    this.setupRenderer();
    this.setupInputHandler();
    this.setupCommands();

    this.showWelcome();
  }

  /**
   * Setup the blessed screen
   */
  setupScreen() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'AI Agent Chat',
      fullUnicode: true,
      dockBorders: true
    });

    this.screen.key(['C-c'], () => {
      process.exit(0);
    });

    process.on('SIGINT', () => {
      process.exit(0);
    });
  }

  /**
   * Setup the chat box
   */
  setupChatBox() {
    this.chatBox = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%-3',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      keys: false,
      vi: false,
      mouse: true,
      scrollbar: {
        ch: ' ',
        style: {
          bg: 'blue'
        }
      },
      style: {
        fg: 'white',
        bg: 'black'
      }
    });
  }

  /**
   * Setup the input box
   */
  setupInputBox() {
    this.inputContainer = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 3,
      style: {
        border: {
          fg: 'cyan'
        }
      },
      border: {
        type: 'line'
      }
    });

    this.promptLabel = blessed.text({
      parent: this.inputContainer,
      top: 0,
      left: 1,
      content: '>',
      style: {
        fg: 'cyan',
        bg: 'black'
      }
    });

    this.inputBox = blessed.textarea({
      parent: this.inputContainer,
      top: 0,
      left: 3,
      width: '100%-4',
      height: 1,
      keys: true,
      mouse: true,
      inputOnFocus: true,
      vi: false,
      style: {
        fg: 'white',
        bg: 'black'
      }
    });
  }

  /**
   * Setup the chat renderer
   */
  setupRenderer() {
    this.renderer = new ChatRenderer(this.chatBox, this.screen);
  }

  /**
   * Setup the input handler
   */
  setupInputHandler() {
    this.inputHandler = new InputHandler(
      this.inputBox,
      this.inputContainer,
      this.chatBox,
      this.screen,
      this.config
    );

    // Override the keypress handler to include command processing
    const originalKeypress = this.inputBox.listeners('keypress')[0];
    this.inputBox.removeAllListeners('keypress');

    this.inputBox.on('keypress', async (ch, key) => {
      if (key.name === 'enter' && !key.shift && !key.ctrl && !key.meta && !this.inputHandler.isPasting) {
        const userInput = this.inputBox.getValue().trim();

        if (userInput.toLowerCase() === 'exit') {
          return process.exit(0);
        }

        // Handle commands
        if (await this.handleCommand(userInput)) {
          this.inputBox.clearValue();
          this.inputHandler.adjustHeight();
          this.screen.render();
          return;
        }

        if (!userInput) {
          this.inputBox.clearValue();
          this.inputHandler.adjustHeight();
          this.screen.render();
          return;
        }

        // Clear input and process
        this.inputBox.clearValue();
        this.inputHandler.adjustHeight();
        this.screen.render();

        await this.handleUserMessage(userInput);
        return;
      }

      // Call original handler for other keys
      await originalKeypress.call(this.inputBox, ch, key);
    });
  }

  /**
   * Setup slash commands
   */
  setupCommands() {
    this.commands = {
      '/help': () => {
        this.showHelp();
      },
      '/debug': () => {
        this.debugMode = !this.debugMode;
        this.renderer.addSystemMessage(`Debug mode: ${this.debugMode ? 'ON' : 'OFF'}`);
      },
      '/tools': () => {
        this.toolsMode = !this.toolsMode;
        this.renderer.addSystemMessage(`Tools debug mode: ${this.toolsMode ? 'ON' : 'OFF'}`);
      },
      '/thinking': () => {
        this.thinkingMode = !this.thinkingMode;
        this.renderer.addSystemMessage(`Thinking mode: ${this.thinkingMode ? 'ON' : 'OFF'}`);
      }
    };
  }

  /**
   * Handle a slash command
   */
  async handleCommand(input) {
    const command = this.commands[input];
    if (command) {
      await command();
      return true;
    }
    return false;
  }

  /**
   * Handle a user message
   */
  async handleUserMessage(message) {
    this.renderer.addUserMessage(message);

    const callbacks = {
      onTextUpdate: (text, isThinking, isStart) => {
        // Only show thinking if thinking mode is enabled
        if (isThinking && !this.thinkingMode) {
          return;
        }
        this.renderer.updateAgentResponse(text, isThinking, isStart);
      },
      onToolCall: (name, input) => {
        if (this.toolsMode || this.debugMode) {
          this.renderer.addToolCall(name, input);
        }
      },
      onDebug: (type, data) => {
        if (this.debugMode) {
          this.renderer.addDebug(type, data);
        }
      }
    };

    await this.agent.sendMessage(message, callbacks);
    this.renderer.finalizeResponse(this.thinkingMode);
  }

  /**
   * Show welcome message
   */
  showWelcome() {
    this.renderer.addSystemMessage('AI Agent Chat');
    this.renderer.getContent().push(formatSystem('Type your message and press Enter to send (Shift+Enter for newline). Press Ctrl+C to quit.'));
    this.renderer.getContent().push(formatSystem('Type /help for available commands.'));
    this.renderer.getContent().push('');
    this.renderer.render();
  }

  /**
   * Show help message with available commands
   */
  showHelp() {
    const chatContent = this.renderer.getContent();
    chatContent.push(formatSystem('Available Commands:'));
    chatContent.push('');
    chatContent.push(formatSystem('/help      - Show this help message'));
    chatContent.push(formatSystem('/debug     - Toggle debug mode (shows API requests/responses)'));
    chatContent.push(formatSystem('/tools     - Toggle tools mode (shows tool calls)'));
    chatContent.push(formatSystem('/thinking  - Toggle thinking mode (shows extended thinking)'));
    chatContent.push('');
    this.renderer.render();
  }

  /**
   * Start the UI
   */
  start() {
    this.inputBox.focus();
    this.screen.render();
  }
}
