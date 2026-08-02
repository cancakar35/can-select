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
    rolldownOptions: {
      output: {
        postBanner: `/**
* can-select ${process.env.npm_package_version}
* Released under the MIT License.
*
* https://github.com/cancakar35/can-select
*/`,
      },
    },
  },
  plugins: [dts({ bundleTypes: true })],
});
