import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from '@vuetify/vite-plugin';

export default defineConfig({
    plugins: [
        vue(), vuetify({ autoImport: true })
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    // server: {
    //   host: '0.0.0.0', // 모든 네트워크 인터페이스에서 접근 허용
    //   port: 3000, // 원하는 포트 설정
    // },
})