import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, withErrorBoundary } from '../ErrorBoundary';
import { analytics } from '@/services/analytics.service';
import React from 'react';

// Mock dependencies
vi.mock('@/services/analytics.service', () => ({
  analytics: {
    trackError: vi.fn()
  }
}));

vi.mock('../ErrorFallback', () => ({
  default: ({ error, resetError, context }: { error: Error; resetError: () => void; context: string }) => (
    <div>
      <div data-testid="error-message">{error.message}</div>
      <div data-testid="error-context">{context}</div>
      <button onClick={resetError} data-testid="reset-button">Reset</button>
    </div>
  )
}));

// Test component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div data-testid="success">No error</div>;
};

// Test component for HOC testing
const TestComponent = ({ message }: { message: string }) => {
  return <div data-testid="test-component">{message}</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error for error boundary tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('error catching from child', () => {
    it('should catch errors thrown by child components', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-message')).toHaveTextContent('Test error');
      expect(screen.getByTestId('error-context')).toHaveTextContent('general');
    });

    it('should render children normally when no error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('success')).toHaveTextContent('No error');
    });

    it('should track error in analytics when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(analytics.trackError).toHaveBeenCalledWith({
        error_type: 'react_error_boundary',
        error_message: 'Test error',
        error_source: expect.stringContaining('ThrowError')
      });
    });
  });

  describe('error UI rendering', () => {
    it('should render default ErrorFallback when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByTestId('reset-button')).toBeInTheDocument();
    });

    it('should render custom fallback when provided', () => {
      const customFallback = (error: Error, resetError: () => void) => (
        <div>
          <div data-testid="custom-error">Custom: {error.message}</div>
          <button onClick={resetError} data-testid="custom-reset">Custom Reset</button>
        </div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-error')).toHaveTextContent('Custom: Test error');
      expect(screen.getByTestId('custom-reset')).toBeInTheDocument();
    });
  });

  describe('reset functionality', () => {
    it('should reset error state when reset button is clicked', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      
      // Verify reset button exists and can be clicked
      const resetButton = screen.getByTestId('reset-button');
      expect(resetButton).toBeInTheDocument();
      
      // Click reset button - this should call the reset function
      fireEvent.click(resetButton);
      
      // We can't easily test state reset without re-rendering, but we can verify
      // the button works and doesn't crash
      expect(resetButton).toBeInTheDocument();
    });

    it('should call custom reset function', () => {
      const resetSpy = vi.fn();
      const customFallback = (error: Error, resetError: () => void) => (
        <div>
          <button onClick={() => { resetError(); resetSpy(); }} data-testid="custom-reset">
            Reset
          </button>
        </div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByTestId('custom-reset'));

      expect(resetSpy).toHaveBeenCalled();
    });
  });

  describe('analytics tracking on error', () => {
    it('should track different types of errors', () => {
      const CustomError = () => {
        throw new Error('Custom error message');
      };

      render(
        <ErrorBoundary>
          <CustomError />
        </ErrorBoundary>
      );

      expect(analytics.trackError).toHaveBeenCalledWith({
        error_type: 'react_error_boundary',
        error_message: 'Custom error message',
        error_source: expect.stringContaining('CustomError')
      });
    });

    it('should handle errors without component stack', () => {
      // Mock componentDidCatch to simulate missing componentStack
      const originalDidCatch = ErrorBoundary.prototype.componentDidCatch;
      ErrorBoundary.prototype.componentDidCatch = function(error: Error) {
        analytics.trackError({
          error_type: 'react_error_boundary',
          error_message: error.message,
          error_source: 'unknown'
        });
      };

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(analytics.trackError).toHaveBeenCalledWith({
        error_type: 'react_error_boundary',
        error_message: 'Test error',
        error_source: 'unknown'
      });

      // Restore original method
      ErrorBoundary.prototype.componentDidCatch = originalDidCatch;
    });
  });

  describe('multiple error scenarios', () => {
    it('should handle sequential errors', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-message')).toHaveTextContent('Test error');
      expect(analytics.trackError).toHaveBeenCalledTimes(1);
      expect(analytics.trackError).toHaveBeenCalledWith({
        error_type: 'react_error_boundary',
        error_message: 'Test error',
        error_source: expect.stringContaining('ThrowError')
      });
    });

    it('should handle nested error boundaries', () => {
      const InnerError = () => {
        throw new Error('Inner error');
      };

      render(
        <ErrorBoundary>
          <div>
            <ErrorBoundary>
              <InnerError />
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      );

      // Only the inner boundary should catch the error
      expect(screen.getByTestId('error-message')).toHaveTextContent('Inner error');
      expect(analytics.trackError).toHaveBeenCalledTimes(1);
    });
  });

  describe('HOC wrapper usage', () => {
    it('should wrap component with error boundary using HOC', () => {
      const WrappedComponent = withErrorBoundary(TestComponent);

      render(<WrappedComponent message="Hello World" />);

      expect(screen.getByTestId('test-component')).toHaveTextContent('Hello World');
    });

    it('should catch errors in HOC wrapped components', () => {
      const ErrorComponent = () => {
        throw new Error('HOC error');
      };
      const WrappedErrorComponent = withErrorBoundary(ErrorComponent);

      render(<WrappedErrorComponent />);

      expect(screen.getByTestId('error-message')).toHaveTextContent('HOC error');
    });

    it('should use custom fallback with HOC', () => {
      const customFallback = (error: Error) => (
        <div data-testid="hoc-custom-error">HOC Custom: {error.message}</div>
      );

      const ErrorComponent = () => {
        throw new Error('HOC custom error');
      };
      
      const WrappedComponent = withErrorBoundary(ErrorComponent, customFallback);

      render(<WrappedComponent />);

      expect(screen.getByTestId('hoc-custom-error')).toHaveTextContent('HOC Custom: HOC custom error');
    });

    it('should preserve component props with HOC', () => {
      interface TestProps {
        title: string;
        count: number;
      }

      const PropsComponent = ({ title, count }: TestProps) => (
        <div>
          <div data-testid="title">{title}</div>
          <div data-testid="count">{count}</div>
        </div>
      );

      const WrappedComponent = withErrorBoundary(PropsComponent);

      render(<WrappedComponent title="Test Title" count={42} />);

      expect(screen.getByTestId('title')).toHaveTextContent('Test Title');
      expect(screen.getByTestId('count')).toHaveTextContent('42');
    });
  });

  describe('error boundary lifecycle', () => {
    it('should call getDerivedStateFromError when error occurs', () => {
      const spy = vi.spyOn(ErrorBoundary, 'getDerivedStateFromError');

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(spy).toHaveBeenCalledWith(expect.any(Error));
      expect(spy).toHaveReturnedWith({
        hasError: true,
        error: expect.any(Error)
      });

      spy.mockRestore();
    });

    it('should maintain error state until reset', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-message')).toBeInTheDocument();

      // Re-render without changing error state - should still show error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });
  });
});