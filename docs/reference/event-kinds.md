---
title: Event kinds
description: The Nostr replaceable events Communitator prepares and publishes.
---

# Event kinds

Communitator publishes up to three Nostr event kinds from one template. These integers are event-kind identifiers, not TCP ports or NIP numbers: a kind tells Nostr clients how to interpret the event, while a NIP number identifies the protocol document that defines it. Each event is created at apply time and signed by the member’s NIP-07 extension.

## Kind 10002 — relay list ([NIP-65](https://github.com/nostr-protocol/nips/blob/master/65.md))

Each valid main relay becomes an `r` tag.

```json
["r", "wss://relay.example", "read"]
```

- A read-only relay includes `read`.
- A write-only relay includes `write`.
- A relay used for both directions has no third tag value.

The signed event is published to the configured blast destinations after explicit user approval.

## Kind 10063 — Blossom servers ([NIP-B7](https://github.com/nostr-protocol/nips/blob/master/B7.md))

Each valid server becomes a `server` tag.

```json
["server", "https://media.example"]
```

The source application preserves the listed order. The event is published to the configured blast set after explicit user approval.

## Kind 10050 — DM relays ([NIP-17](https://github.com/nostr-protocol/nips/blob/master/17.md))

Each valid DM relay becomes a `relay` tag.

```json
["relay", "wss://dm.example"]
```

The event is published to the configured blast set after explicit user approval.

## Shared event fields

Every prepared event includes:

- the numeric `kind`;
- the connected public key;
- the current Unix timestamp;
- the generated tags;
- an empty content string.

The browser extension returns the signed event. Communitator then sends the standard `EVENT` message over WebSocket to each publish destination and waits for an `OK` response or a timeout.
