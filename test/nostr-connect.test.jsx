import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NostrConnect from '../src/components/NostrConnect.jsx';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('NostrConnect signer identity', () => {
  it('copies the full signer fingerprint through keyboard activation and announces success', async () => {
    const user = userEvent.setup(); const fingerprint = 'a'.repeat(64); const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<NostrConnect connect={vi.fn()} disconnect={vi.fn()} pubkey={fingerprint} error={null} />);

    expect(screen.getByText(fingerprint)).toBeVisible();
    const copy = screen.getByRole('button', { name: 'Copy signer fingerprint' }); copy.focus(); await user.keyboard('{Enter}');

    expect(writeText).toHaveBeenCalledWith(fingerprint);
    expect(screen.getByRole('status')).toHaveTextContent('Signer fingerprint copied.');
  });

  it('keeps a bounded failure message when the clipboard is unavailable', async () => {
    const user = userEvent.setup(); vi.stubGlobal('navigator', {});
    render(<NostrConnect connect={vi.fn()} disconnect={vi.fn()} pubkey={'b'.repeat(64)} error={null} />);
    const copy = screen.getByRole('button', { name: 'Copy signer fingerprint' }); copy.focus(); await user.keyboard(' ');
    expect(screen.getByRole('status')).toHaveTextContent('Unable to copy signer fingerprint.');
  });
});
