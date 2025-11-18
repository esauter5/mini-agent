import { BaseTool } from '../base-tool.js';

/**
 * Tool for listing all files in the sandbox directory
 */
export class ListFilesTool extends BaseTool {
  constructor(sandboxManager) {
    super();
    this.sandboxManager = sandboxManager;
    this.name = 'list_files';
    this.description = 'List all files and directories in the sandbox. Shows the complete directory structure so you can see what files are available.';
    this.input_schema = {
      type: 'object',
      properties: {},
      required: []
    };
  }

  async execute(input) {
    return this.sandboxManager.formatFileList();
  }
}
