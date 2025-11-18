# Mini Agent

A lightweight, modular AI agent framework inspired by Claude Code, built from scratch to experiment with agentic patterns and architectures. This CLI-based agent provides a clean terminal interface and extensible tool system for exploring how AI agents can interact with files, execute tools, and maintain context through conversations.

**Purpose:** A learning-focused implementation for testing different agentic concepts, tool architectures, and interaction patterns with Claude's API.

## Features

- 🤖 Powered by Claude Sonnet 4.5 with extended thinking
- 🔧 Pluggable tool architecture for easy extensibility
- 🎨 Terminal UI with blessed
- 🔒 Sandbox security for file operations
- 💭 Streaming responses with real-time updates
- 🛠️ Built-in debug modes and slash commands

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file with your Anthropic API key:

```env
ANTHROPIC_API_KEY=your_api_key_here
```

See `.env.example` for all available configuration options.

## Usage

```bash
npm start
```

## Slash Commands

The agent supports several slash commands for debugging and configuration:

- `/help` - Show available commands and their descriptions
- `/thinking` - Toggle extended thinking mode (shows Claude's internal reasoning)
- `/tools` - Toggle tools debug mode (shows tool calls with parameters)
- `/debug` - Toggle full debug mode (shows all API requests/responses)

## Architecture

```
mini-agent/
├── src/
│   ├── core/           # Agent runtime and streaming
│   ├── tools/          # Pluggable tool system
│   │   ├── file-tools/ # File operation tools
│   │   └── sandbox/    # Security layer
│   ├── ui/             # Terminal UI components
│   ├── config/         # Configuration management
│   └── utils/          # Utilities and errors
├── sandbox/            # Sandboxed file operations
└── index.js            # Entry point
```

## Available Tools

- **read_file** - Read files from the sandbox directory
- **write_file** - Create new files in the sandbox
- **edit_file** - Edit existing files with find/replace
- **list_files** - List all files in the sandbox

## Adding New Tools

1. Create a new file in `src/tools/` extending `BaseTool`
2. Implement the `execute()` method
3. Register it in `src/tools/index.js`

Example:

```javascript
import { BaseTool } from './base-tool.js';

export class MyTool extends BaseTool {
  constructor() {
    super();
    this.name = 'my_tool';
    this.description = 'Description of what this tool does';
    this.input_schema = {
      type: 'object',
      properties: {
        param: { type: 'string', description: 'Parameter description' }
      },
      required: ['param']
    };
  }

  async execute(input) {
    // Your tool logic here
    return 'Success!';
  }
}
```

## Development

Run tests:
```bash
node test-refactor.js
node test-commands.js
```

## License

MIT
