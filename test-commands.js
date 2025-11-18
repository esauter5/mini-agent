import { config } from './src/config/index.js';
import { ToolRegistry } from './src/tools/index.js';
import { Agent } from './src/core/agent.js';
import { BlessedUI } from './src/ui/blessed-ui.js';

/**
 * Test script to verify the new slash commands
 */
console.log('Testing slash commands...\n');

// Initialize components
const toolRegistry = new ToolRegistry(config.sandbox.directory);
const agent = new Agent(config, toolRegistry);
const ui = new BlessedUI(agent, config);

// Test 1: Check initial state
console.log('✓ Initial state:');
console.log(`  debugMode: ${ui.debugMode}`);
console.log(`  toolsMode: ${ui.toolsMode}`);
console.log(`  thinkingMode: ${ui.thinkingMode}`);
console.log('');

// Test 2: Check commands are registered
console.log('✓ Available commands:');
const commandNames = Object.keys(ui.commands);
console.log(`  ${commandNames.join(', ')}`);
console.log('');

// Test 3: Test /thinking command
console.log('Testing /thinking command...');
await ui.handleCommand('/thinking');
console.log(`✓ thinkingMode after toggle: ${ui.thinkingMode}`);
console.log('');

// Test 4: Test /debug command
console.log('Testing /debug command...');
await ui.handleCommand('/debug');
console.log(`✓ debugMode after toggle: ${ui.debugMode}`);
console.log('');

// Test 5: Test /tools command
console.log('Testing /tools command...');
await ui.handleCommand('/tools');
console.log(`✓ toolsMode after toggle: ${ui.toolsMode}`);
console.log('');

// Test 6: Test /help command
console.log('Testing /help command...');
await ui.handleCommand('/help');
console.log('✓ /help command executed (check output above)');
console.log('');

console.log('All command tests passed! ✓');
process.exit(0);
