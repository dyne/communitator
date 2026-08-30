---
title: Relay behavior
description: Validation, publish destinations, timeouts, and result handling.
---

# Relay behavior

## Endpoint validation

Main and DM relay URLs use secure `wss://` endpoints. Blossom server URLs use `https://`. The canonical template boundary rejects insecure non-loopback endpoints.

Templates need a non-empty name and at least one main relay. Communitator validates the decoded template again before showing an apply screen.

## Publish destinations

Before consent, the apply preview enumerates these two lists separately. The publisher merges them and removes canonical duplicates:

1. the application’s configured blast relays.
2. the shared template’s canonical main relays.

The current configured blast inventory is `relay.primal.net`, `relay.damus.io`, `relay.ditto.pub`, `offchain.pub`, `sendit.nosflare.com`, `nostr.mom`, `nos.lol`, `purplepag.es`, `indexer.coracle.social`, `user.kindpag.es`, `directory.yabu.me`, and `profiles.nostr1.com`, all over `wss://`. The UI displays their full canonical URLs. A relay present in both lists is contacted once.

This means the Blossom and DM events are announced through Nostr relays; Communitator does not upload media to Blossom servers or send direct messages as part of applying a template.

## Timeouts and acknowledgements

One apply or retry operation shares a single queue across all requested event kinds, so no more than four WebSockets are open at once. For each relay/event pair, the application:

1. opens a WebSocket;
2. sends `["EVENT", signedEvent]`;
3. waits for an `OK` response that matches the event ID;
4. closes the socket after success or timeout.

Each relay/event pair has one 10-second total deadline covering connection, send, and acknowledgement. Only a positive NIP-01 `OK` acknowledgement counts as accepted; results are aggregated per event kind.

## Failure model

Publishing is best effort across independent relays. One success is enough for an event kind to be marked successful in the current application, even if other destinations fail. Operators should inspect the detailed counts when verifying a rollout.
