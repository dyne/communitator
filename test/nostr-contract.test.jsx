import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NostrConnect from '../src/components/NostrConnect.jsx';
import useNostr from '../src/hooks/useNostr.js';

class RelayAcknowledgingWebSocket {
  /** @type {((event?: Event) => void) | undefined} */
  onopen;
  /** @type {((event: {data: string}) => void) | undefined} */
  onmessage;

  constructor(url) {
    this.url = url;
    queueMicrotask(() => this.onopen?.());
  }

  send(payload) {
    const [, event] = JSON.parse(payload);
    queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(['OK', event.id, true, 'accepted']) }));
  }

  close() {}
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('signer and relay characterization', () => {
  it.todo('L1.3 explicit-verified-signer: page load and template review make zero signer calls');

  it('keeps a missing signer behind the explicit connect control', async () => {
    vi.stubGlobal('nostr', undefined);
    const setConnectedPubkey = vi.fn();
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const user = userEvent.setup();

    render(<NostrConnect setConnectedPubkey={setConnectedPubkey} />);
    await user.click(screen.getByRole('button', { name: /connect with extension/i }));

    expect(alert).toHaveBeenCalledWith(expect.stringContaining('Please install a Nostr extension'));
    expect(setConnectedPubkey).not.toHaveBeenCalled();
  });

  it('uses an injected WebSocket and records a matching relay acknowledgement', async () => {
    vi.stubGlobal('WebSocket', RelayAcknowledgingWebSocket);
    const { result, unmount } = renderHook(() => useNostr());

    let publication;
    await act(async () => {
      publication = await result.current.publishToRelays({
        id: 'event-id',
        sig: 'signature',
        kind: 10002,
        pubkey: 'a'.repeat(64),
        created_at: 1,
        tags: [],
        content: '',
      }, ['wss://relay.example']);
    });
    unmount();

    expect(publication).toEqual([{ url: 'wss://relay.example/', success: true }]);
  });
});
