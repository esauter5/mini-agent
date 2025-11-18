import { BaseTool } from '../base-tool.js';

/**
 * Tool for editing existing files in the sandbox directory
 */
export class EditFileTool extends BaseTool {
  constructor(sandboxManager) {
    super();
    this.sandboxManager = sandboxManager;
    this.name = 'edit_file';
    this.description = 'Edit an existing file by replacing text. Provide the exact text to find (old_string) and what to replace it with (new_string). If old_string appears multiple times, the edit will fail unless replace_all is true. Include enough context in old_string to make it unique.';
    this.input_schema = {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: "Relative path to the file to edit (e.g., 'notes/ai-research.md')"
        },
        old_string: {
          type: 'string',
          description: 'The exact text to find and replace. Include surrounding context if needed to make it unique.'
        },
        new_string: {
          type: 'string',
          description: 'The text to replace old_string with'
        },
        replace_all: {
          type: 'boolean',
          description: 'If true, replace all occurrences. If false (default), will error if old_string appears multiple times.'
        }
      },
      required: ['path', 'old_string', 'new_string']
    };
  }

  async execute(input) {
    const occurrences = this.sandboxManager.editFile(
      input.path,
      input.old_string,
      input.new_string,
      input.replace_all || false
    );

    const action = input.replace_all ? `Replaced ${occurrences} occurrence(s)` : 'Replaced 1 occurrence';
    return `Success: ${action} in '${input.path}'`;
  }
}
