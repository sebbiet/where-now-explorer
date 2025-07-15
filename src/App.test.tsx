import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

vi.mock('@/services/analytics.service', () => ({
  analytics: {
    trackError: vi.fn(),
    trackPageView: vi.fn(),
  },
}));

vi.mock('@/services/production.service', () => ({
  productionService: {
    initialize: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(document.body).toBeTruthy();
  });

  it('renders loading spinner while lazy loading', async () => {
    render(<App />);
    const loadingText = screen.getByText(/Finding your location/i);
    expect(loadingText).toBeInTheDocument();
  });
});
