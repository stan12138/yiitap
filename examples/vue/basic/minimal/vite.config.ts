import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, '.') },
      
      // 1. 针对 Vue 包的别名处理
      // 精确匹配：import from '@stan-custom-yiitap/vue' -> 指向源码
      { find: /^@stan-custom-yiitap\/vue$/, replacement: path.resolve(__dirname, '../../../../packages/vue/src/index.ts') },
      // 路径匹配：import from '@stan-custom-yiitap/vue/dist/xxx' -> 指向真正的 dist 目录
      { find: /^@stan-custom-yiitap\/vue\/dist\/(.*)/, replacement: path.resolve(__dirname, '../../../../packages/vue/dist/$1') },

      // 2. 针对 Icon 包的别名处理
      { find: /^@stan-custom-yiitap\/icon\/vue$/, replacement: path.resolve(__dirname, '../../../../packages/icon/vue/src/index.ts') },
      { find: /^@stan-custom-yiitap\/icon\/vue\/dist\/(.*)/, replacement: path.resolve(__dirname, '../../../../packages/icon/vue/dist/$1') },
    ],
    dedupe: ['vue'],
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: process.env.NODE_ENV === 'production'
          ? `` // 使用相对于当前 example 的物理路径
          : '',
      },
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      external: ['yjs'],
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('vue')) {
              return 'vendor-framework' // Split React/Vue
            }
            if (id.includes('@stan-custom-yiitap/icon') || id.includes('@tiptap')) {
              return 'vendor-core' // Split tiptap
            }
            if (id.includes('lodash') || id.includes('moment')) {
              return 'vendor-utils' // Split utils
            }
            return 'vendor' // Others
          }
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
  optimizeDeps: {
    exclude: [],
  },
})
