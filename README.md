# Communitator

A Nostr web application for community leaders to create and share relay recommendations. Members review the canonical template, explicitly connect a signer, then separately approve publication of relay lists (kind 10002), Blossom servers (kind 10063), and DM relays (kind 10050).

## Overview

When new users join Nostr, one of the biggest friction points is choosing and configuring relays. Communitator solves this by letting community leaders create shareable relay templates that users can apply instantly.

### Key Features

- **Create Relay Templates**: Community leaders can define relay sets with read/write permissions
- **Shareable Links**: Generate unique URLs for each template
- **Explicit review and consent**: Connect and Apply are separate; each present event kind is reviewed before signing
- **Blossom Server Support**: Configure blossom servers (kind 10063)
- **DM Relay Support**: Set up private messaging relays (kind 10050)
- **Community Templates**: Pre-configured templates for popular communities
- **Blast Relays**: Signed events are published to a configured blast relay set and only positive NIP-01 `OK` acknowledgements count as accepted
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
3. Review normalized endpoints, permissions, event kinds, every configured blast destination, and every template relay destination
4. Choose Apply and approve each signer prompt
5. Inspect complete, partial, failed, or cancelled destination results; retry only failures when offered

## Technology Stack

- **React** with Vite for fast development
- **nostr-tools** for Nostr protocol operations
- **NIP-07** extension support (Alby, Nos2x, etc.)
- **Pure CSS** with responsive design

## Installation

### Prerequisites

- Node.js 24.19.0 (the supported version is recorded in `.nvmrc`)
- npm 11
- A Nostr extension (Alby, Nos2x, etc.)

### Setup

Clone the repository.

```bash

# Install the exact locked dependency graph
npm ci

# Start development server
npm run dev

# Build for production
npm run build

```

The development server starts at `http://localhost:3000`. If a browser
extension requires a secure local context, opt in to HTTPS with certificates
outside the repository:

```bash
DEV_HTTPS_KEY_PATH=/absolute/path/localhost-key.pem \
DEV_HTTPS_CERT_PATH=/absolute/path/localhost.pem \
npm run dev
```

Both variables are required together. The normal development and production
build commands do not read certificate files.

## Configuration

### Blast Relays

Blast relays are application-controlled publication destinations. Configure the single canonical inventory in `src/utils/templates.js`; the apply preview enumerates that whole inventory separately from the shared template's main relay destinations:

```javascript
export const BLAST_RELAYS = freezeArray([
  'wss://relay.primal.net', 'wss://relay.damus.io',
  'wss://relay.ditto.pub', 'wss://offchain.pub',
  'wss://sendit.nosflare.com', 'wss://nostr.mom',
  'wss://nos.lol', 'wss://purplepag.es',
  'wss://indexer.coracle.social', 'wss://user.kindpag.es',
  'wss://directory.yabu.me', 'wss://profiles.nostr1.com'
].map((url) => ({ url: canonicalizeEndpoint(url, 'relay') })));
```

Publication uses the union of those configured blast destinations and the canonical template's main relays. A destination shown in both groups is contacted once, and one apply operation opens at most four WebSocket connections across all event kinds combined.

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

### Documentation website

The Dyne-styled VitePress website lives in `docs/` and is deployed to GitHub Pages by `.github/workflows/deploy-docs.yml`.

```bash
cd docs
npm ci
npm run build
```

For the repository Pages path, build with `BASE_PATH=/communitator/`. In GitHub repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

### Build for Production

```bash
# Build the webapp
npm run build

```

This creates a `dist` folder with all static assets ready for deployment.

### Deploy to Any Static Host

Upload the contents of the `dist` folder to any static web host (Netlify, Vercel, Cloudflare Pages, etc.).

`npm run preview` is useful only for locally inspecting the already-built
assets; it is not a production server. Use a static host or a configured web
server to serve `dist/` in production.

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

These are Nostr event-kind identifiers, not TCP ports or NIP numbers.

| Nostr event kind | Description | Defined by | Published To |
|------|-------------|------------|--------------|
| [10002](https://github.com/nostr-protocol/nips/blob/master/65.md) | User's main relays | [NIP-65](https://github.com/nostr-protocol/nips/blob/master/65.md) | Blast relays + User's relays |
| [10063](https://github.com/nostr-protocol/nips/blob/master/B7.md) | Blossom servers | [NIP-B7](https://github.com/nostr-protocol/nips/blob/master/B7.md) | Blast relays + User's relays |
| [10050](https://github.com/nostr-protocol/nips/blob/master/17.md) | DM relays | [NIP-17](https://github.com/nostr-protocol/nips/blob/master/17.md) | Blast relays + User's relays |

## Requirements

- **HTTPS**: Nostr extensions require a secure context
- **Nostr Extension**: Alby, Nos2x, or any NIP-07 compatible extension
- **Modern Browser**: Chrome, Firefox, Safari (latest versions)

## Browser Extension Support

The app works with any NIP-07 compatible Nostr extension:
- [Alby](https://getalby.com/)
- [Nos2x](https://nos2x.fiatjaf.com/)

## Security and consent

Shared links are untrusted recommendations. The app accepts only bounded, versioned canonical template links and shows normalized endpoints, read/write permissions, the exact event kinds, every configured blast destination, and every canonical template relay destination before any signer interaction. **Connect** requests an identity; **Apply** separately asks the extension to sign kind 10002, and kinds 10063/10050 only when present. Signed events are sent to the deduplicated union of the two displayed destination groups, with at most four sockets across the operation; a relay counts only after a positive NIP-01 `OK`, so results can be complete, partial, failed, or cancelled. Public relay contact has privacy implications: operators can observe your network address and the event you publish.

See [SECURITY.md](SECURITY.md) for the hosting header contract, residual GitHub Pages limitations, disclosure process, and release checklist.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

GNU GENERAL PUBLIC LICENSE Version 3

---
