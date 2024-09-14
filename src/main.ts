// src/main.ts
import { createApp } from 'vue';
import App from './App.vue';
import { createPinia } from 'pinia';

// Pinia 추가
const app = createApp(App);
app.use(createPinia());

// Vue 애플리케이션 시작
app.mount('#app');