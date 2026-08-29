---
title: Apply a relay template
description: Review, sign, and publish a Communitator relay template safely.
---

# Apply a relay template

Opening a Communitator link does not update your Nostr settings. It first decodes and validates the template, then shows you the proposed route.

## Check the preview

Confirm all of the following before connecting a signer:

- the template name and community description are the ones you expected;
- main relay domains are recognizable;
- read and write permissions match the intended inbox and outbox behavior;
- Blossom servers belong to operators you are willing to use for media;
- DM relay domains are appropriate for private-message routing.

If the link is invalid or the data does not pass validation, Communitator stops and displays an error instead of presenting an apply action.

## Connect a signer

The web application expects a NIP-07-compatible browser extension. It checks for `window.nostr`, asks the extension for your public key, and uses the extension to sign events.

::: warning Use HTTPS
Browser extensions and signing integrations should be used in a secure context. Run the production app over HTTPS and verify the origin before approving a signature.
:::

## Apply and publish

After you choose **Apply Template & Publish to Relays**, Communitator prepares each event represented in the template, asks your extension to sign it, and publishes it.

The results distinguish:

- successful and failed event kinds;
- deliveries to blast relays;
- deliveries to your configured relays;
- the signed event identifier when available.

A partial result does not necessarily mean the signed event is unusable. Relays can be offline or reject a publish independently. Read the per-event result before retrying.

## If something looks wrong

Do not approve a signature for unfamiliar endpoints. Close the page and ask the community maintainer for a verified link. Because the full configuration is embedded in the URL, two links that look similar may still contain different relay lists.
