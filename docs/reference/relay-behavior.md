---
title: Relay behavior
description: Validation, publish destinations, timeouts, and result handling.
---

# Relay behavior

## Endpoint validation

Main and DM relay URLs must use `wss://` or `ws://`. Blossom server URLs must use `https://` or `http://`. Production communities should prefer the secure variants.

Templates need a non-empty name and at least one main relay. Communitator validates the decoded template again before showing an apply screen.

## Publish destinations

The publishing hook merges two lists and removes duplicates:

1. the application’s configured blast relays;
2. the main relay URLs carried by the member’s template.

This means the Blossom and DM events are announced through Nostr relays; Communitator does not upload media to Blossom servers or send direct messages as part of applying a template.

## Timeouts and acknowledgements

For each relay, the application:

1. opens a WebSocket;
2. sends `["EVENT", signedEvent]`;
3. waits for an `OK` response that matches the event ID;
4. closes the socket after success or timeout.

An open timeout and a publish timeout are reported as failures for that destination. Results are aggregated per event kind, with blast and user-relay counts shown separately.

## Failure model

Publishing is best effort across independent relays. One success is enough for an event kind to be marked successful in the current application, even if other destinations fail. Operators should inspect the detailed counts when verifying a rollout.
