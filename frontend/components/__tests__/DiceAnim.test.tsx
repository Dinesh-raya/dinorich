import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { DiceAnim } from '../DiceAnim';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DiceAnim', () => {
  it('renders two dice with initial values when not rolling', () => {
    render(<DiceAnim die1={3} die2={5} isRolling={false} />);

    // The dice faces should be rendered as dot grids inside divs
    // We can check the component renders without crashing
    const diceContainer = document.querySelector('.flex.items-center.gap-5');
    expect(diceContainer).toBeInTheDocument();
  });

  it('shows "Rolling..." text when isRolling is true', () => {
    render(<DiceAnim die1={3} die2={5} isRolling={true} />);
    expect(screen.getByText('Rolling...')).toBeInTheDocument();
  });

  it('does not show "Rolling..." when isRolling is false', () => {
    render(<DiceAnim die1={3} die2={5} isRolling={false} />);
    expect(screen.queryByText('Rolling...')).not.toBeInTheDocument();
  });

  it('shows total after dice land (isRolling transitions false with hasLanded)', () => {
    const { rerender } = render(<DiceAnim die1={3} die2={5} isRolling={true} />);

    // Advance past the 1.2s settle timer
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // After 1.2s the dice settle, but hasLanded is set internally.
    // Rerender with isRolling=false to see the total.
    rerender(<DiceAnim die1={3} die2={5} isRolling={false} />);

    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('shows DOUBLES label when dice are equal', () => {
    const { rerender } = render(<DiceAnim die1={4} die2={4} isRolling={true} />);

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    rerender(<DiceAnim die1={4} die2={4} isRolling={false} />);

    expect(screen.getByText('DOUBLES!')).toBeInTheDocument();
  });

  it('shows SNAKE EYES label when dice are both 1', () => {
    const { rerender } = render(<DiceAnim die1={1} die2={1} isRolling={true} />);

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    rerender(<DiceAnim die1={1} die2={1} isRolling={false} />);

    expect(screen.getByText('SNAKE EYES!')).toBeInTheDocument();
  });

  it('does not show DOUBLES label when dice are different', () => {
    const { rerender } = render(<DiceAnim die1={2} die2={5} isRolling={true} />);

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    rerender(<DiceAnim die1={2} die2={5} isRolling={false} />);

    expect(screen.queryByText('DOUBLES!')).not.toBeInTheDocument();
  });

  it('fires onRollComplete callback after 1.5s', () => {
    const onComplete = vi.fn();
    render(<DiceAnim die1={3} die2={5} isRolling={true} onRollComplete={onComplete} />);

    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('does not fire onRollComplete when not rolling', () => {
    const onComplete = vi.fn();
    render(<DiceAnim die1={3} die2={5} isRolling={false} onRollComplete={onComplete} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });





  it('does not show total when showTotal is false', () => {
    const { rerender } = render(
      <DiceAnim die1={3} die2={5} isRolling={true} showTotal={false} />
    );

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    rerender(<DiceAnim die1={3} die2={5} isRolling={false} showTotal={false} />);

    expect(screen.queryByText('Total')).not.toBeInTheDocument();
  });

  it('cleans up timers on unmount', () => {
    const onComplete = vi.fn();
    const { unmount } = render(
      <DiceAnim die1={3} die2={5} isRolling={true} onRollComplete={onComplete} />
    );

    unmount();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Callback should not fire after unmount
    expect(onComplete).not.toHaveBeenCalled();
  });
});
