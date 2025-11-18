import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import blessed from 'blessed';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SANDBOX_DIR = path.join(__dirname, 'sandbox');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Persistent conversation history
const messages = [];

const tools = [
  {
    name: "read_file",
    description: "Read the contents of a file from the sandbox directory. You can provide just a filename or a relative path like 'notes/ai-research.md'.",
    input_schema: {
      type: "object",
      properties: {
        filename: {
          type: "string",
          description: "The name or relative path of the file to read (e.g., 'notes/ai-research.md', 'recipes/chicken-tacos.md')"
        }
      },
      required: ["filename"]
    }
  },
  {
    name: "list_files",
    description: "List all files and directories in the sandbox. Shows the complete directory structure so you can see what files are available.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "write_file",
    description: "Create a new file with the given content. Will error if the file already exists. Parent directories will be created automatically if needed.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Relative path for the new file (e.g., 'notes/new-idea.md', 'journal/2025-01-20.md')"
        },
        content: {
          type: "string",
          description: "The content to write to the file"
        }
      },
      required: ["path", "content"]
    }
  },
  {
    name: "edit_file",
    description: "Edit an existing file by replacing text. Provide the exact text to find (old_string) and what to replace it with (new_string). If old_string appears multiple times, the edit will fail unless replace_all is true. Include enough context in old_string to make it unique.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Relative path to the file to edit (e.g., 'notes/ai-research.md')"
        },
        old_string: {
          type: "string",
          description: "The exact text to find and replace. Include surrounding context if needed to make it unique."
        },
        new_string: {
          type: "string",
          description: "The text to replace old_string with"
        },
        replace_all: {
          type: "boolean",
          description: "If true, replace all occurrences. If false (default), will error if old_string appears multiple times."
        }
      },
      required: ["path", "old_string", "new_string"]
    }
  }
];

