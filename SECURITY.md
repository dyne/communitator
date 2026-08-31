# Security policy

## Trust model

Communitator treats every shared template link as an **untrusted recommendation**. It decodes only the bounded versioned template format, validates and normalizes endpoints, then shows the canonical result for review. Before consent, it enumerates the application-configured blast destinations separately from the canonical template relay destinations. A NIP-07 extension is trusted only to return the selected public key and sign the events the user explicitly approves. Public relays are untrusted network peers: publication uses the deduplicated union of the two displayed groups, opens at most four sockets across all event kinds combined, and requires a positive NIP-01 `OK` acknowledgement before a destination counts as accepted.

The browser requests signatures only after **Connect** and then **Apply**. It may create kind 10002 (relay list), kind 10063 (Blossom servers), and kind 10050 (DM relays) when those template sections are present. A result can be complete, partial, failed, or cancelled; partial/failed results retain accepted acknowledgements and may offer a retry without another signature request.

## Supported versions and disclosure

The current main branch and latest tagged release are supported. Please report vulnerabilities privately to the repository maintainers through the forge's private security-contact facility; do not include secrets, private keys, or signed personal events in a public issue. Maintainers acknowledge reports, assess impact, and publish a coordinated fix or mitigation when practical. Dependency advisories are triaged promptly and high-severity reachable issues receive an expedited release.

## Hosting contract

The static HTML delivers a restrictive meta CSP for supported directives. A production host must also send these headers:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' wss:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
```

GitHub Pages cannot configure response headers, including `frame-ancestors`; its deployment therefore retains that residual framing-policy risk. Use a host/CDN with response-header support for production. HTTPS is required for production signer use. No source maps or secrets are emitted in the release build.

## Release checklist

- Run the application checks, coverage, audit, and documentation build from clean installs.
- Inspect built HTML for the CSP and for unexpected inline or third-party resources.
- Confirm the reviewed signer prompts, event kinds, and blast destinations match the release fixtures.
- Verify production response headers at the deployed origin.
