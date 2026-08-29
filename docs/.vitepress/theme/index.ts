import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme-without-fonts'
import DyneBrand from './components/DyneBrand.vue'
import DyneFooter from './components/DyneFooter.vue'
import SignalBoard from './components/SignalBoard.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {
    'nav-bar-title-before': () => h(DyneBrand, { variant: 'nav' }),
    'layout-bottom': () => h(DyneFooter)
  }),
  enhanceApp({ app }) {
    app.component('SignalBoard', SignalBoard)
  }
} satisfies Theme
