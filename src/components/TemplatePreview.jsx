import { BLAST_RELAYS, displayEndpoint } from '../utils/templates.js';

const permissions = (relay) => relay.read && relay.write ? 'Read and write' : relay.read ? 'Read only' : 'Write only';

const EndpointList = ({ children, title }) => (
  <section className="relay-preview destination-preview" aria-label={title}>
    <h5>{title}</h5>
    <ul>{children}</ul>
  </section>
);

/** Read-only canonical template and publication-destination presentation. */
const TemplatePreview = ({ template }) => (
  <section className="template-preview" aria-labelledby="review-title">
    <h3 id="review-title">Review before approval</h3>
    <p className="warning-copy">Shared templates are untrusted recommendations. Confirm every endpoint and permission before applying.</p>
    <h4>{template.name}</h4>
    {template.description && <p>{template.description}</p>}

    <EndpointList title="Kind 10002 — relay list">
      {template.relays.map((relay) => (
        <li key={relay.url}>
          <code className="relay-url">{displayEndpoint(relay.url)}</code>
          <span className="relay-permissions">{permissions(relay)}</span>
        </li>
      ))}
    </EndpointList>
    {template.blossomServers.length > 0 && (
      <EndpointList title="Kind 10063 — Blossom servers">
        {template.blossomServers.map((server) => <li key={server.url}><code className="relay-url">{displayEndpoint(server.url)}</code></li>)}
      </EndpointList>
    )}
    {template.dmRelays.length > 0 && (
      <EndpointList title="Kind 10050 — DM relays">
        {template.dmRelays.map((relay) => <li key={relay.url}><code className="relay-url">{displayEndpoint(relay.url)}</code></li>)}
      </EndpointList>
    )}

    <section className="publication-preview" aria-labelledby="publication-title">
      <h4 id="publication-title">Publication destinations</h4>
      <p className="helper-text">After every requested signature is verified, the signed events are sent to the destination groups below. An endpoint present in both groups is contacted once. At most four relay connections are open across the whole operation.</p>
      <EndpointList title={`Configured blast destinations (${BLAST_RELAYS.length})`}>
        {BLAST_RELAYS.map(({ url }) => <li key={url}><code className="relay-url">{displayEndpoint(url)}</code></li>)}
      </EndpointList>
      <EndpointList title={`Template relay destinations (${template.relays.length})`}>
        {template.relays.map(({ url }) => <li key={url}><code className="relay-url">{displayEndpoint(url)}</code></li>)}
      </EndpointList>
    </section>
  </section>
);

export default TemplatePreview;
