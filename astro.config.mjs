import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { siteConfig } from './src/site.config.ts'

// https://astro.build/config
export default defineConfig({
  site: siteConfig.url,
  build: {
    inlineStylesheets: 'auto',
  },
  markdown: {
    shikiConfig: {
      // 双主题：Shiki 输出 CSS 变量，随 .dark 类自动切换，无需 JS 介入
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      wrap: true,
    },
  },
  integrations: [
    mdx(),
    sitemap(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
})
