import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // 프로덕션에서는 소스맵 비활성화 (보안 및 성능)
    minify: 'esbuild', // esbuild로 최소화 (기본값이지만 명시)
    rollupOptions: {
      output: {
        manualChunks: {
          // 큰 라이브러리를 별도 청크로 분리
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'canvas-vendor': ['html2canvas', 'jspdf']
        }
      }
    },
    // 청크 크기 경고 임계값 증가 (큰 이미지 처리 라이브러리 포함)
    chunkSizeWarningLimit: 1000
  }
})

