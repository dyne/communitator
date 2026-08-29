import { defineConfig } from 'vitepress'

const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  title: 'Communitator',
  titleTemplate: ':title · Communitator',
  description: 'Share complete Nostr relay settings with your community in one reviewable link.',
  lang: 'en-US',
  base,
  cleanUrls: true,
  lastUpdated: true,
  appearance: true,
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: `${base}favicon.png` }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap' }],
    ['meta', { name: 'theme-color', content: '#171b19' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Communitator — Put your Nostr community on the right relays' }],
    ['meta', { property: 'og:description', content: 'Build and share complete Nostr relay settings in one reviewable link.' }]
  ],
  themeConfig: {
    siteTitle: 'Communitator',
    search: { provider: 'local' },
    nav: [
      { text: 'Leader guide', link: '/guide/create-a-template' },
      { text: 'How it works', link: '/guide/how-it-works' },
      { text: 'Reference', link: '/reference/event-kinds' },
      { text: 'Source', link: 'https://git.basspistol.org/hq/Communitator' }
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Start transmitting',
          items: [
            { text: 'How Communitator works', link: '/guide/how-it-works' },
            { text: 'Create a template', link: '/guide/create-a-template' },
            { text: 'Apply a template', link: '/guide/apply-a-template' }
          ]
        },
        {
          text: 'Operate it',
          items: [
            { text: 'Run locally', link: '/guide/run-locally' },
            { text: 'Community presets', link: '/guide/community-presets' }
          ]
        }
      ],
      '/reference/': [
        {
          text: 'Signal reference',
          items: [
            { text: 'Event kinds', link: '/reference/event-kinds' },
            { text: 'Relay behavior', link: '/reference/relay-behavior' }
          ]
        }
      ]
    },
    outline: { level: [2, 3], label: 'On this frequency' },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/dyne/communitator' }
    ],
    editLink: {
      pattern: 'https://github.com/dyne/communitator/edit/main/docs/:path',
      text: 'Improve this page'
    },
    lastUpdated: {
      text: 'Log updated',
      formatOptions: { dateStyle: 'medium' }
    },
    docFooter: { prev: 'Previous channel', next: 'Next channel' },
    returnToTopLabel: 'Return to the dial',
    sidebarMenuLabel: 'Open channels',
    darkModeSwitchLabel: 'Switch control-room light',
    lightModeSwitchTitle: 'Use light mode',
    darkModeSwitchTitle: 'Use dark mode'
  }
})
