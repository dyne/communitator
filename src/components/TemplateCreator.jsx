import { useReducer, useRef } from 'react';
import { canonicalizeEndpoint, canonicalizeTemplate, encodeTemplate, generateTemplateId, getCommunityTemplates, TEMPLATE_LIMITS } from '../utils/templates';
import EndpointEditor from './EndpointEditor';
import RelayList from './RelayList';
import { creatorReducer, initialCreatorState } from './templateCreatorState';

const endpointError = (item, kind, relay) => {
  if (!item.url) return `Enter a ${kind === 'blossom' ? 'Blossom server' : 'relay'} endpoint.`;
  if (Array.from(item.url).length > TEMPLATE_LIMITS.url) return `Endpoint must be ${TEMPLATE_LIMITS.url} characters or fewer.`;
  if (relay && !item.read && !item.write) return 'Choose at least one relay permission.';
  try { canonicalizeEndpoint(item.url, kind); return ''; }
  catch { return kind === 'blossom' ? 'Enter a valid secure HTTPS URL beginning with https://.' : 'Enter a valid secure WebSocket URL beginning with wss://.'; }
};

/** UI guidance mirrors the canonical boundary; canonicalizeTemplate remains authoritative on submit. */
export const validateCreatorDraft = (state) => {
  const errors = new Map();
  if (!state.name.trim()) errors.set('name', 'Enter a template name.');
  else if (Array.from(state.name).length > TEMPLATE_LIMITS.name) errors.set('name', `Template name must be ${TEMPLATE_LIMITS.name} characters or fewer.`);
  if (Array.from(state.description).length > TEMPLATE_LIMITS.description) errors.set('description', `Description must be ${TEMPLATE_LIMITS.description} characters or fewer.`);
  const groups = [
    [state.relays, 'relay', true],
    ...(state.showBlossom ? [[state.blossomServers, 'blossom', false]] : []),
    ...(state.showDmRelays ? [[state.dmRelays, 'dm', false]] : []),
  ];
  for (const [items, kind, relay] of groups) for (const item of items) { const error = endpointError(item, kind, relay); if (error) errors.set(item.id, error); }
  return errors;
};

/** @param {{ title: string, group: string, items: any[], shown: boolean, onToggle?: () => void, onAdd: () => void, onUpdate: (...args: any[]) => void, onRemove: (...args: any[]) => void, onTouched: (id: string) => void, errors: Map<string, string>, relay?: boolean }} props */
const CreatorGroup = ({ title, group, items, shown, onToggle, onAdd, onUpdate, onRemove, onTouched, errors, relay }) => { const contentId = `${group}-endpoint-fields`; return <fieldset className="form-group endpoint-group">
  <legend>{title}</legend>{onToggle && <button type="button" className="btn-secondary toggle-btn" onClick={onToggle} aria-expanded={shown} aria-controls={contentId}>{shown ? `Hide ${title}` : `Show ${title}`}</button>}
  {shown && <div id={contentId}><p className="helper-text">{relay ? 'Choose the read and write permission for every relay.' : 'Endpoints are validated and normalized when you generate the shared link.'}</p>
    {relay ? <RelayList relays={items} onUpdate={onUpdate} onRemove={onRemove} onTouched={onTouched} errors={errors} /> : items.map((item, index) => <EndpointEditor key={item.id} endpoint={item} group={group} index={index} removable={items.length > 1} onUpdate={onUpdate} onRemove={onRemove} onTouched={onTouched} error={errors.get(item.id)} />)}
    <button type="button" className="btn-secondary add-btn" onClick={onAdd}>Add {group} endpoint</button></div>}
</fieldset>; };

