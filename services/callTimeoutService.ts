// Deprecated TypeScript wrapper for JS implementation.
// The actual logic is implemented in callTimeoutService.js to avoid TS/JS mixing issues.
// This file only exists so that TypeScript imports still work.

// Use explicit .js extension when requiring to avoid resolving to this .ts file and causing a circular import.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CallTimeoutServiceImpl = require('./callTimeoutService.js').default;

export default CallTimeoutServiceImpl;
