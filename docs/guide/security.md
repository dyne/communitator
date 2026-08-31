# Security and hosting

Communitator treats shared templates as untrusted recommendations. It accepts a bounded versioned payload, validates and normalizes endpoints, and shows the canonical review before it requests a signer identity or signature. The review enumerates configured blast destinations and canonical template relay destinations separately. Connect requests only the public key; Apply requests signatures for the reviewed event kinds and then contacts the deduplicated union of those displayed groups, with at most four sockets across the whole operation. Positive NIP-01 `OK` acknowledgements determine complete, partial, failed, or cancelled outcomes.

Public relays are independent services and can observe the connection that publishes an event. Review all endpoints and destination results before retrying.

## Production host contract

The static page ships a restrictive meta CSP. Production hosting must also provide `frame-ancestors 'none'`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, and a restrictive Permissions Policy. GitHub Pages cannot set these response headers, so use a header-capable host/CDN for production. The complete disclosure process and release checklist are in the repository’s `SECURITY.md`.
