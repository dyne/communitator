# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Community leaders are the primary audience for the website. They use Communitator to prepare, explain, and distribute a complete Nostr relay configuration to their members. Nostr newcomers are a secondary audience who receive a shared template, review it, and apply it through a compatible browser extension.

## Product Purpose

Communitator reduces the friction of joining a Nostr community. It lets leaders assemble main relays, Blossom media servers, and private-message relays into a shareable template that members can apply in one action.

## Positioning

Unlike a generic relay directory, Communitator packages a community's full Nostr connection policy—read/write relay permissions, media servers, and DM relays—into a portable link and publishes the selected event kinds with redundant blast-relay delivery.

## Operating Context

Leaders configure and share templates from the existing React application. Members open a template link in a modern browser, connect a NIP-07 extension such as Alby or Nos2x, review the configuration, and sign the update. The informational website lives under `docs/`; the application build at the repository root remains untouched.

## Capabilities and Constraints

- Template creators can configure main relays with read/write permissions, Blossom servers, and DM relays.
- Templates are encoded into shareable links.
- Applying a template publishes Nostr kinds 10002, 10063, and 10050 to configured and blast relays.
- The application requires HTTPS and a NIP-07-compatible browser extension for signing.
- The documentation site uses the existing `dyne-vitepress` template and deploys through GitHub Pages Actions.
- A public production URL for the interactive app is not confirmed; the site must not invent one.

## Brand Commitments

Keep the product name “Communitator,” the Dyne context, the practical peer-to-peer voice, and the existing source-code link at `https://git.basspistol.org/hq/Communitator`.

## Evidence on Hand

- Product behavior and setup documentation in `README.md`.
- Observable workflows and terminology in `src/`.
- Existing community presets in `src/utils/templates.js`.
- Dyne VitePress theme and assets in `../dyne-vitepress/template/`.
- No testimonials, usage metrics, production app URL, or product screenshots are currently provided; the website must not fabricate them.

## Product Principles

- Make community setup legible before asking anyone to trust a template.
- Treat relay policy as something communities can own and share.
- Explain Nostr-specific concepts in plain language without flattening their technical meaning.
- Preserve review and consent before any signed update.
- Use only verifiable claims and links.

## Accessibility & Inclusion

The website should be keyboard accessible, respect reduced-motion preferences, preserve strong contrast in light and dark themes, and remain understandable to readers who are new to Nostr terminology.
