import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createElement, Fragment } from 'react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    createElement(Fragment, null, children),
  motion: new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        return ({ children, ...rest }: any) => createElement(prop, rest, children);
      },
    }
  ),
}));

import { CenterGameLog } from '../CenterGameLog';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CenterGameLog', () => {
  it('renders null when historyLog is empty', () => {
    const { container } = render(<CenterGameLog historyLog={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders log entries when history is provided', () => {
    render(
      <CenterGameLog historyLog={['Player 1 rolled 7', 'Player 1 landed on GO']} />
    );

    expect(screen.getByText('Player 1 rolled 7')).toBeInTheDocument();
    expect(screen.getByText('Player 1 landed on GO')).toBeInTheDocument();
  });

  it('shows "Activity" label', () => {
    render(<CenterGameLog historyLog={['Some event']} />);
    expect(screen.getByText('Activity')).toBeInTheDocument();
  });

  it('renders buy icon for bought events', () => {
    const { container } = render(
      <CenterGameLog historyLog={['Player 1 bought Guwahati']} />
    );
    // The buy icon 🏪 should be present in a span before the log text
    const iconSpans = container.querySelectorAll('span.text-sm');
    expect(iconSpans.length).toBe(1);
    expect(iconSpans[0].textContent).toBe('\uD83C\uDFEA');
  });

  it('renders rent icon for paid rent events', () => {
    const { container } = render(
      <CenterGameLog historyLog={['Player 2 paid rent to Player 1']} />
    );
    const iconSpans = container.querySelectorAll('span.text-sm');
    expect(iconSpans[0].textContent).toBe('\uD83D\uDCB5');
  });

  it('renders jail icon for jail events', () => {
    const { container } = render(
      <CenterGameLog historyLog={['Player 1 sent to jail']} />
    );
    const iconSpans = container.querySelectorAll('span.text-sm');
    expect(iconSpans[0].textContent).toBe('\uD83D\uDD12');
  });

  it('renders dice icon for dice events', () => {
    const { container } = render(
      <CenterGameLog historyLog={['Player 1 rolled the dice']} />
    );
    const iconSpans = container.querySelectorAll('span.text-sm');
    expect(iconSpans[0].textContent).toBe('\uD83C\uDFB2');
  });

  it('renders trophy icon for won events', () => {
    const { container } = render(
      <CenterGameLog historyLog={['Player 1 won the game!']} />
    );
    const iconSpans = container.querySelectorAll('span.text-sm');
    expect(iconSpans[0].textContent).toBe('\uD83C\uDFC6');
  });

  it('renders default pin icon for unknown event types', () => {
    const { container } = render(
      <CenterGameLog historyLog={['Something happened']} />
    );
    const iconSpans = container.querySelectorAll('span.text-sm');
    expect(iconSpans[0].textContent).toBe('\uD83D\uDCCC');
  });

  it('renders auction icon for auction events', () => {
    const { container } = render(
      <CenterGameLog historyLog={['Auction started for property']} />
    );
    const iconSpans = container.querySelectorAll('span.text-sm');
    expect(iconSpans[0].textContent).toBe('\uD83D\uDD28');
  });

  it('renders build icon for built events', () => {
    const { container } = render(
      <CenterGameLog historyLog={['Player 1 built a house']} />
    );
    const iconSpans = container.querySelectorAll('span.text-sm');
    expect(iconSpans[0].textContent).toBe('\uD83C\uDFD7\uFE0F');
  });

  it('renders bank icon for mortgaged events', () => {
    const { container } = render(
      <CenterGameLog historyLog={['Player 1 mortgaged property']} />
    );
    const iconSpans = container.querySelectorAll('span.text-sm');
    expect(iconSpans[0].textContent).toBe('\uD83C\uDFE6');
  });

  it('renders multiple log entries', () => {
    const logs = [
      'Game started',
      'Player 1 rolled 7',
      'Player 1 bought Goa',
      'Player 2 rolled 5',
    ];
    render(<CenterGameLog historyLog={logs} />);

    for (const log of logs) {
      expect(screen.getByText(log)).toBeInTheDocument();
    }
  });

  it('renders skull icon for bankrupt events', () => {
    const { container } = render(
      <CenterGameLog historyLog={['Player 1 is bankrupt']} />
    );
    const iconSpans = container.querySelectorAll('span.text-sm');
    expect(iconSpans[0].textContent).toBe('\uD83D\uDC80');
  });

  it('renders tax icon for tax events', () => {
    const { container } = render(
      <CenterGameLog historyLog={['Player 1 landed on Income Tax']} />
    );
    const iconSpans = container.querySelectorAll('span.text-sm');
    expect(iconSpans[0].textContent).toBe('\uD83E\uDDFE');
  });

  it('renders GO icon for passed GO events', () => {
    const { container } = render(
      <CenterGameLog historyLog={['Player 1 passed GO']} />
    );
    const iconSpans = container.querySelectorAll('span.text-sm');
    expect(iconSpans[0].textContent).toBe('\uD83C\uDFC1');
  });
});
