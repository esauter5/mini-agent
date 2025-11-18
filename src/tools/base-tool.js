import { ToolExecutionError } from '../utils/errors.js';

/**
 * Abstract base class for all tools.
 * Provides a consistent interface and error handling.
 */
export class BaseTool {
  constructor() {
    if (new.target === BaseTool) {
      throw new Error('BaseTool is abstract and cannot be instantiated directly');
    }

    this.name = '';
    this.description = '';
    this.input_schema = {
      type: 'object',
      properties: {},
      required: []
    };
  }

  /**
   * Get the tool definition for the Anthropic API
   * @returns {{name: string, description: string, input_schema: object}}
   */
  getDefinition() {
    return {
      name: this.name,
      description: this.description,
      input_schema: this.input_schema
    };
  }

  /**
   * Execute the tool with the given input
   * @param {object} input - The tool input parameters
   * @returns {Promise<string>|string} The tool result
   */
  async execute(input) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Validate tool input against schema
   * @param {object} input - The input to validate
   * @throws {ToolExecutionError} If validation fails
   */
  validate(input) {
    const required = this.input_schema.required || [];
    for (const field of required) {
      if (!(field in input)) {
        throw new ToolExecutionError(`Missing required field: ${field}`);
      }
    }
  }

  /**
   * Safe execution wrapper with error handling
   * @param {object} input - The tool input parameters
   * @returns {Promise<string>} The tool result or error message
   */
  async safeExecute(input) {
    try {
      this.validate(input);
      const result = await this.execute(input);
      return result;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }
}
