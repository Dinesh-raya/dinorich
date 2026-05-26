import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { createElement, Fragment } from 'react';
import { ToastContainer, showToast } from '../Toast';

// Mock framer-motion: AnimatePresence just renders children without exit animations,
// motion.div renders a plain div. This avoids DOM retention during exit animations
// which breaks fake-timer-based assertions.
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

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// Helper: render ToastContainer and return it for assertions
function renderToastContainer() {
  return render(<ToastContainer />);
}

describe('showToast', () => {
  it('renders nothing when no toasts are shown', () => {
    renderToastContainer();
    // No toast text should be visible
    expect(screen.queryByText(/.+/)).not.toBeInTheDocument();
  });

  it('renders a toast when showToast is called', () => {
    renderToastContainer();

    act(() => {
      showToast('Hello world', 'info');
    });

    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders toast with correct type icon', () => {
    renderToastContainer();

    act(() => {
      showToast('Success!', 'success');
    });

    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('\u2713')).toBeInTheDocument(); // checkmark icon
  });

  it('renders error toast with correct icon', () => {
    renderToastContainer();

    act(() => {
      showToast('Error!', 'error');
    });

    expect(screen.getByText('\u2715')).toBeInTheDocument(); // X icon
  });

  it('renders warning toast with correct icon', () => {
    renderToastContainer();

    act(() => {
      showToast('Warning!', 'warning');
    });

    expect(screen.getByText('\u26A0')).toBeInTheDocument(); // warning icon
  });

  it('renders info toast with correct icon', () => {
    renderToastContainer();

    act(() => {
      showToast('Info!', 'info');
    });

    expect(screen.getByText('\u2139')).toBeInTheDocument(); // info icon
  });
});

describe('Toast auto-dismiss', () => {
  it('auto-dismisses toast after default duration (3000ms)', () => {
    renderToastContainer();

    act(() => {
      showToast('Gone soon', 'info');
    });

    expect(screen.getByText('Gone soon')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('Gone soon')).not.toBeInTheDocument();
  });

  it('auto-dismisses toast after custom duration', () => {
    renderToastContainer();

    act(() => {
      showToast('Custom duration', 'info', 1000);
    });

    expect(screen.getByText('Custom duration')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByText('Custom duration')).not.toBeInTheDocument();
  });

  it('toast still visible before duration expires', () => {
    renderToastContainer();

    act(() => {
      showToast('Still here', 'info', 5000);
    });

    act(() => {
      vi.advanceTimersByTime(4999);
    });

    expect(screen.getByText('Still here')).toBeInTheDocument();
  });
});

describe('Toast stacking', () => {
  it('renders multiple toasts simultaneously', () => {
    renderToastContainer();

    act(() => {
      showToast('First', 'info');
      showToast('Second', 'success');
      showToast('Third', 'error');
    });

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
  });

  it('enforces max 3 toast limit', () => {
    renderToastContainer();

    act(() => {
      showToast('Toast 1', 'info');
      showToast('Toast 2', 'info');
      showToast('Toast 3', 'info');
      showToast('Toast 4', 'info'); // this should push out toast 1
    });

    // Toast 1 should be gone (slice(-3) keeps last 3)
    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();

    // Toasts 2-4 should be visible
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
    expect(screen.getByText('Toast 3')).toBeInTheDocument();
    expect(screen.getByText('Toast 4')).toBeInTheDocument();
  });

  it('removing one toast does not affect others', () => {
    renderToastContainer();

    act(() => {
      showToast('Keep me', 'info', 10000);
      showToast('Remove me', 'info', 100);
    });

    expect(screen.getByText('Keep me')).toBeInTheDocument();
    expect(screen.getByText('Remove me')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.queryByText('Remove me')).not.toBeInTheDocument();
    expect(screen.getByText('Keep me')).toBeInTheDocument();
  });
});
