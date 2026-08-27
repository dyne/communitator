# Communitator

A Nostr web application that allows community leaders to create and share relay templates for new users. Users can apply these templates with one click, automatically updating their relay lists (kind 10002), blossom servers (kind 10063), and DM relays (kind 10050).

## Overview

When new users join Nostr, one of the biggest friction points is choosing and configuring relays. Communitator solves this by letting community leaders create shareable relay templates that users can apply instantly.

### Key Features

- **Create Relay Templates**: Community leaders can define relay sets with read/write permissions
- **Shareable Links**: Generate unique URLs for each template
- **One-Click Apply**: Users apply templates with a single signature
- **Blossom Server Support**: Configure blossom servers (kind 10063)
- **DM Relay Support**: Set up private messaging relays (kind 10050)
- **Community Templates**: Pre-configured templates for popular communities
- **Blast Relays**: Events are published to both user-defined relays and a configurable blast relay set for redundancy. This makes sure that everyone get to know the new relays the user is leveraging
- **Browser Extension Support**: Works with Alby, Nos2x, and other NIP-07 extensions

## How It Works

### For Template Creators

1. Create a template with:
   - Main relays (with read/write permissions)
   - Blossom servers (for media hosting)
   - DM relays (for private messages)
   - Template name and description
2. Generate a shareable link
3. Share the link with your community

### For Template Users

1. Click the shared template link
2. Connect your Nostr extension
3. Review the relay configuration
4. Click "Apply Template"
5. Events are published to all configured relays and blast relays

## Technology Stack

- **React** with Vite for fast development
- **nostr-tools** for Nostr protocol operations
- **NIP-07** extension support (Alby, Nos2x, etc.)
- **Pure CSS** with responsive design

## Installation

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- A Nostr extension (Alby, Nos2x, etc.)

### Setup

Clone the repository.

```bash

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

```

The development server will start at `https://localhost:3000` (HTTPS is required for Nostr extensions).

## Configuration

### Blast Relays

Blast relays are used to ensure events are published to reliable relays regardless of the user's configuration. Configure them in `src/hooks/useNostr.js`:

```javascript
const BLAST_RELAYS = [
  'wss://relay.primal.net',
  'wss://relay.damus.io',
  'wss://relay.ditto.pub',
  'wss://offchain.pub',
  'wss://sendit.nosflare.com',
  'wss://nostr.mom',
  'wss://nos.lol'
];
```

### Community Templates

Add or modify community templates in `src/utils/templates.js`:

```javascript
export const getCommunityTemplates = () => {
  return {
    'my-community': {
      id: 'my-community',
      name: 'My Community',
      description: 'Official relay set for My Community',
      relays: [
        { url: 'wss://relay.mycommunity.com', read: true, write: true },
        { url: 'wss://relay.damus.io', read: true, write: true }
      ],
      blossomServers: [
        { url: 'https://cdn.mycommunity.com' }
      ],
      dmRelays: [
        { url: 'wss://dm.mycommunity.com' }
      ]
    }
  };
};
```

### Default Relays

Change the landing defaults in `src/components/TemplateCreator.jsx`:

```javascript
  const [relays, setRelays] = useState([
    { url: 'wss://your-cool.relay', read: true, write: true }
  ]);

  const [blossomServers, setBlossomServers] = useState([
    { url: 'https://your-blossom.server' }
  ]);
  const [showBlossom, setShowBlossom] = useState(true);

  const [dmRelays, setDmRelays] = useState([
    { url: 'wss://your-dm.relay' }
  ]);
  const [showDmRelays, setShowDmRelays] = useState(true);
```

## Deployment

### Build for Production

```bash
# Build the webapp
npm run build

```

This creates a `dist` folder with all static assets ready for deployment.

### Deploy to Any Static Host

Upload the contents of the `dist` folder to any static web host (Netlify, Vercel, Cloudflare Pages, etc.).

```bash
#Deploy to your server
rsync -av dist/ user@remote.server.tld:/path/to/webroot/
```

#### Example: Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    root /var/www/communitator/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

## Event Types

| Kind | Description | Published To |
|------|-------------|--------------|
| 10002 | User's main relays | Blast relays + User's relays |
| 10063 | Blossom servers | Blast relays + User's relays |
| 10050 | DM relays | Blast relays + User's relays |

## Requirements

- **HTTPS**: Nostr extensions require a secure context
- **Nostr Extension**: Alby, Nos2x, or any NIP-07 compatible extension
- **Modern Browser**: Chrome, Firefox, Safari (latest versions)

## Browser Extension Support

The app works with any NIP-07 compatible Nostr extension:
- [Alby](https://getalby.com/)
- [Nos2x](https://nos2x.fiatjaf.com/)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

GNU GENERAL PUBLIC LICENSE Version 3

---

