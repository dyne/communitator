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
- every application-configured blast destination is acceptable;
- every canonical template main relay destination is acceptable.

The preview keeps configured blast destinations and template relay destinations in separate lists. If the same canonical relay appears in both, publication contacts it once. One apply operation opens at most four WebSocket connections across all event kinds combined.

If the link is invalid or the data does not pass validation, Communitator stops and displays an error instead of presenting an apply action.

## Connect a signer

The web application expects a NIP-07-compatible browser extension. Choosing **Connect** requests the public key only. It does not sign or publish anything.

::: warning Use HTTPS
Browser extensions and signing integrations should be used in a secure context. Run the production app over HTTPS and verify the origin before approving a signature.
:::

## Apply and publish

After you choose **Apply template and publish reviewed events**, Communitator prepares only the reviewed kinds: `10002`, plus `10063` and `10050` when those sections are present. Your extension shows each signature request. Signed events are then published to the deduplicated union of the configured blast destinations and canonical template relay destinations shown in the preview.

The results distinguish:

- successful and failed event kinds;
- positive NIP-01 `OK` acknowledgements and rejected/unreachable publication destinations;
- complete, partial, failed, and cancelled outcomes;
- retryable failures without asking the signer to sign retained events again.

A partial result does not necessarily mean the signed event is unusable. Relays can be offline or reject a publish independently. Contacting a public relay exposes your network connection to that operator; read the per-event result before retrying.

For deployment headers, residual GitHub Pages limitations, and disclosure guidance, read the [security and hosting guide](./security).

## If something looks wrong

Do not approve a signature for unfamiliar endpoints. Close the page and ask the community maintainer for a verified link. Because the full configuration is embedded in the URL, two links that look similar may still contain different relay lists.
