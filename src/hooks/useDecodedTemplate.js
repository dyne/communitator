import { useEffect, useState } from 'react';
import { decodeTemplate } from '../utils/templates';

/** @typedef {{ encoded: string | null, template: import('../utils/templates').Template | null, error: string }} DecodedTemplateState */

/** Converts a route payload into an immutable canonical template before UI presentation. */
export default function useDecodedTemplate(encoded) {
  const [state, setState] = useState(/** @type {DecodedTemplateState} */ ({ encoded: null, template: null, error: '' }));
  useEffect(() => { try { if (!encoded) throw new Error(); setState({ encoded, template: decodeTemplate(encoded), error: '' }); } catch { setState({ encoded, template: null, error: 'This template link is invalid or unsupported.' }); } }, [encoded]);

  // Never present a previous route's reviewed data while the new route is decoding.
  return state.encoded === encoded ? state : { template: null, error: '' };
}
