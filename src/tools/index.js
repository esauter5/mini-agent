import { SandboxManager } from './sandbox/sandbox-manager.js';
import { ReadFileTool } from './file-tools/read-file.js';
import { WriteFileTool } from './file-tools/write-file.js';
import { EditFileTool } from './file-tools/edit-file.js';
import { ListFilesTool } from './file-tools/list-files.js';

/**
 * Tool registry that manages all available tools
 */
export class ToolRegistry {
  constructor(sandboxDir) {
    this.sandboxManager = new SandboxManager(sandboxDir);
    this.tools = new Map();
    this.registerDefaultTools();
  }

  /**
   * Register all default tools
   */
  registerDefaultTools() {
    this.register(new ReadFileTool(this.sandboxManager));
    this.register(new WriteFileTool(this.sandboxManager));
    this.register(new EditFileTool(this.sandboxManager));
    this.register(new ListFilesTool(this.sandboxManager));
  }

  /**
   * Register a tool
   * @param {BaseTool} tool - The tool instance to register
   */
  register(tool) {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get a tool by name
   * @param {string} name - The tool name
   * @returns {BaseTool|undefined}
   */
  get(name) {
    return this.tools.get(name);
  }

  /**
   * Get all tool definitions for the Anthropic API
   * @returns {Array<{name: string, description: string, input_schema: object}>}
   */
  getDefinitions() {
    return Array.from(this.tools.values()).map(tool => tool.getDefinition());
  }

  /**
   * Execute a tool by name
   * @param {string} name - The tool name
   * @param {object} input - The tool input
   * @returns {Promise<string>} The tool result
   */
  async execute(name, input) {
    const tool = this.get(name);
    if (!tool) {
      return `Error: Unknown tool '${name}'`;
    }
    return await tool.safeExecute(input);
  }

  /**
   * Check if a tool exists
   * @param {string} name - The tool name
   * @returns {boolean}
   */
  has(name) {
    return this.tools.has(name);
  }

  /**
   * Get all tool names
   * @returns {Array<string>}
   */
  getNames() {
    return Array.from(this.tools.keys());
  }
}