function executeTool(name, input) {
  if (name === "read_file") {
    try {
      // Normalize path and prevent traversal attacks
      const filename = path.normalize(input.filename).replace(/^(\.\.[\/\\])+/, '');
      const filePath = path.join(SANDBOX_DIR, filename);

      // Verify the resolved path is still within sandbox
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(path.resolve(SANDBOX_DIR))) {
        return "Error: Access denied. Can only read files in the sandbox directory.";
      }

      // Check if file exists
      if (!fs.existsSync(resolvedPath)) {
        return `Error: File '${filename}' not found in sandbox directory.`;
      }

      // Read and return file contents
      const contents = fs.readFileSync(resolvedPath, 'utf-8');
      return contents;
    } catch (error) {
      return `Error reading file: ${error.message}`;
    }
  } else if (name === "list_files") {
    try {
      // Recursively walk directory and build file list
      function walkDir(dir, baseDir = dir) {
        let results = [];
        const list = fs.readdirSync(dir);

        list.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          const relativePath = path.relative(baseDir, filePath);

          if (stat.isDirectory()) {
            results.push({ type: 'directory', path: relativePath });
            results = results.concat(walkDir(filePath, baseDir));
          } else {
            results.push({ type: 'file', path: relativePath });
          }
        });

        return results;
      }

      const items = walkDir(SANDBOX_DIR);

      // Format output nicely
      let output = "Files in sandbox:\n\n";

      // Group by directory
      const byDirectory = {};
      items.forEach(item => {
        const dir = path.dirname(item.path);
        const dirname = dir === '.' ? '(root)' : dir;
        if (!byDirectory[dirname]) {
          byDirectory[dirname] = [];
        }
        if (item.type === 'file') {
          byDirectory[dirname].push(path.basename(item.path));
        }
      });

      // Build formatted output
      Object.keys(byDirectory).sort().forEach(dir => {
        output += `${dir}/\n`;
        byDirectory[dir].forEach(file => {
          output += `  - ${file}\n`;
        });
        output += '\n';
      });

      return output.trim();
    } catch (error) {
      return `Error listing files: ${error.message}`;
    }
  } else if (name === "write_file") {
    try {
      // Normalize path and prevent traversal attacks
      const filename = path.normalize(input.path).replace(/^(\.\.[\/\\])+/, '');
      const filePath = path.join(SANDBOX_DIR, filename);

      // Verify the resolved path is still within sandbox
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(path.resolve(SANDBOX_DIR))) {
        return "Error: Access denied. Can only write files in the sandbox directory.";
      }

      // Check if file already exists
      if (fs.existsSync(resolvedPath)) {
        return `Error: File '${filename}' already exists. Use edit_file to modify existing files.`;
      }

      // Create parent directories if needed
      const parentDir = path.dirname(resolvedPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      // Write the file
      fs.writeFileSync(resolvedPath, input.content, 'utf-8');
      return `Success: Created file '${filename}'`;
    } catch (error) {
      return `Error writing file: ${error.message}`;
    }
  } else if (name === "edit_file") {
    try {
      // Normalize path and prevent traversal attacks
      const filename = path.normalize(input.path).replace(/^(\.\.[\/\\])+/, '');
      const filePath = path.join(SANDBOX_DIR, filename);

      // Verify the resolved path is still within sandbox
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(path.resolve(SANDBOX_DIR))) {
        return "Error: Access denied. Can only edit files in the sandbox directory.";
      }

      // Check if file exists
      if (!fs.existsSync(resolvedPath)) {
        return `Error: File '${filename}' not found. Use write_file to create new files.`;
      }

      // Read current contents
      const contents = fs.readFileSync(resolvedPath, 'utf-8');

      // Check if old_string exists
      if (!contents.includes(input.old_string)) {
        return `Error: Could not find the specified text in '${filename}'. Make sure old_string exactly matches the text in the file.`;
      }

      // Count occurrences
      const occurrences = (contents.match(new RegExp(input.old_string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

      // If multiple occurrences and not replace_all, error
      if (occurrences > 1 && !input.replace_all) {
        return `Error: The text appears ${occurrences} times in '${filename}'. Either:\n1. Include more context in old_string to make it unique\n2. Set replace_all to true to replace all occurrences`;
      }

      // Perform replacement
      let newContents;
      if (input.replace_all) {
        newContents = contents.replaceAll(input.old_string, input.new_string);
      } else {
        newContents = contents.replace(input.old_string, input.new_string);
      }

      // Write updated contents
      fs.writeFileSync(resolvedPath, newContents, 'utf-8');

      const action = input.replace_all ? `Replaced ${occurrences} occurrence(s)` : 'Replaced 1 occurrence';
      return `Success: ${action} in '${filename}'`;
    } catch (error) {
      return `Error editing file: ${error.message}`;
    }
  }
}

async function runAgent(userMessage, chatBox, chatContent, inputBox, screen, debugMode = false, toolsMode = false) {
  // Display user message
  chatContent.push(chalk.green("You: ") + userMessage);
  chatContent.push("");
  chatBox.setContent(chatContent.join("\n"));
  chatBox.setScrollPerc(100);
  screen.render();

  // Add user message to conversation history
  const userMsg = { role: "user", content: userMessage };

  if (debugMode) {
    chatContent.push(chalk.gray("→ Adding to messages:"));
    chatContent.push(chalk.gray(JSON.stringify(userMsg, null, 2)));
    chatContent.push("");
    chatBox.setContent(chatContent.join("\n"));
    chatBox.setScrollPerc(100);
    screen.render();
  }

  messages.push(userMsg);

  while (true) {
    // Log outgoing request
    if (debugMode) {
      chatContent.push(chalk.gray("→ Sending to API:"));
      chatContent.push(chalk.gray(JSON.stringify({ messages }, null, 2)));
      chatContent.push("");
      chatBox.setContent(chatContent.join("\n"));
      chatBox.setScrollPerc(100);
      screen.render();
    }

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      thinking: {
        type: "enabled",
        budget_tokens: 3000
      },
      tools: tools,
      messages: messages
    });

    let fullResponse = [];
    let currentText = "";
    let thinkingText = "";
    let thinkingLineIdx = null;
    let agentLineIdx = null;

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'text') {
          fullResponse.push({ type: 'text', text: '' });
          // Add agent label only when first text block starts
          if (agentLineIdx === null) {
            agentLineIdx = chatContent.length;
            chatContent.push(chalk.cyan("Agent: "));
          }
        } else if (event.content_block.type === 'tool_use') {
          fullResponse.push({
            type: 'tool_use',
            id: event.content_block.id,
            name: event.content_block.name,
            input: {}
          });
        } else if (event.content_block.type === 'thinking') {
          fullResponse.push({
            type: 'thinking',
            thinking: '',
            signature: null  // Will be populated by signature_delta event
          });
          // Add thinking label
          thinkingLineIdx = chatContent.length;
          chatContent.push(chalk.gray("[Thinking...] "));
        }
      } else if (event.type === 'content_block_delta') {
        const index = event.index;
        if (event.delta.type === 'text_delta') {
          fullResponse[index].text += event.delta.text;
          currentText += event.delta.text;

          // Update the agent line
          if (agentLineIdx !== null) {
            chatContent[agentLineIdx] = chalk.cyan("Agent: ") + currentText;
            chatBox.setContent(chatContent.join("\n"));
            chatBox.setScrollPerc(100);
            screen.render();
          }
        } else if (event.delta.type === 'thinking_delta') {
          fullResponse[index].thinking += event.delta.thinking;
          thinkingText += event.delta.thinking;

          // Update thinking line
          if (thinkingLineIdx !== null) {
            chatContent[thinkingLineIdx] = chalk.gray("[Thinking...] " + thinkingText);
            chatBox.setContent(chatContent.join("\n"));
            chatBox.setScrollPerc(100);
            screen.render();
          }
        } else if (event.delta.type === 'signature_delta') {
          // Capture the signature for the thinking block
          fullResponse[index].signature = event.delta.signature;
        } else if (event.delta.type === 'input_json_delta') {
          if (!fullResponse[index].inputJson) {
            fullResponse[index].inputJson = '';
          }
          fullResponse[index].inputJson += event.delta.partial_json;
        }
      }
    }

    // Add spacing after thinking if it was shown
    if (thinkingText) {
      chatContent.push("");
    }

    chatContent.push("");

    // Parse tool inputs and clean up (KEEP thinking blocks unmodified per API requirements)
    const cleanedResponse = fullResponse.map(block => {
      if (block.type === 'tool_use') {
        // Parse inputJson if it exists
        let parsedInput = {};
        if (block.inputJson) {
          try {
            parsedInput = JSON.parse(block.inputJson);
          } catch (e) {
            // If parsing fails, use empty object
          }
        }
        // Return clean object with only valid fields
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
      }
      // For text blocks, return as is
      return {
        type: 'text',
        text: block.text || ''
      };
    });

    // Log assistant response
    if (debugMode) {
      chatContent.push(chalk.gray("← Received from API:"));
      chatContent.push(chalk.gray(JSON.stringify({ role: "assistant", content: cleanedResponse }, null, 2)));
      chatContent.push("");
      chatBox.setContent(chatContent.join("\n"));
      chatBox.setScrollPerc(100);
      screen.render();
    }

    messages.push({ role: "assistant", content: cleanedResponse });

    const toolCalls = cleanedResponse.filter(c => c.type === 'tool_use');

    if (toolCalls.length === 0) {
      break;
    }

    // Display and execute tools
    const toolResults = [];
    for (const toolCall of toolCalls) {
      // Show tool call in gray (if tools mode or debug mode is on)
      if (toolsMode || debugMode) {
        const inputStr = Object.keys(toolCall.input).length > 0
          ? JSON.stringify(toolCall.input)
          : '()';
        chatContent.push(chalk.gray(`[calling ${toolCall.name}${inputStr !== '()' ? ' with ' + inputStr : inputStr}]`));
        chatBox.setContent(chatContent.join("\n"));
        chatBox.setScrollPerc(100);
        screen.render();
      }

      const result = executeTool(toolCall.name, toolCall.input);
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolCall.id,
        content: result
      });
    }

    // Log tool results being sent back
    if (debugMode) {
      chatContent.push(chalk.gray("→ Sending tool results to API:"));
      chatContent.push(chalk.gray(JSON.stringify({ role: "user", content: toolResults }, null, 2)));
      chatContent.push("");
      chatBox.setContent(chatContent.join("\n"));
      chatBox.setScrollPerc(100);
      screen.render();
    }

    messages.push({ role: "user", content: toolResults });
  }

  // Input is re-enabled by startInput() in the caller
}

