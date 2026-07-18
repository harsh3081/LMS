/**
 * RED->GREEN — issue #118 (AC1/AC3): first modal/overlay/slide-over
 * primitive in this codebase. Covers open/closed rendering, backdrop-click
 * close, Escape-to-close, close-button close, and the dialog aria wiring
 * (role="dialog", aria-modal, aria-labelledby -> title).
 */
import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SlideOver } from '../../src/components/ui/SlideOver';

function Harness({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <SlideOver open={open} onClose={onClose} title="New Lead">
      <button type="button">first field</button>
      <p>panel body</p>
    </SlideOver>
  );
}

describe('SlideOver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    render(<Harness open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('panel body')).not.toBeInTheDocument();
  });

  it('renders the panel with dialog role and aria wiring to the title when open', () => {
    render(<Harness open onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const titleId = dialog.getAttribute('aria-labelledby');
    expect(titleId).toBeTruthy();
    const titleEl = document.getElementById(titleId as string);
    expect(titleEl).toHaveTextContent('New Lead');
    expect(screen.getByText('panel body')).toBeInTheDocument();
  });

  it('shows a visible close control in the header next to the title', () => {
    render(<Harness open onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Harness open onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Harness open onClose={onClose} />);
    await user.click(screen.getByTestId('slide-over-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when the panel content itself is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Harness open onClose={onClose} />);
    await user.click(screen.getByText('panel body'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed while open', () => {
    const onClose = vi.fn();
    render(<Harness open onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not respond to Escape when closed', () => {
    const onClose = vi.fn();
    render(<Harness open={false} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('removes the keydown listener on unmount (no stray close calls after unmount)', () => {
    const onClose = vi.fn();
    const { unmount } = render(<Harness open onClose={onClose} />);
    unmount();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('moves focus into the panel (close button) when opened', () => {
    render(<Harness open onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /close/i })).toHaveFocus();
  });

  it('restores focus to the trigger element when closed', () => {
    function Wrapper() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            open trigger
          </button>
          <SlideOver open={open} onClose={() => setOpen(false)} title="New Lead">
            <p>panel body</p>
          </SlideOver>
        </div>
      );
    }
    render(<Wrapper />);
    const trigger = screen.getByRole('button', { name: /open trigger/i });
    trigger.focus();
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger).toHaveFocus();
  });
});
