import fs from 'fs';
import path from 'path';
import { SecurityError, FileNotFoundError, FileExistsError } from '../../utils/errors.js';

/**
 * Manages sandbox directory access and enforces security boundaries.
 * All file operations are restricted to the configured sandbox directory.
 */
export class SandboxManager {
  constructor(sandboxDir) {
    this.sandboxDir = path.resolve(sandboxDir);

    // Ensure sandbox directory exists
    if (!fs.existsSync(this.sandboxDir)) {
      fs.mkdirSync(this.sandboxDir, { recursive: true });
    }
  }

  /**
   * Resolves and validates a user-provided path within the sandbox.
   * Prevents path traversal attacks.
   * @param {string} userPath - The user-provided path
   * @returns {string} The absolute, validated path
   * @throws {SecurityError} If path traversal is detected
   */
  resolvePath(userPath) {
    // Normalize path and prevent traversal attacks
    const normalized = path.normalize(userPath).replace(/^(\.\.[\/\\])+/, '');
    const resolved = path.resolve(this.sandboxDir, normalized);

    // Verify the resolved path is still within sandbox
    if (!resolved.startsWith(this.sandboxDir)) {
      throw new SecurityError('Access denied. Can only access files in the sandbox directory.');
    }

    return resolved;
  }

  /**
   * Check if a file exists within the sandbox
   * @param {string} userPath - The user-provided path
   * @returns {boolean}
   */
  exists(userPath) {
    try {
      const resolved = this.resolvePath(userPath);
      return fs.existsSync(resolved);
    } catch (error) {
      return false;
    }
  }

  /**
   * Read a file from the sandbox
   * @param {string} userPath - The user-provided path
   * @returns {string} File contents
   * @throws {SecurityError} If path is outside sandbox
   * @throws {FileNotFoundError} If file doesn't exist
   */
  readFile(userPath) {
    const resolved = this.resolvePath(userPath);

    if (!fs.existsSync(resolved)) {
      throw new FileNotFoundError(`File '${userPath}' not found in sandbox directory.`);
    }

    return fs.readFileSync(resolved, 'utf-8');
  }

  /**
   * Write a new file to the sandbox
   * @param {string} userPath - The user-provided path
   * @param {string} content - Content to write
   * @throws {SecurityError} If path is outside sandbox
   * @throws {FileExistsError} If file already exists
   */
  writeFile(userPath, content) {
    const resolved = this.resolvePath(userPath);

    if (fs.existsSync(resolved)) {
      throw new FileExistsError(`File '${userPath}' already exists. Use edit_file to modify existing files.`);
    }

    // Create parent directories if needed
    const parentDir = path.dirname(resolved);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(resolved, content, 'utf-8');
  }

  /**
   * Edit an existing file in the sandbox
   * @param {string} userPath - The user-provided path
   * @param {string} oldString - Text to find
   * @param {string} newString - Text to replace with
   * @param {boolean} replaceAll - Replace all occurrences
   * @returns {number} Number of replacements made
   * @throws {SecurityError} If path is outside sandbox
   * @throws {FileNotFoundError} If file doesn't exist
   * @throws {Error} If old_string not found or appears multiple times without replaceAll
   */
  editFile(userPath, oldString, newString, replaceAll = false) {
    const resolved = this.resolvePath(userPath);

    if (!fs.existsSync(resolved)) {
      throw new FileNotFoundError(`File '${userPath}' not found. Use write_file to create new files.`);
    }

    const contents = fs.readFileSync(resolved, 'utf-8');

    // Check if old_string exists
    if (!contents.includes(oldString)) {
      throw new Error(`Could not find the specified text in '${userPath}'. Make sure old_string exactly matches the text in the file.`);
    }

    // Count occurrences
    const occurrences = (contents.match(new RegExp(oldString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

    // If multiple occurrences and not replace_all, error
    if (occurrences > 1 && !replaceAll) {
      throw new Error(`The text appears ${occurrences} times in '${userPath}'. Either:\n1. Include more context in old_string to make it unique\n2. Set replace_all to true to replace all occurrences`);
    }

    // Perform replacement
    let newContents;
    if (replaceAll) {
      newContents = contents.replaceAll(oldString, newString);
    } else {
      newContents = contents.replace(oldString, newString);
    }

    // Write updated contents
    fs.writeFileSync(resolved, newContents, 'utf-8');

    return occurrences;
  }

  /**
   * List all files in the sandbox recursively
   * @returns {Array<{type: 'file'|'directory', path: string}>}
   */
  listFiles() {
    const walkDir = (dir, baseDir = dir) => {
      let results = [];
      const list = fs.readdirSync(dir);

      list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        const relativePath = path.relative(baseDir, filePath);

        if (stat.isDirectory()) {
          results.push({ type: 'directory', path: relativePath });
          results = results.concat(walkDir(filePath, baseDir));
        } else {
          results.push({ type: 'file', path: relativePath });
        }
      });

      return results;
    };

    return walkDir(this.sandboxDir);
  }

  /**
   * Format file list for display
   * @returns {string} Formatted file listing
   */
  formatFileList() {
    const items = this.listFiles();
    let output = "Files in sandbox:\n\n";

    // Group by directory
    const byDirectory = {};
    items.forEach(item => {
      const dir = path.dirname(item.path);
      const dirname = dir === '.' ? '(root)' : dir;
      if (!byDirectory[dirname]) {
        byDirectory[dirname] = [];
      }
      if (item.type === 'file') {
        byDirectory[dirname].push(path.basename(item.path));
      }
    });

    // Build formatted output
    Object.keys(byDirectory).sort().forEach(dir => {
      output += `${dir}/\n`;
      byDirectory[dir].forEach(file => {
        output += `  - ${file}\n`;
      });
      output += '\n';
    });

    return output.trim();
  }
}
