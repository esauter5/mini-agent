export class SecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class FileNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FileNotFoundError';
  }
}

export class FileExistsError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FileExistsError';
  }
}

export class ToolExecutionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ToolExecutionError';
  }
}
