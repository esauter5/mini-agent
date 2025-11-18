import { BaseTool } from '../base-tool.js';

/**
 * Tool for reading files from the sandbox directory
 */
export class ReadFileTool extends BaseTool {
  constructor(sandboxManager) {
    super();
    this.sandboxManager = sandboxManager;
    this.name = 'read_file';
    this.description = "Read the contents of a file from the sandbox directory. You can provide just a filename or a relative path like 'notes/ai-research.md'.";
    this.input_schema = {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: "The name or relative path of the file to read (e.g., 'notes/ai-research.md', 'recipes/chicken-tacos.md')"
        }
      },
      required: ['filename']
    };
  }

  async execute(input) {
    return this.sandboxManager.readFile(input.filename);
  }
}
