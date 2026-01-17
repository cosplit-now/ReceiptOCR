import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000, // 真实 API 调用需要更长时间
    hookTimeout: 60000, // beforeAll/afterAll 钩子需要更长时间（包含多次 API 调用）
  },
});
