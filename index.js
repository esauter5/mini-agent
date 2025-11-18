import { config } from './src/config/index.js';
import { ToolRegistry } from './src/tools/index.js';
import { Agent } from './src/core/agent.js';
import { BlessedUI } from './src/ui/blessed-ui.js';

/**
 * Main entry point for the mini-agent application
 */
function main() {
  // Initialize tool registry
  const toolRegistry = new ToolRegistry(config.sandbox.directory);

  // Initialize agent
  const agent = new Agent(config, toolRegistry);

  // Initialize UI
  const ui = new BlessedUI(agent, config);

  // Start the application
  ui.start();
}

// Run the application
main();
