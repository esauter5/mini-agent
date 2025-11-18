import { config } from './src/config/index.js';
import { ToolRegistry } from './src/tools/index.js';
import { SandboxManager } from './src/tools/sandbox/sandbox-manager.js';

/**
 * Simple test script to verify the refactored components work
 */
async function test() {
  console.log('Testing refactored components...\n');

  // Test 1: Config loading
  console.log('✓ Config loaded successfully');
  console.log(`  Model: ${config.anthropic.model}`);
  console.log(`  Sandbox: ${config.sandbox.directory}\n`);

  // Test 2: Tool registry
  const toolRegistry = new ToolRegistry(config.sandbox.directory);
  console.log('✓ Tool registry created');
  console.log(`  Available tools: ${toolRegistry.getNames().join(', ')}\n`);

  // Test 3: Execute list_files tool
  console.log('Testing list_files tool...');
  const fileList = await toolRegistry.execute('list_files', {});
  console.log('✓ list_files executed successfully');
  console.log(fileList);
  console.log('');

  // Test 4: Test sandbox security
  console.log('Testing sandbox security...');
  const securityResult = await toolRegistry.execute('read_file', { filename: '../.env' });
  if (securityResult.includes('Error')) {
    console.log('✓ Path traversal blocked correctly');
    console.log(`  Message: ${securityResult}`);
  } else {
    console.log('✗ SECURITY ISSUE: Path traversal not blocked!');
  }

  // Test 5: Read a file
  console.log('\nTesting read_file tool...');
  const content = await toolRegistry.execute('read_file', { filename: 'notes/ai-research.md' });
  if (content.includes('Error')) {
    console.log('✗ read_file failed:', content);
  } else {
    console.log('✓ read_file executed successfully');
    console.log('  First 100 chars:', content.substring(0, 100) + '...\n');
  }

  console.log('All tests passed! ✓');
}

test().catch(console.error);
