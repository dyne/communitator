---
title: Community presets
description: Add and maintain pre-configured Communitator templates.
---

# Community presets

The template creator can load named community presets from `src/utils/templates.js`. A preset is a convenient starting point; leaders can still review and change its values before generating a link.

## Preset shape

```js
{
  id: 'my-community',
  name: 'My Community',
  description: 'Settings maintained by My Community',
  relays: [
    { url: 'wss://relay.example', read: true, write: true }
  ],
  blossomServers: [
    { url: 'https://media.example' }
  ],
  dmRelays: [
    { url: 'wss://dm.example' }
  ]
}
```

## Maintenance checklist

- Use a stable, unique `id`.
- Name the maintainer or community in the description.
- Test every endpoint before changing the preset.
- Set read and write permissions deliberately.
- Put Blossom servers in trust order.
- Use `wss://` and `https://` endpoints for production presets.
- Review the generated apply page before merging.

Presets are source-controlled product configuration. A change affects newly generated links, not links that were already shared.
