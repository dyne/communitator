---
title: How Communitator works
description: Follow a relay template from a community leader to a signed Nostr update.
---

# How Communitator works

Communitator turns a community’s Nostr connection policy into one portable, reviewable link. Leaders define the route. Members inspect it and decide whether to publish it through their own signer.

## The signal path

1. A community leader chooses the main relays and their read/write permissions.
2. They can add Blossom servers for media and DM relays for private messages.
3. Communitator encodes the complete template into the URL.
4. A member opens the URL and reviews every destination.
5. The member connects a NIP-07-compatible extension and chooses to apply the template.
6. Communitator asks the extension to sign the relevant events and publishes them to the configured relays and the blast relay set.

Nothing is signed when a template is created or merely opened.

## What the link carries

A template can include:

- a name and plain-language description;
- one or more main relays, each with read and write permissions;
- an ordered list of Blossom servers;
- one or more DM relays;
- a creation timestamp.

The template data is URL-encoded. Treat a shared link as public configuration, not as a place for secrets.

## What gets published

Communitator prepares three standard replaceable Nostr events when their corresponding settings are present.

The numbers below are Nostr event-kind identifiers—not TCP ports or NIP numbers. The linked Nostr Implementation Possibilities (NIPs) define what each event carries.

| Nostr event kind | Settings | Tags | Defined by |
| --- | --- | --- | --- |
| [`10002`](https://github.com/nostr-protocol/nips/blob/master/65.md) | Main relay list | `r`, relay URL, optional `read` or `write` marker | [NIP-65](https://github.com/nostr-protocol/nips/blob/master/65.md) |
| [`10063`](https://github.com/nostr-protocol/nips/blob/master/B7.md) | Blossom servers | `server`, HTTPS URL | [NIP-B7](https://github.com/nostr-protocol/nips/blob/master/B7.md) |
| [`10050`](https://github.com/nostr-protocol/nips/blob/master/17.md) | DM relays | `relay`, WebSocket URL | [NIP-17](https://github.com/nostr-protocol/nips/blob/master/17.md) |

See the [event-kind reference](../reference/event-kinds) for the exact behavior.

## Why blast relays are included

The application publishes signed updates to a configured blast relay set as well as the member’s selected relays. This redundancy helps the new relay information become discoverable outside a single destination.

::: warning Availability is not guaranteed
Relays are independent services. A publish attempt can succeed on some destinations and fail on others. Communitator reports the result for each event after publishing.
:::

## Consent stays with the member

The leader authors the recommendation; the member authorizes the update. Applying a template requires a compatible NIP-07 extension such as Alby or Nos2x, and the extension remains responsible for showing or enforcing its own signing approval flow.

Next: [create a community template](./create-a-template).
