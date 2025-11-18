import { BaseTool } from '../base-tool.js';

/**
 * Tool for creating new files in the sandbox directory
 */
export class WriteFileTool extends BaseTool {
  constructor(sandboxManager) {
    super();
    this.sandboxManager = sandboxManager;
    this.name = 'write_file';
    this.description = 'Create a new file with the given content. Will error if the file already exists. Parent directories will be created automatically if needed.';
    this.input_schema = {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: "Relative path for the new file (e.g., 'notes/new-idea.md', 'journal/2025-01-20.md')"
        },
        content: {
          type: 'string',
          description: 'The content to write to the file'
        }
      },
      required: ['path', 'content']
    };
  }

  async execute(input) {
    this.sandboxManager.writeFile(input.path, input.content);
    return `Success: Created file '${input.path}'`;
  }
}
