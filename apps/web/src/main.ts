import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { Quasar, Dark, Dialog, Notify } from 'quasar';

import '@quasar/extras/roboto-font/roboto-font.css';
import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/dist/quasar.css';
import './styles/app.css';

import App from './App.vue';

const app = createApp(App);

app.use(createPinia());
app.use(Quasar, {
  plugins: {
    Dark,
    Dialog,
    Notify,
  },
  config: {
    dark: true,
  },
});

app.mount('#app');
