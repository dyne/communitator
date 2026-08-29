---
title: Event kinds
description: The Nostr replaceable events Communitator prepares and publishes.
---

# Event kinds

Communitator publishes up to three Nostr event kinds from one template. Each event is created at apply time and signed by the member’s NIP-07 extension.

## Kind 10002 — relay list

Each valid main relay becomes an `r` tag.

```json
["r", "wss://relay.example", "read"]
```

- A read-only relay includes `read`.
- A write-only relay includes `write`.
- A relay used for both directions has no third tag value.

The member’s main relay URLs are also included among the publish destinations for this event.

## Kind 10063 — Blossom servers

Each valid server becomes a `server` tag.

```json
["server", "https://media.example"]
```

The source application preserves the listed order. The event is published to the blast set and to the main relay URLs carried by the template.

## Kind 10050 — DM relays

Each valid DM relay becomes a `relay` tag.

```json
["relay", "wss://dm.example"]
```

The event is published to the blast set and to the template’s main relay URLs.

## Shared event fields

Every prepared event includes:

- the numeric `kind`;
- the connected public key;
- the current Unix timestamp;
- the generated tags;
- an empty content string.

The browser extension returns the signed event. Communitator then sends the standard `EVENT` message over WebSocket to each publish destination and waits for an `OK` response or a timeout.
