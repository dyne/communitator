---
title: Create a community template
description: Prepare a clear, trustworthy Nostr relay template for your members.
---

# Create a community template

A good template is a small piece of community infrastructure. Make the route understandable before you make it shareable.

## Before you begin

Decide who maintains the template and gather the endpoints you want members to use:

- main relay WebSocket URLs;
- whether each main relay is for reading, writing, or both;
- Blossom server HTTPS URLs, in preferred order;
- DM relay WebSocket URLs;
- one sentence explaining why this set belongs to your community.

Use secure `wss://` and `https://` endpoints in production. Confirm that each endpoint is operated by someone your community trusts.

## Set the main relays

Add at least one main relay. Each entry can carry two independent permissions:

- **Read** marks an inbox destination.
- **Write** marks an outbox destination.
- Enabling both uses the relay for both directions.

Communitator writes these choices into kind `10002`. Read-only relays receive the `read` marker; write-only relays receive the `write` marker. A relay used for both directions needs no marker.

## Add media and private-message routes

Blossom servers are optional and are published as kind `10063`. Their order communicates preference, so place the server you trust most first.

DM relays are optional and are published as kind `10050`. These endpoints tell compatible clients where to route private messages.

## Name the template plainly

Use a name members will recognize outside your own admin context—for example, “Planet Dyne community settings.” In the description, identify who maintains the configuration and what it changes.

Avoid language that asks members to trust the link blindly. The preview is part of the product: invite people to check the destinations.

## Generate and verify the link

Choose **Generate shareable template**. Communitator validates the fields, creates a bounded versioned URL payload, and attempts to copy it to the clipboard. Shared links are public configuration, never a place for secrets; recipients see a review before Connect and a separate Apply action.

Before publishing the link widely:

1. Open it in a separate browser profile.
2. Confirm the name, description, relay permissions, server order, and DM routes.
3. Check that the page explains the signing step.
4. Apply it with a test identity if your operating policy permits.
5. Save the date and maintainer alongside the link in your community handbook.

::: tip Keep a replacement path
When relay policy changes, generate a new template and update the canonical welcome link. The configuration lives in the URL, so an old link continues to carry the old route.
:::

Next: understand [what members see when applying it](./apply-a-template).
