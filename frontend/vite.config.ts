import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // css: 테마 토큰 검사(theme.test.tsx)가 index.css 원문을 읽는다
  test: { environment: 'jsdom', css: true },
});
