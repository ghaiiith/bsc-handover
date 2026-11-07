// Test-only no-op replacement for the `server-only` package. Importing the real
// package throws outside a React Server Component graph, which breaks unit tests
// that import server modules directly. See vitest.config.ts alias.
export {}
