import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['backend/**/*.test.js', 'backend/__tests__/**/*.test.js'],
  },
}); 