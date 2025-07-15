import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PullToRefresh from '../PullToRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import React from 'react';

// Mock dependencies
vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: vi.fn()
}));

vi.mock('../LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>
}));

describe('PullToRefresh', () => {
  const mockOnRefresh = vi.fn();
  const mockContainerRef = { current: document.createElement('div') };
  
  const defaultHookReturn = {
    containerRef: mockContainerRef,
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
    pullProgress: 0
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePullToRefresh).mockReturnValue(defaultHookReturn);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial render', () => {
    it('should render children normally when not pulling', () => {
      render(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div data-testid="child-content">Child content</div>
        </PullToRefresh>
      );

      expect(screen.getByTestId('child-content')).toHaveTextContent('Child content');
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    it('should call usePullToRefresh with correct props', () => {
      render(
        <PullToRefresh onRefresh={mockOnRefresh} disabled={true}>
          <div>Content</div>
        </PullToRefresh>
      );

      expect(usePullToRefresh).toHaveBeenCalledWith({
        onRefresh: mockOnRefresh,
        threshold: 80,
        disabled: true
      });
    });

    it('should default disabled to false', () => {
      render(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div>Content</div>
        </PullToRefresh>
      );

      expect(usePullToRefresh).toHaveBeenCalledWith({
        onRefresh: mockOnRefresh,
        threshold: 80,
        disabled: false
      });
    });
  });

  describe('pull gesture tracking', () => {
    it('should show pull indicator when pulling', () => {
      vi.mocked(usePullToRefresh).mockReturnValue({
        ...defaultHookReturn,
        isPulling: true,
        pullDistance: 50,
        pullProgress: 0.5
      });

      render(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div data-testid="child-content">Content</div>
        </PullToRefresh>
      );

      // Pull indicator should be visible
      const indicator = screen.getByText('↓');
      expect(indicator).toBeInTheDocument();
      
      // Content should be transformed
      const content = screen.getByTestId('child-content').parentElement;
      expect(content).toHaveStyle('transform: translateY(50px)');
    });

    it('should rotate arrow based on pull progress', () => {
      vi.mocked(usePullToRefresh).mockReturnValue({
        ...defaultHookReturn,
        isPulling: true,
        pullDistance: 40,
        pullProgress: 0.8
      });

      render(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div>Content</div>
        </PullToRefresh>
      );

      const arrow = screen.getByText('↓');
      expect(arrow.parentElement).toHaveStyle('transform: rotate(144deg)');
    });

    it('should limit pull distance transform to 100px', () => {
      vi.mocked(usePullToRefresh).mockReturnValue({
        ...defaultHookReturn,
        isPulling: true,
        pullDistance: 150, // More than 100
        pullProgress: 1
      });

      render(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div data-testid="child-content">Content</div>
        </PullToRefresh>
      );

      const indicator = screen.getByText('↓').closest('div');
      expect(indicator).toHaveStyle('transform: translateY(100px)');
      
      const content = screen.getByTestId('child-content').parentElement;
      expect(content).toHaveStyle('transform: translateY(100px)');
    });
  });

  describe('refresh threshold detection', () => {
    it('should show different visual state when threshold is reached', () => {
      vi.mocked(usePullToRefresh).mockReturnValue({
        ...defaultHookReturn,
        isPulling: true,
        pullDistance: 80,
        pullProgress: 1
      });

      render(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div>Content</div>
        </PullToRefresh>
      );

      const arrow = screen.getByText('↓');
      expect(arrow.parentElement).toHaveStyle('transform: rotate(180deg)');
    });

    it('should handle partial pull progress correctly', () => {
      vi.mocked(usePullToRefresh).mockReturnValue({
        ...defaultHookReturn,
        isPulling: true,
        pullDistance: 30,
        pullProgress: 0.3
      });

      render(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div>Content</div>
        </PullToRefresh>
      );

      const indicatorContainer = screen.getByText('↓').closest('div')?.parentElement;
      expect(indicatorContainer).toHaveStyle('opacity: 0.6'); // pullProgress * 2 = 0.6
    });
  });

  describe('loading state during refresh', () => {
    it('should show loading spinner when refreshing', () => {
      vi.mocked(usePullToRefresh).mockReturnValue({
        ...defaultHookReturn,
        isRefreshing: true
      });

      render(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div data-testid="child-content">Content</div>
        </PullToRefresh>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.queryByText('↓')).not.toBeInTheDocument();
    });

    it('should transform content when refreshing', () => {
      vi.mocked(usePullToRefresh).mockReturnValue({
        ...defaultHookReturn,
        isRefreshing: true
      });

      render(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div data-testid="child-content">Content</div>
        </PullToRefresh>
      );

      const content = screen.getByTestId('child-content').parentElement;
      expect(content).toHaveStyle('transform: translateY(60px)');
    });
  });

  describe('completion handling', () => {
    it('should hide indicator when refresh completes', () => {
      const { rerender } = render(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div data-testid="child-content">Content</div>
        </PullToRefresh>
      );

      // Start with refreshing state
      vi.mocked(usePullToRefresh).mockReturnValue({
        ...defaultHookReturn,
        isRefreshing: true
      });

      rerender(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div data-testid="child-content">Content</div>
        </PullToRefresh>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      // Complete refresh
      vi.mocked(usePullToRefresh).mockReturnValue({
        ...defaultHookReturn,
        isRefreshing: false,
        isPulling: false
      });

      rerender(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div data-testid="child-content">Content</div>
        </PullToRefresh>
      );

      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      
      const content = screen.getByTestId('child-content').parentElement;
      expect(content).toHaveStyle('transform: translateY(0)');
    });
  });

  describe('disabled state', () => {
    it('should not show pull indicator when disabled', () => {
      vi.mocked(usePullToRefresh).mockReturnValue({
        ...defaultHookReturn,
        isPulling: false // Hook should handle disabled state
      });

      render(
        <PullToRefresh onRefresh={mockOnRefresh} disabled={true}>
          <div data-testid="child-content">Content</div>
        </PullToRefresh>
      );

      expect(screen.queryByText('↓')).not.toBeInTheDocument();
      
      const content = screen.getByTestId('child-content').parentElement;
      expect(content).toHaveStyle('transform: translateY(0)');
    });

    it('should pass disabled prop to usePullToRefresh hook', () => {
      render(
        <PullToRefresh onRefresh={mockOnRefresh} disabled={true}>
          <div>Content</div>
        </PullToRefresh>
      );

      expect(usePullToRefresh).toHaveBeenCalledWith(
        expect.objectContaining({ disabled: true })
      );
    });
  });

  describe('visual styling', () => {
    it('should apply correct opacity based on pull progress', () => {
      vi.mocked(usePullToRefresh).mockReturnValue({
        ...defaultHookReturn,
        isPulling: true,
        pullProgress: 0.4
      });

      render(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div>Content</div>
        </PullToRefresh>
      );

      const indicatorContainer = screen.getByText('↓').closest('div')?.parentElement;
      expect(indicatorContainer).toHaveStyle('opacity: 0.8'); // Math.min(0.4 * 2, 1)
    });

    it('should cap opacity at 1', () => {
      vi.mocked(usePullToRefresh).mockReturnValue({
        ...defaultHookReturn,
        isPulling: true,
        pullProgress: 0.8
      });

      render(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div>Content</div>
        </PullToRefresh>
      );

      const indicatorContainer = screen.getByText('↓').closest('div')?.parentElement;
      expect(indicatorContainer).toHaveStyle('opacity: 1'); // Math.min(0.8 * 2, 1) = 1
    });

    it('should have correct CSS classes for styling', () => {
      vi.mocked(usePullToRefresh).mockReturnValue({
        ...defaultHookReturn,
        isPulling: true
      });

      render(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div>Content</div>
        </PullToRefresh>
      );

      const indicator = screen.getByText('↓').closest('.bg-white');
      expect(indicator).toHaveClass('dark:bg-gray-800', 'rounded-full', 'p-3', 'shadow-lg');
    });
  });

  describe('async refresh handling', () => {
    it('should handle promise-based onRefresh', async () => {
      const asyncRefresh = vi.fn().mockResolvedValue(undefined);
      
      render(
        <PullToRefresh onRefresh={asyncRefresh}>
          <div>Content</div>
        </PullToRefresh>
      );

      expect(usePullToRefresh).toHaveBeenCalledWith(
        expect.objectContaining({ onRefresh: asyncRefresh })
      );
    });

    it('should handle synchronous onRefresh', () => {
      const syncRefresh = vi.fn();
      
      render(
        <PullToRefresh onRefresh={syncRefresh}>
          <div>Content</div>
        </PullToRefresh>
      );

      expect(usePullToRefresh).toHaveBeenCalledWith(
        expect.objectContaining({ onRefresh: syncRefresh })
      );
    });
  });

  describe('container ref handling', () => {
    it('should pass container ref from hook to DOM element', () => {
      const container = render(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div>Content</div>
        </PullToRefresh>
      );

      // The hook should be called and the ref should be attached
      expect(usePullToRefresh).toHaveBeenCalledWith(
        expect.objectContaining({
          onRefresh: mockOnRefresh,
          threshold: 80,
          disabled: false
        })
      );
      
      // Container should have relative positioning for the pull indicator
      const containerElement = container.container.firstChild as HTMLElement;
      expect(containerElement).toHaveClass('relative');
    });
  });

  describe('edge cases', () => {
    it('should handle zero pull distance', () => {
      vi.mocked(usePullToRefresh).mockReturnValue({
        ...defaultHookReturn,
        isPulling: true,
        pullDistance: 0,
        pullProgress: 0
      });

      render(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div data-testid="child-content">Content</div>
        </PullToRefresh>
      );

      const content = screen.getByTestId('child-content').parentElement;
      expect(content).toHaveStyle('transform: translateY(0px)');
    });

    it('should handle negative pull distance', () => {
      vi.mocked(usePullToRefresh).mockReturnValue({
        ...defaultHookReturn,
        isPulling: true,
        pullDistance: -10,
        pullProgress: 0
      });

      render(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div data-testid="child-content">Content</div>
        </PullToRefresh>
      );

      const content = screen.getByTestId('child-content').parentElement;
      expect(content).toHaveStyle('transform: translateY(0px)'); // Math.min(-10, 100) = -10, but should be 0
    });
  });
});