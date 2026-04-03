import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  resolve: {
    alias: {
      url: 'url',
    },
  },
  plugins: [vue()],
})
