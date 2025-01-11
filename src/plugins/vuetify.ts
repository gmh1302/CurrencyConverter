// src/plugins/vuetify.ts
import { createVuetify } from 'vuetify';
import 'vuetify/styles'; // Vuetify 스타일 추가
import '@mdi/font/css/materialdesignicons.css'; // Material Design Icons 추가
import { aliases, mdi } from 'vuetify/iconsets/mdi'; // 아이콘 세트 추가
import { VList, VListItem } from 'vuetify/components';

export const vuetify = createVuetify({
    components: {
        VList,
        VListItem,
    },
    icons: {
        defaultSet: 'mdi', // Material Design Icons를 기본 아이콘 세트로 설정
        aliases,
        sets: {
            mdi,
        },
    },
});
