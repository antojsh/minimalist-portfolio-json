import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://antojsh.dev',
  trailingSlash: 'never',
  build: {
    format: 'file',
    inlineStylesheets: 'always',
  },
});
