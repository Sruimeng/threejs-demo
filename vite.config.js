import { resolve } from 'path';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import legacy from '@vitejs/plugin-legacy';
import { getSWCPlugin } from './scripts/rollup-config-helper';

export default defineConfig(({ mode }) => {
  return {
    base: './',
    build: {
      rollupOptions: {
        input: {
          'index': resolve(__dirname, 'demo/index.html'),
          'single': resolve(__dirname, 'demo/html/single.html'),
        }
      },
      minify: false, // iOS 9 等低版本加载压缩代码报脚本异常
    },
    server: {
      host: '0.0.0.0',
      port: 8080,
    },
    preview: {
      host: '0.0.0.0',
      port: 8080,
    },
    resolve: {
    },
    plugins: [
      legacy({
        targets: ['iOS >= 9'],
      }),
      getSWCPlugin({
        target: 'ES6',
      }),
      tsconfigPaths(),
    ],
  };
});