const TemplateCreator = () => {
  const [state, dispatch] = useReducer(creatorReducer, undefined, initialCreatorState);
  const errorRef = useRef(/** @type {HTMLDivElement | null} */ (null)); const presets = getCommunityTemplates();
  const validation = validateCreatorDraft(state);
  const shownErrors = new Map([...validation].filter(([field]) => state.touched[field]));
  const update = (group) => (id, value) => dispatch({ type: 'update', group, id, value });
  const remove = (group) => (id) => dispatch({ type: 'remove', group, id });
  const touch = (id) => dispatch({ type: 'touched', field: id });
  /** @param {import('react').FormEvent<HTMLFormElement>} event */
  const submit = (event) => {
    event.preventDefault();
    if (validation.size) {
      const fields = [...validation.keys()]; dispatch({ type: 'touch-many', fields }); const first = fields[0];
      requestAnimationFrame(() => {
        const target = /** @type {HTMLElement | null} */ (first === 'name' ? document.getElementById('template-name') : first === 'description' ? document.getElementById('template-description') : document.querySelector(`input[id$="-${first}"]`));
        target?.focus();
      });
      return;
    }
    try {
      /** @param {{ url: string, read?: boolean, write?: boolean }} item */
      const toRelay = (item) => ({ url: item.url, read: Boolean(item.read), write: Boolean(item.write) });
      /** @param {{ url: string }} item */
      const toEndpoint = (item) => ({ url: item.url });
      const template = canonicalizeTemplate({ id: generateTemplateId(), name: state.name, description: state.description, relays: state.relays.map(toRelay), blossomServers: state.showBlossom ? state.blossomServers.map(toEndpoint) : [], dmRelays: state.showDmRelays ? state.dmRelays.map(toEndpoint) : [], created_at: Math.floor(Date.now() / 1000) });
      const url = `${window.location.origin}${window.location.pathname}#/apply/${encodeTemplate(template)}`;
      dispatch({ type: 'shared', value: url }); navigator.clipboard?.writeText(url).catch(() => {});
    } catch { dispatch({ type: 'error', value: 'Check the template name and endpoint values.' }); requestAnimationFrame(() => errorRef.current?.focus()); }
  };
  return <section className="template-creator" aria-labelledby="creator-title"><h2 id="creator-title">Create settings template</h2><p className="helper-text">Shared templates are untrusted recommendations. Review every endpoint before sharing.</p>
    <form onSubmit={submit} noValidate>
      <fieldset className="community-templates-section"><legend>Community templates</legend><p className="community-templates-description">Load a preset, then review it before generating a link.</p><div className="community-templates-buttons">{Object.entries(presets).map(([key, template]) => <button type="button" key={key} onClick={() => dispatch({ type: 'preset', key, template })} className={`btn-secondary community-template-btn ${state.selectedPreset === key ? 'active-template' : ''}`}>{template.name} <span className="relay-count">({template.relays.length} relays)</span></button>)}</div>{state.selectedPreset && <button type="button" className="btn-secondary clear-template-btn" onClick={() => dispatch({ type: 'reset' })}>Clear preset</button>}</fieldset>
      <div className="form-group"><label htmlFor="template-name">Template name</label><input id="template-name" required maxLength={TEMPLATE_LIMITS.name} value={state.name} onBlur={() => touch('name')} onChange={(event) => dispatch({ type: 'field', field: 'name', value: event.target.value })} placeholder="e.g., My community relays" aria-invalid={shownErrors.has('name') ? 'true' : undefined} aria-errormessage={shownErrors.has('name') ? 'template-name-error' : undefined} aria-describedby={`template-name-help${shownErrors.has('name') ? ' template-name-error' : ''}`} /><p id="template-name-help" className="helper-text">Up to {TEMPLATE_LIMITS.name} characters.</p>{shownErrors.has('name') && <p id="template-name-error" className="field-error" role="alert">{shownErrors.get('name')}</p>}</div>
      <div className="form-group"><label htmlFor="template-description">Description</label><textarea id="template-description" maxLength={TEMPLATE_LIMITS.description} value={state.description} onBlur={() => touch('description')} onChange={(event) => dispatch({ type: 'field', field: 'description', value: event.target.value })} placeholder="Describe this relay set" rows={3} aria-invalid={shownErrors.has('description') ? 'true' : undefined} aria-errormessage={shownErrors.has('description') ? 'template-description-error' : undefined} aria-describedby={`template-description-help${shownErrors.has('description') ? ' template-description-error' : ''}`} /><p id="template-description-help" className="helper-text">Optional, up to {TEMPLATE_LIMITS.description} characters.</p>{shownErrors.has('description') && <p id="template-description-error" className="field-error" role="alert">{shownErrors.get('description')}</p>}</div>
      <CreatorGroup title="Relays (kind 10002)" group="relay" items={state.relays} shown onAdd={() => dispatch({ type: 'add', group: 'relays', value: { read: true, write: true } })} onUpdate={update('relays')} onRemove={remove('relays')} onTouched={touch} errors={shownErrors} relay />
      <CreatorGroup title="Blossom servers (kind 10063)" group="blossom" items={state.blossomServers} shown={state.showBlossom} onToggle={() => dispatch({ type: 'toggle', field: 'showBlossom' })} onAdd={() => dispatch({ type: 'add', group: 'blossomServers' })} onUpdate={update('blossomServers')} onRemove={remove('blossomServers')} onTouched={touch} errors={shownErrors} />
      <CreatorGroup title="DM relays (kind 10050)" group="dm" items={state.dmRelays} shown={state.showDmRelays} onToggle={() => dispatch({ type: 'toggle', field: 'showDmRelays' })} onAdd={() => dispatch({ type: 'add', group: 'dmRelays' })} onUpdate={update('dmRelays')} onRemove={remove('dmRelays')} onTouched={touch} errors={shownErrors} />
      {state.error && <div ref={errorRef} tabIndex={-1} className="error" role="alert">{state.error}</div>}<button type="submit" className="btn-primary">Generate shareable template</button>
    </form>
    {state.shareUrl && <div className="share-box" role="status"><h3>Template created</h3><p>Share this link with your community:</p><label className="sr-only" htmlFor="share-url">Shareable template link</label><input id="share-url" value={state.shareUrl} readOnly /><button type="button" onClick={() => navigator.clipboard?.writeText(state.shareUrl)} className="btn-success">Copy link</button><p className="helper-text share-hint">Recipients choose whether to connect a signer and approve publishing.</p></div>}
  </section>;
};
export default TemplateCreator;