// Interactive chat loop with blessed UI
function startChat() {
  let debugMode = false; // Debug mode starts off
  let toolsMode = false; // Tools debug mode starts off

  const screen = blessed.screen({
    smartCSR: true,
    title: 'AI Agent Chat',
    fullUnicode: true,
    dockBorders: true
  });

  // Function to update chat box height based on input box size
  function updateChatBoxHeight() {
    const inputHeight = inputContainer.height;
    chatBox.height = `100%-${inputHeight}`;
    screen.render();
  }

  // Chat history box (scrollable) - height adjusts based on input
  const chatBox = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%-3',
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    keys: false,  // Disable key handling on chat box to prevent vim mode interference
    vi: false,    // Disable vi mode
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

  let chatContent = [];

  // Input container with border at bottom - starts at height 3, will grow dynamically
  const inputContainer = blessed.box({
    parent: screen,
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

  // Prompt label
  const promptLabel = blessed.text({
    parent: inputContainer,
    top: 0,
    left: 1,
    content: '>',
    style: {
      fg: 'cyan',
      bg: 'black'
    }
  });

  // Input box (without border, inside container) - multiline support
  const inputBox = blessed.textarea({
    parent: inputContainer,
    top: 0,
    left: 3,
    width: '100%-4',
    height: 1,
    keys: true,
    mouse: true,
    inputOnFocus: true,
    vi: false,  // CRITICAL: disable vim mode
    style: {
      fg: 'white',
      bg: 'black'
    }
  });

  // Function to adjust input box height based on content
  function adjustInputHeight() {
    const content = inputBox.getValue();
    const lines = content.split('\n');
    const lineCount = lines.length;

    // Calculate height needed (each line + borders = lineCount + 2)
    // Max out at 10 lines to prevent taking over whole screen
    const maxLines = 10;
    const newHeight = Math.min(lineCount + 2, maxLines + 2);

    if (inputContainer.height !== newHeight) {
      inputContainer.height = newHeight;
      inputBox.height = lineCount;
      updateChatBoxHeight();
    }
  }

  // Handle all keypress events in one place
  let lastInputTime = Date.now();
  let inputBuffer = '';
  let pasteStartIndex = -1;
  let isPasting = false;

  inputBox.on('keypress', async function(ch, key) {
    const now = Date.now();
    const timeSinceLastInput = now - lastInputTime;
    lastInputTime = now;

    // Detect if we're in the middle of a paste (rapid keypresses)
    if (timeSinceLastInput < 10) {
      isPasting = true;
      clearTimeout(inputBox._pasteEndTimeout);
      inputBox._pasteEndTimeout = setTimeout(() => {
        isPasting = false;
      }, 100);
    }

    // Handle plain Enter to submit (NOT Shift+Enter which adds newline, and NOT during paste)
    if (key.name === 'enter' && !key.shift && !key.ctrl && !key.meta && !isPasting) {
      const userInput = inputBox.getValue().trim();

      if (userInput.toLowerCase() === 'exit') {
        return process.exit(0);
      }

      // Handle /debug command
      if (userInput === '/debug') {
        debugMode = !debugMode;
        const status = debugMode ? 'ON' : 'OFF';
        chatContent.push(chalk.yellow(`Debug mode: ${status}`));
        chatContent.push("");
        chatBox.setContent(chatContent.join("\n"));
        chatBox.setScrollPerc(100);
        screen.render();
        inputBox.clearValue();
        adjustInputHeight(); // Reset height after clear
        screen.render();
        return;
      }

      // Handle /tools command
      if (userInput === '/tools') {
        toolsMode = !toolsMode;
        const status = toolsMode ? 'ON' : 'OFF';
        chatContent.push(chalk.yellow(`Tools debug mode: ${status}`));
        chatContent.push("");
        chatBox.setContent(chatContent.join("\n"));
        chatBox.setScrollPerc(100);
        screen.render();
        inputBox.clearValue();
        adjustInputHeight(); // Reset height after clear
        screen.render();
        return;
      }

      if (!userInput) {
        // Just clear if empty
        inputBox.clearValue();
        adjustInputHeight(); // Reset height after clear
        screen.render();
        return;
      }

      // Clear input immediately after sending
      inputBox.clearValue();
      adjustInputHeight(); // Reset height after clear
      screen.render();

      // Run agent (input stays enabled so user can type next message)
      await runAgent(userInput, chatBox, chatContent, inputBox, screen, debugMode, toolsMode);
      return;
    }

    // Adjust height after any keypress (for shift+enter, backspace, etc.)
    // Use setTimeout to let the textarea update first
    setTimeout(() => {
      adjustInputHeight();
    }, 0);

    // Detect paste events (rapid character input)
    if (timeSinceLastInput < 10 && ch && !key.name) {
      if (inputBuffer.length === 0) {
        // Mark where paste started
        pasteStartIndex = inputBox.getValue().length;
      }
      inputBuffer += ch;

      // After a paste, there will be a delay before next keypress
      clearTimeout(inputBox._pasteTimeout);
      inputBox._pasteTimeout = setTimeout(() => {
        if (inputBuffer.length > 50) {
          // This was a paste - replace with placeholder
          const currentValue = inputBox.getValue();
          const beforePaste = currentValue.substring(0, pasteStartIndex);
          inputBox.setValue(beforePaste + `[Content pasted: ${inputBuffer.length} characters]`);
          adjustInputHeight(); // Adjust height after replacing with placeholder
          screen.render();
        }
        inputBuffer = '';
        pasteStartIndex = -1;
      }, 50);
    } else {
      inputBuffer = '';
      pasteStartIndex = -1;
    }
  });

  // Handle Ctrl+C in the input box
  inputBox.key(['C-c'], function() {
    process.exit(0);
  });

  // Initialize - just focus, don't use readInput
  inputBox.focus();
  screen.render();

  // Disable all screen-level key bindings except those we explicitly want
  screen.key(['C-c'], function() {
    process.exit(0);
  });

  process.on('SIGINT', function() {
    process.exit(0);
  });

  // Display welcome message
  chatContent.push(chalk.yellow("AI Agent Chat"));
  chatContent.push(chalk.gray("Type your message and press Enter to send (Shift+Enter for newline). Press Ctrl+C to quit."));
  chatContent.push("");
  chatBox.setContent(chatContent.join("\n"));
  screen.render();
}

// Start the interactive chat
startChat();
