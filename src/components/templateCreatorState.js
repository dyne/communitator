import { TEMPLATE_LIMITS } from '../utils/templates.js';
/** @typedef {{ id: string, url: string, read?: boolean, write?: boolean }} Endpoint */
/** @typedef {{ name: string, description: string, selectedPreset: string, shareUrl: string, error: string, touched: Record<string, boolean>, relays: Endpoint[], blossomServers: Endpoint[], showBlossom: boolean, dmRelays: Endpoint[], showDmRelays: boolean, [key: string]: any }} CreatorState */
/** @typedef {{ type: string, [key: string]: any }} CreatorAction */
let nextEndpointId = 0;
const groupLimit = Object.freeze({ relays: TEMPLATE_LIMITS.relays, blossomServers: TEMPLATE_LIMITS.blossomServers, dmRelays: TEMPLATE_LIMITS.dmRelays });
/** @param {Partial<Endpoint>} values @returns {Endpoint} */
const endpoint = (values = {}) => ({ id: `endpoint-${nextEndpointId += 1}`, url: '', ...values });
/** @returns {CreatorState} */
export const initialCreatorState = () => ({ name: '', description: '', selectedPreset: '', shareUrl: '', error: '', touched: {}, relays: [endpoint({ url: 'wss://your.relay', read: true, write: true })], blossomServers: [endpoint({ url: 'https://your.blossom' })], showBlossom: true, dmRelays: [endpoint({ url: 'wss://dm.relay' })], showDmRelays: true });
const update = (items, id, changes) => items.map((item) => item.id === id ? { ...item, ...changes } : item);
const remove = (items, id) => items.length === 1 ? items : items.filter((item) => item.id !== id);
/** Immutable UI-only draft reducer. Canonicalization happens only on submit. */
/** @param {CreatorState} state @param {CreatorAction} action @returns {CreatorState} */
export function creatorReducer(state, action) { switch (action.type) {
  case 'field': return { ...state, [action.field]: action.value, error: '', shareUrl: '' };
  case 'touched': return { ...state, touched: { ...state.touched, [action.field]: true } };
  case 'touch-many': return { ...state, touched: { ...state.touched, ...Object.fromEntries(action.fields.map((field) => [field, true])) } };
  case 'add': return state[action.group].length >= groupLimit[action.group] ? state : { ...state, [action.group]: [...state[action.group], endpoint(action.value)], error: '', shareUrl: '' };
  case 'update': return { ...state, [action.group]: update(state[action.group], action.id, action.value), error: '', shareUrl: '' };
  case 'remove': { const touched = { ...state.touched }; delete touched[action.id]; return { ...state, [action.group]: remove(state[action.group], action.id), touched, error: '', shareUrl: '' }; }
  case 'toggle': return { ...state, [action.field]: !state[action.field], error: '', shareUrl: '' };
  case 'error': return { ...state, error: action.value, shareUrl: '' };
  case 'shared': return { ...state, shareUrl: action.value, error: '' };
  case 'preset': { const draft = action.template; return { ...state, selectedPreset: action.key, name: draft.name, description: draft.description, relays: draft.relays.map((item) => endpoint(item)), blossomServers: (draft.blossomServers?.length ? draft.blossomServers : [{}]).map((item) => endpoint(item)), dmRelays: (draft.dmRelays?.length ? draft.dmRelays : [{}]).map((item) => endpoint(item)), showBlossom: Boolean(draft.blossomServers?.length), showDmRelays: Boolean(draft.dmRelays?.length), touched: {}, error: '', shareUrl: '' }; }
  case 'reset': return initialCreatorState(); default: return state;
} }
