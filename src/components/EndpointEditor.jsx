/** Presentation-only endpoint editor: it reports draft changes but has no signer, transport, or schema access. */
const EndpointEditor = ({ endpoint, group, index, removable, onUpdate, onRemove, onTouched, error, relay = false }) => {
  const websocket = group !== 'blossom';
  const inputId = `${group}-${endpoint.id}`; const helpId = `${inputId}-help`; const errorId = `${inputId}-error`;
  return <div className="relay-item">
  <label className="sr-only" htmlFor={inputId}>{group} endpoint {index + 1}</label>
  <div className="endpoint-input"><input id={inputId} type="url" inputMode="url" required maxLength={2048} value={endpoint.url} onBlur={() => onTouched(endpoint.id)} onChange={(event) => onUpdate(endpoint.id, { url: event.target.value })} placeholder={websocket ? 'wss://relay.example.com' : 'https://cdn.example.com'} className="relay-input" aria-invalid={error ? 'true' : undefined} aria-describedby={`${helpId}${error ? ` ${errorId}` : ''}`} aria-errormessage={error ? errorId : undefined} />
  <p id={helpId} className="helper-text">{websocket ? 'Use a secure WebSocket URL beginning with wss://.' : 'Use a secure HTTPS URL beginning with https://.'}</p>{error && <p id={errorId} className="field-error" role="alert">{error}</p>}</div>
  {relay && <fieldset className="permission-options"><legend className="sr-only">Permissions for endpoint {index + 1}</legend><label><input type="checkbox" checked={Boolean(endpoint.read)} onBlur={() => onTouched(endpoint.id)} onChange={(event) => onUpdate(endpoint.id, { read: event.target.checked })} /> Inbox (read)</label><label><input type="checkbox" checked={Boolean(endpoint.write)} onBlur={() => onTouched(endpoint.id)} onChange={(event) => onUpdate(endpoint.id, { write: event.target.checked })} /> Outbox (write)</label></fieldset>}
  <button type="button" onClick={() => onRemove(endpoint.id)} className="btn-danger" disabled={!removable} aria-label={`Remove ${group} endpoint ${index + 1}`}>Remove</button>
</div>;
};
export default EndpointEditor;
