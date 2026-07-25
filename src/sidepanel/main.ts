import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHashHistory } from "vue-router";
import App from "./App.vue";

import QueryView from "./views/QueryView.vue";
import ResultsView from "./views/ResultsView.vue";
import HistoryView from "./views/HistoryView.vue";
import SettingsView from "./views/SettingsView.vue";

import "./styles/global.css";
import "./styles/animations.css";
import "ant-design-vue/dist/reset.css";

const routes = [
  { path: "/", component: QueryView },
  { path: "/results", component: ResultsView },
  { path: "/history", component: HistoryView },
  { path: "/settings", component: SettingsView },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(router);
app.mount("#app");
