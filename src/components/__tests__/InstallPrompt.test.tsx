import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstallPrompt from '../InstallPrompt';

// TypeScript interfaces for PWA and test mocks
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
  preventDefault(): void;
}

interface LoadingButtonProps {
  children: React.ReactNode;
  isLoading: boolean;
  loadingText: string;
  onClick: () => void;
  className?: string;
  [key: string]: unknown;
}

interface MockSetTimeoutReturn {
  fn: () => void;
  delay: number;
  id: number;
}

type MockSetTimeoutFn = (fn: () => void, delay: number) => MockSetTimeoutReturn;

// Mock dependencies
vi.mock('@/hooks/useInstallPrompt', () => ({
  useInstallPrompt: vi.fn(),
}));

vi.mock('@/utils/haptic', () => ({
  haptic: {
    light: vi.fn(),
    medium: vi.fn(),
  },
}));

vi.mock('@/utils/loadingStates', () => ({
  LoadingButton: ({
    children,
    isLoading,
    loadingText,
    onClick,
    className,
    ...props
  }: LoadingButtonProps) => (
    <button onClick={onClick} className={className} {...props}>
      {isLoading ? loadingText : children}
    </button>
  ),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock setTimeout
const originalSetTimeout = global.setTimeout;
const originalClearTimeout = global.clearTimeout;

describe('InstallPrompt', () => {
  // Get references to the mocked functions using a simpler approach
  let mockUseInstallPrompt: ReturnType<typeof vi.fn>;
  let mockHaptic: {
    light: ReturnType<typeof vi.fn>;
    medium: ReturnType<typeof vi.fn>;
  };

  beforeAll(async () => {
    const installPromptModule = await import('@/hooks/useInstallPrompt');
    const hapticModule = await import('@/utils/haptic');
    mockUseInstallPrompt = vi.mocked(installPromptModule.useInstallPrompt);
    mockHaptic = vi.mocked(hapticModule.haptic);
  });

  const defaultHookReturn = {
    isInstallable: true,
    isInstalled: false,
    promptInstall: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock timers
    global.setTimeout = vi.fn((fn, delay) => {
      // Store the function to call it manually in tests
      return { fn, delay, id: Math.random() } as MockSetTimeoutReturn;
    }) as unknown as typeof setTimeout;
    global.clearTimeout = vi.fn();

    // Reset localStorage
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockImplementation(() => {});

    // Default hook return
    mockUseInstallPrompt.mockReturnValue(defaultHookReturn);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  });

  describe('PWA eligibility detection', () => {
    it('should not show prompt when not installable', () => {
      mockUseInstallPrompt.mockReturnValue({
        ...defaultHookReturn,
        isInstallable: false,
      });

      render(<InstallPrompt />);

      expect(
        screen.queryByText('Install Where Now Explorer')
      ).not.toBeInTheDocument();
    });

    it('should not show prompt when already installed', () => {
      mockUseInstallPrompt.mockReturnValue({
        ...defaultHookReturn,
        isInstalled: true,
      });

      render(<InstallPrompt />);

      expect(
        screen.queryByText('Install Where Now Explorer')
      ).not.toBeInTheDocument();
    });

    it('should not show prompt immediately when installable', () => {
      render(<InstallPrompt />);

      expect(
        screen.queryByText('Install Where Now Explorer')
      ).not.toBeInTheDocument();
    });

    it('should show prompt after delay when installable', async () => {
      render(<InstallPrompt />);

      // Get the setTimeout call and execute it
      const setTimeoutCall = vi.mocked(setTimeout).mock.results[0]
        ?.value as MockSetTimeoutReturn;
      expect(setTimeoutCall).toBeDefined();
      expect(setTimeoutCall.delay).toBe(5000);

      act(() => {
        setTimeoutCall.fn();
      });

      await waitFor(() => {
        expect(
          screen.getByText('Install Where Now Explorer')
        ).toBeInTheDocument();
      });
    });
  });

  describe('install prompt display', () => {
    beforeEach(() => {
      // Setup to show the prompt
      render(<InstallPrompt />);
      const setTimeoutCall = vi.mocked(setTimeout).mock.results[0]
        ?.value as MockSetTimeoutReturn;
      act(() => {
        setTimeoutCall.fn();
      });
    });

    it('should display install prompt with correct content', async () => {
      await waitFor(() => {
        expect(
          screen.getByText('Install Where Now Explorer')
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            'Add to your home screen for the best experience - works offline too!'
          )
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: 'Install App' })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: 'Not Now' })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: 'Dismiss install prompt' })
        ).toBeInTheDocument();
      });
    });

    it('should display app icon', async () => {
      await waitFor(() => {
        expect(screen.getByText('🌍')).toBeInTheDocument();
      });
    });

    it('should have proper styling classes', async () => {
      await waitFor(() => {
        const prompt = screen
          .getByText('Install Where Now Explorer')
          .closest('div');
        expect(prompt?.closest('.fixed')).toHaveClass(
          'bottom-20',
          'left-4',
          'right-4'
        );
      });
    });
  });

  describe('install acceptance flow', () => {
    it('should call promptInstall when Install App button is clicked', async () => {
      const mockPromptInstall = vi.fn().mockResolvedValue(true);
      mockUseInstallPrompt.mockReturnValue({
        ...defaultHookReturn,
        promptInstall: mockPromptInstall,
      });

      render(<InstallPrompt />);

      // Show the prompt
      const setTimeoutCall = vi.mocked(setTimeout).mock.results[0]
        ?.value as MockSetTimeoutReturn;
      act(() => {
        setTimeoutCall.fn();
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Install App' })
        ).toBeInTheDocument();
      });

      const installButton = screen.getByRole('button', { name: 'Install App' });
      await userEvent.click(installButton);

      expect(mockPromptInstall).toHaveBeenCalled();
      expect(mockHaptic.medium).toHaveBeenCalled();
    });

    it('should show loading state during installation', async () => {
      const mockPromptInstall = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(true), 100))
        );

      mockUseInstallPrompt.mockReturnValue({
        ...defaultHookReturn,
        promptInstall: mockPromptInstall,
      });

      render(<InstallPrompt />);

      // Show the prompt
      const setTimeoutCall = vi.mocked(setTimeout).mock.results[0]
        ?.value as MockSetTimeoutReturn;
      act(() => {
        setTimeoutCall.fn();
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Install App' })
        ).toBeInTheDocument();
      });

      const installButton = screen.getByRole('button', { name: 'Install App' });
      fireEvent.click(installButton);

      // Should show loading text
      await waitFor(() => {
        expect(screen.getByText('Installing...')).toBeInTheDocument();
      });
    });

    it('should hide prompt on successful installation', async () => {
      const mockPromptInstall = vi.fn().mockResolvedValue(true);
      mockUseInstallPrompt.mockReturnValue({
        ...defaultHookReturn,
        promptInstall: mockPromptInstall,
      });

      render(<InstallPrompt />);

      // Show the prompt
      const setTimeoutCall = vi.mocked(setTimeout).mock.results[0]
        ?.value as MockSetTimeoutReturn;
      act(() => {
        setTimeoutCall.fn();
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Install App' })
        ).toBeInTheDocument();
      });

      const installButton = screen.getByRole('button', { name: 'Install App' });
      await userEvent.click(installButton);

      await waitFor(() => {
        expect(
          screen.queryByText('Install Where Now Explorer')
        ).not.toBeInTheDocument();
      });
    });

    it('should handle installation failure gracefully', async () => {
      const mockPromptInstall = vi.fn().mockResolvedValue(false);
      mockUseInstallPrompt.mockReturnValue({
        ...defaultHookReturn,
        promptInstall: mockPromptInstall,
      });

      render(<InstallPrompt />);

      // Show the prompt
      const setTimeoutCall = vi.mocked(setTimeout).mock.results[0]
        ?.value as MockSetTimeoutReturn;
      act(() => {
        setTimeoutCall.fn();
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Install App' })
        ).toBeInTheDocument();
      });

      const installButton = screen.getByRole('button', { name: 'Install App' });
      await userEvent.click(installButton);

      // Should still show the prompt since installation failed
      await waitFor(() => {
        expect(
          screen.getByText('Install Where Now Explorer')
        ).toBeInTheDocument();
      });
    });

    it('should handle installation errors', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const mockPromptInstall = vi
        .fn()
        .mockRejectedValue(new Error('Install failed'));

      mockUseInstallPrompt.mockReturnValue({
        ...defaultHookReturn,
        promptInstall: mockPromptInstall,
      });

      render(<InstallPrompt />);

      // Show the prompt
      const setTimeoutCall = vi.mocked(setTimeout).mock.results[0]
        ?.value as MockSetTimeoutReturn;
      act(() => {
        setTimeoutCall.fn();
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Install App' })
        ).toBeInTheDocument();
      });

      const installButton = screen.getByRole('button', { name: 'Install App' });
      await userEvent.click(installButton);

      // Should handle error gracefully and stop loading
      await waitFor(() => {
        expect(screen.getByText('Install App')).toBeInTheDocument(); // Not "Installing..." anymore
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('dismiss functionality', () => {
    it('should dismiss prompt when X button is clicked', async () => {
      render(<InstallPrompt />);

      // Show the prompt
      const setTimeoutCall = vi.mocked(setTimeout).mock.results[0]
        ?.value as MockSetTimeoutReturn;
      act(() => {
        setTimeoutCall.fn();
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Dismiss install prompt' })
        ).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', {
        name: 'Dismiss install prompt',
      });
      await userEvent.click(dismissButton);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pwa-install-dismissed',
        'true'
      );
      expect(mockHaptic.light).toHaveBeenCalled();

      await waitFor(() => {
        expect(
          screen.queryByText('Install Where Now Explorer')
        ).not.toBeInTheDocument();
      });
    });

    it('should dismiss prompt when "Not Now" button is clicked', async () => {
      render(<InstallPrompt />);

      // Show the prompt
      const setTimeoutCall = vi.mocked(setTimeout).mock.results[0]
        ?.value as MockSetTimeoutReturn;
      act(() => {
        setTimeoutCall.fn();
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Not Now' })
        ).toBeInTheDocument();
      });

      const notNowButton = screen.getByRole('button', { name: 'Not Now' });
      await userEvent.click(notNowButton);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pwa-install-dismissed',
        'true'
      );
      expect(mockHaptic.light).toHaveBeenCalled();

      await waitFor(() => {
        expect(
          screen.queryByText('Install Where Now Explorer')
        ).not.toBeInTheDocument();
      });
    });

    it('should disable "Not Now" button during installation', async () => {
      const mockPromptInstall = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(true), 100))
        );

      mockUseInstallPrompt.mockReturnValue({
        ...defaultHookReturn,
        promptInstall: mockPromptInstall,
      });

      render(<InstallPrompt />);

      // Show the prompt
      const setTimeoutCall = vi.mocked(setTimeout).mock.results[0]
        ?.value as MockSetTimeoutReturn;
      act(() => {
        setTimeoutCall.fn();
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Install App' })
        ).toBeInTheDocument();
      });

      const installButton = screen.getByRole('button', { name: 'Install App' });
      fireEvent.click(installButton);

      const notNowButton = screen.getByRole('button', { name: 'Not Now' });
      expect(notNowButton).toBeDisabled();
    });
  });

  describe('localStorage persistence', () => {
    it('should not show prompt if previously dismissed', () => {
      mockLocalStorage.getItem.mockReturnValue('true');

      render(<InstallPrompt />);

      // Even after timeout, should not show
      const setTimeoutCall = vi.mocked(setTimeout).mock.results[0]?.value as
        | MockSetTimeoutReturn
        | undefined;
      if (setTimeoutCall) {
        act(() => {
          setTimeoutCall.fn();
        });
      }

      expect(
        screen.queryByText('Install Where Now Explorer')
      ).not.toBeInTheDocument();
    });

    it('should check localStorage on mount', () => {
      render(<InstallPrompt />);

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
        'pwa-install-dismissed'
      );
    });

    it('should persist dismissal state', async () => {
      render(<InstallPrompt />);

      // Show the prompt
      const setTimeoutCall = vi.mocked(setTimeout).mock.results[0]
        ?.value as MockSetTimeoutReturn;
      act(() => {
        setTimeoutCall.fn();
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Not Now' })
        ).toBeInTheDocument();
      });

      const notNowButton = screen.getByRole('button', { name: 'Not Now' });
      await userEvent.click(notNowButton);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pwa-install-dismissed',
        'true'
      );
    });
  });

  describe('beforeinstallprompt event', () => {
    it('should not show if installPrompt hook indicates not installable', () => {
      mockUseInstallPrompt.mockReturnValue({
        ...defaultHookReturn,
        isInstallable: false,
      });

      render(<InstallPrompt />);

      const setTimeoutCall = vi.mocked(setTimeout).mock.results[0]?.value as
        | MockSetTimeoutReturn
        | undefined;
      if (setTimeoutCall) {
        act(() => {
          setTimeoutCall.fn();
        });
      }

      expect(
        screen.queryByText('Install Where Now Explorer')
      ).not.toBeInTheDocument();
    });

    it('should integrate with useInstallPrompt hook properly', () => {
      render(<InstallPrompt />);

      expect(mockUseInstallPrompt).toHaveBeenCalled();
    });
  });

  describe('mock PWA events', () => {
    it('should handle component lifecycle correctly', () => {
      const { unmount } = render(<InstallPrompt />);

      // Should setup timeout on mount
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);

      // Should clear timeout on unmount
      unmount();
      expect(clearTimeout).toHaveBeenCalled();
    });

    it('should handle rerenders when props change', () => {
      const { rerender } = render(<InstallPrompt />);

      // Change installable state
      mockUseInstallPrompt.mockReturnValue({
        ...defaultHookReturn,
        isInstallable: false,
      });

      rerender(<InstallPrompt />);

      // Should setup new timeout
      expect(setTimeout).toHaveBeenCalledTimes(2);
    });

    it('should handle timeout cleanup when conditions change', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const { rerender } = render(<InstallPrompt />);

      // Verify timeout was set
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);

      // Change to already installed
      mockUseInstallPrompt.mockReturnValue({
        ...defaultHookReturn,
        isInstalled: true,
      });

      rerender(<InstallPrompt />);

      // Should clear previous timeout
      expect(clearTimeout).toHaveBeenCalled();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle missing localStorage gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      expect(() => render(<InstallPrompt />)).not.toThrow();
    });

    it('should handle multiple rapid clicks on install button', async () => {
      let resolveInstall: (value: boolean) => void;
      const installPromise = new Promise<boolean>((resolve) => {
        resolveInstall = resolve;
      });

      const mockPromptInstall = vi.fn().mockReturnValue(installPromise);
      mockUseInstallPrompt.mockReturnValue({
        ...defaultHookReturn,
        promptInstall: mockPromptInstall,
      });

      render(<InstallPrompt />);

      // Show the prompt
      const setTimeoutCall = vi.mocked(setTimeout).mock.results[0]
        ?.value as MockSetTimeoutReturn;
      act(() => {
        setTimeoutCall.fn();
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Install App' })
        ).toBeInTheDocument();
      });

      const installButton = screen.getByRole('button', { name: 'Install App' });

      // Click multiple times rapidly
      fireEvent.click(installButton);
      fireEvent.click(installButton);
      fireEvent.click(installButton);

      // Should only call promptInstall once
      expect(mockPromptInstall).toHaveBeenCalledTimes(1);

      // Resolve the promise
      act(() => {
        resolveInstall!(true);
      });
    });

    it('should handle component unmount during installation', async () => {
      let resolveInstall: (value: boolean) => void;
      const installPromise = new Promise<boolean>((resolve) => {
        resolveInstall = resolve;
      });

      const mockPromptInstall = vi.fn().mockReturnValue(installPromise);
      mockUseInstallPrompt.mockReturnValue({
        ...defaultHookReturn,
        promptInstall: mockPromptInstall,
      });

      const { unmount } = render(<InstallPrompt />);

      // Show the prompt
      const setTimeoutCall = vi.mocked(setTimeout).mock.results[0]
        ?.value as MockSetTimeoutReturn;
      act(() => {
        setTimeoutCall.fn();
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Install App' })
        ).toBeInTheDocument();
      });

      const installButton = screen.getByRole('button', { name: 'Install App' });
      fireEvent.click(installButton);

      // Unmount during installation
      unmount();

      // Resolve after unmount - should not cause errors
      act(() => {
        resolveInstall!(true);
      });

      expect(mockPromptInstall).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<InstallPrompt />);

      // Show the prompt
      const setTimeoutCall = vi.mocked(setTimeout).mock.results[0]
        ?.value as MockSetTimeoutReturn;
      act(() => {
        setTimeoutCall.fn();
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Dismiss install prompt' })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: 'Install App' })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: 'Not Now' })
        ).toBeInTheDocument();
      });
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<InstallPrompt />);

      // Show the prompt
      const setTimeoutCall = vi.mocked(setTimeout).mock.results[0]
        ?.value as MockSetTimeoutReturn;
      act(() => {
        setTimeoutCall.fn();
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Install App' })
        ).toBeInTheDocument();
      });

      // Should be able to tab through buttons
      await user.tab();
      expect(
        screen.getByRole('button', { name: 'Dismiss install prompt' })
      ).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: 'Install App' })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: 'Not Now' })).toHaveFocus();
    });
  });
});
