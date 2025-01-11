import { createApp } from 'vue';
import App from './App.vue';
import { createPinia } from 'pinia';
import { vuetify } from './plugins/vuetify'; // Vuetify 설정을 분리한 파일 import

const app = createApp(App);

// Pinia 및 Vuetify 추가
app.use(createPinia());
app.use(vuetify);

// Vue 애플리케이션 시작
app.mount('#app');