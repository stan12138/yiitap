import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './index.scss'
import '@stan-custom-yiitap/vue/dist/vue.css'

const app = createApp(App)

app.use(router)
app.mount('#app')
