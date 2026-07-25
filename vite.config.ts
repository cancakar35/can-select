import dts from 'unplugin-dts/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    lib: {
      entry: 'src/main.ts',
      name: 'CanSelect',
      formats: ['es', 'umd'],
      fileName: (format) => `can-select.${format}.js`,
    },
  },
  plugins: [dts({ bundleTypes: true })],
});
