import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FeatureFlagsService, featureFlags, useFeatureFlag, useFeatureFlagValue, type FeatureFlag } from '../featureFlags.service';
import { renderHook } from '@testing-library/react';

// Mock dependencies
vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  }
}));

// Mock environment variables
const mockEnv = {
  PROD: false
};
vi.mock('import.meta.env', () => mockEnv);

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock fetch
global.fetch = vi.fn();

// Mock navigator.userAgent
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  writable: true
});

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock timers
    global.setInterval = vi.fn() as any;
    global.clearInterval = vi.fn();
    
    // Reset localStorage mocks
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // Reset environment
    mockEnv.PROD = false;

    service = new FeatureFlagsService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    
    if (service) {
      service.destroy();
    }
  });

  describe('flag evaluation (enabled/disabled)', () => {
    it('should return true for enabled flags within rollout percentage', () => {
      const testFlag: FeatureFlag = {
        key: 'testFlag',
        enabled: true,
        rolloutPercentage: 100
      };

      service.setFlag('testFlag', testFlag);
      expect(service.isEnabled('testFlag')).toBe(true);
    });

    it('should return false for disabled flags', () => {
      const testFlag: FeatureFlag = {
        key: 'testFlag',
        enabled: false,
        rolloutPercentage: 100
      };

      service.setFlag('testFlag', testFlag);
      expect(service.isEnabled('testFlag')).toBe(false);
    });

    it('should return default value for non-existent flags', () => {
      const serviceWithDefaults = new FeatureFlagsService({
        defaultValues: {
          missingFlag: true
        }
      });

      expect(serviceWithDefaults.isEnabled('missingFlag')).toBe(true);
      expect(serviceWithDefaults.isEnabled('nonExistentFlag')).toBe(false);

      serviceWithDefaults.destroy();
    });
  });

  describe('rollout percentage logic', () => {
    it('should respect rollout percentage based on user bucket', () => {
      // Mock user bucket to be 75
      mockLocalStorage.getItem.mockReturnValue('test-seed-75');
      const serviceWithSeed = new FeatureFlagsService();

      const lowRolloutFlag: FeatureFlag = {
        key: 'lowRollout',
        enabled: true,
        rolloutPercentage: 50  // Should exclude bucket 75
      };

      const highRolloutFlag: FeatureFlag = {
        key: 'highRollout',
        enabled: true,
        rolloutPercentage: 100  // Should include bucket 75
      };

      serviceWithSeed.setFlag('lowRollout', lowRolloutFlag);
      serviceWithSeed.setFlag('highRollout', highRolloutFlag);

      expect(serviceWithSeed.isEnabled('lowRollout')).toBe(false);
      expect(serviceWithSeed.isEnabled('highRollout')).toBe(true);

      serviceWithSeed.destroy();
    });

    it('should generate and store user bucket seed', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      new FeatureFlagsService();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'user-bucket-seed',
        expect.any(String)
      );
    });

    it('should use existing user bucket seed for consistency', () => {
      const existingSeed = 'existing-seed-123';
      mockLocalStorage.getItem.mockReturnValue(existingSeed);
      
      new FeatureFlagsService();

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('user agent conditions', () => {
    it('should enable flag when user agent matches condition', () => {
      const mobileFlag: FeatureFlag = {
        key: 'mobileFeature',
        enabled: true,
        rolloutPercentage: 100,
        conditions: {
          userAgent: ['Mobile', 'Android']
        }
      };

      // Mock mobile user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) Mobile/15E148',
        writable: true
      });

      service.setFlag('mobileFeature', mobileFlag);
      expect(service.isEnabled('mobileFeature')).toBe(true);
    });

    it('should disable flag when user agent does not match condition', () => {
      const mobileFlag: FeatureFlag = {
        key: 'mobileFeature',
        enabled: true,
        rolloutPercentage: 100,
        conditions: {
          userAgent: ['Mobile', 'Android']
        }
      };

      // Mock desktop user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        writable: true
      });

      service.setFlag('mobileFeature', mobileFlag);
      expect(service.isEnabled('mobileFeature')).toBe(false);
    });

    it('should be case insensitive for user agent matching', () => {
      const testFlag: FeatureFlag = {
        key: 'testFlag',
        enabled: true,
        rolloutPercentage: 100,
        conditions: {
          userAgent: ['WINDOWS']
        }
      };

      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (windows nt 10.0; win64; x64)',
        writable: true
      });

      service.setFlag('testFlag', testFlag);
      expect(service.isEnabled('testFlag')).toBe(true);
    });
  });

  describe('location-based conditions', () => {
    it('should enable flag with location conditions (currently passes by default)', () => {
      const locationFlag: FeatureFlag = {
        key: 'locationFeature',
        enabled: true,
        rolloutPercentage: 100,
        conditions: {
          location: ['Australia', 'US']
        }
      };

      service.setFlag('locationFeature', locationFlag);
      // Currently passes because location checking is not implemented
      expect(service.isEnabled('locationFeature')).toBe(true);
    });
  });

  describe('time-based conditions', () => {
    it('should enable flag within time range', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      const timeBasedFlag: FeatureFlag = {
        key: 'timeBasedFeature',
        enabled: true,
        rolloutPercentage: 100,
        conditions: {
          timeRange: {
            start: oneHourAgo,
            end: oneHourFromNow
          }
        }
      };

      service.setFlag('timeBasedFeature', timeBasedFlag);
      expect(service.isEnabled('timeBasedFeature')).toBe(true);
    });

    it('should disable flag outside time range', () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const expiredFlag: FeatureFlag = {
        key: 'expiredFeature',
        enabled: true,
        rolloutPercentage: 100,
        conditions: {
          timeRange: {
            start: twoHoursAgo,
            end: oneHourAgo
          }
        }
      };

      service.setFlag('expiredFeature', expiredFlag);
      expect(service.isEnabled('expiredFeature')).toBe(false);
    });

    it('should disable flag before time range starts', () => {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const futureFlag: FeatureFlag = {
        key: 'futureFeature',
        enabled: true,
        rolloutPercentage: 100,
        conditions: {
          timeRange: {
            start: oneHourFromNow,
            end: twoHoursFromNow
          }
        }
      };

      service.setFlag('futureFeature', futureFlag);
      expect(service.isEnabled('futureFeature')).toBe(false);
    });
  });

  describe('React hook integration', () => {
    it('should provide useFeatureFlag hook', () => {
      const testFlag: FeatureFlag = {
        key: 'hookTest',
        enabled: true,
        rolloutPercentage: 100
      };

      featureFlags.setFlag('hookTest', testFlag);

      const { result } = renderHook(() => useFeatureFlag('hookTest'));
      expect(result.current).toBe(true);
    });

    it('should provide useFeatureFlagValue hook', () => {
      const testFlag: FeatureFlag = {
        key: 'valueTest',
        enabled: true,
        rolloutPercentage: 100,
        metadata: {
          value: 'test-value',
          description: 'Test flag',
          owner: 'test',
          createdAt: new Date(),
          lastModified: new Date()
        } as any
      };

      featureFlags.setFlag('valueTest', testFlag);

      const { result } = renderHook(() => useFeatureFlagValue('valueTest', 'default'));
      expect(result.current).toBe('test-value');
    });

    it('should return default value when hook flag is disabled', () => {
      const { result } = renderHook(() => useFeatureFlagValue('disabledFlag', 'default-value'));
      expect(result.current).toBe('default-value');
    });
  });

  describe('default values', () => {
    it('should use default values for missing flags', () => {
      const serviceWithDefaults = new FeatureFlagsService({
        defaultValues: {
          defaultTrue: true,
          defaultFalse: false
        }
      });

      expect(serviceWithDefaults.isEnabled('defaultTrue')).toBe(true);
      expect(serviceWithDefaults.isEnabled('defaultFalse')).toBe(false);

      serviceWithDefaults.destroy();
    });

    it('should prioritize actual flags over default values', () => {
      const serviceWithDefaults = new FeatureFlagsService({
        defaultValues: {
          overrideTest: true
        }
      });

      const actualFlag: FeatureFlag = {
        key: 'overrideTest',
        enabled: false,
        rolloutPercentage: 100
      };

      serviceWithDefaults.setFlag('overrideTest', actualFlag);
      expect(serviceWithDefaults.isEnabled('overrideTest')).toBe(false);

      serviceWithDefaults.destroy();
    });
  });

  describe('getValue method', () => {
    it('should return flag value when enabled', () => {
      const valueFlag: FeatureFlag = {
        key: 'valueFlag',
        enabled: true,
        rolloutPercentage: 100,
        metadata: {
          value: 42,
          description: 'Test',
          owner: 'test',
          createdAt: new Date(),
          lastModified: new Date()
        } as any
      };

      service.setFlag('valueFlag', valueFlag);
      expect(service.getValue('valueFlag', 0)).toBe(42);
    });

    it('should return default value when flag is disabled', () => {
      const disabledFlag: FeatureFlag = {
        key: 'disabledFlag',
        enabled: false,
        rolloutPercentage: 100
      };

      service.setFlag('disabledFlag', disabledFlag);
      expect(service.getValue('disabledFlag', 'default')).toBe('default');
    });

    it('should return default value when flag has no metadata value', () => {
      const noValueFlag: FeatureFlag = {
        key: 'noValueFlag',
        enabled: true,
        rolloutPercentage: 100
      };

      service.setFlag('noValueFlag', noValueFlag);
      expect(service.getValue('noValueFlag', 'fallback')).toBe('fallback');
    });
  });

  describe('getAllFlags method', () => {
    it('should return all flag statuses', () => {
      const serviceWithDefaults = new FeatureFlagsService({
        defaultValues: {
          defaultFlag: true
        }
      });

      const testFlag: FeatureFlag = {
        key: 'testFlag',
        enabled: true,
        rolloutPercentage: 100
      };

      serviceWithDefaults.setFlag('testFlag', testFlag);

      const allFlags = serviceWithDefaults.getAllFlags();
      expect(allFlags.testFlag).toBe(true);
      expect(allFlags.defaultFlag).toBe(true);

      serviceWithDefaults.destroy();
    });

    it('should include default values for missing flags', () => {
      const serviceWithDefaults = new FeatureFlagsService({
        defaultValues: {
          missingFlag: false,
          anotherMissing: true
        }
      });

      const allFlags = serviceWithDefaults.getAllFlags();
      expect(allFlags.missingFlag).toBe(false);
      expect(allFlags.anotherMissing).toBe(true);

      serviceWithDefaults.destroy();
    });
  });

  describe('remote config refresh', () => {
    it('should refresh flags from remote URL', async () => {
      const remoteFlags = {
        remoteFlag: {
          key: 'remoteFlag',
          enabled: true,
          rolloutPercentage: 75
        }
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(remoteFlags)
      } as Response);

      const serviceWithRemote = new FeatureFlagsService({
        remoteConfigUrl: 'https://example.com/flags'
      });

      await serviceWithRemote.refreshFlags();

      expect(fetch).toHaveBeenCalledWith('https://example.com/flags');
      expect(serviceWithRemote.isEnabled('remoteFlag')).toBe(true);

      serviceWithRemote.destroy();
    });

    it('should handle remote config errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const serviceWithRemote = new FeatureFlagsService({
        remoteConfigUrl: 'https://example.com/flags'
      });

      // Should not throw
      await expect(serviceWithRemote.refreshFlags()).resolves.toBeUndefined();

      serviceWithRemote.destroy();
    });

    it('should handle HTTP errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);

      const serviceWithRemote = new FeatureFlagsService({
        remoteConfigUrl: 'https://example.com/flags'
      });

      await expect(serviceWithRemote.refreshFlags()).resolves.toBeUndefined();

      serviceWithRemote.destroy();
    });

    it('should start periodic refresh when configured', () => {
      new FeatureFlagsService({
        remoteConfigUrl: 'https://example.com/flags',
        refreshInterval: 5000
      });

      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 5000);
    });

    it('should not start periodic refresh without remote URL', () => {
      new FeatureFlagsService({
        refreshInterval: 5000
      });

      expect(setInterval).not.toHaveBeenCalled();
    });
  });

  describe('service lifecycle', () => {
    it('should initialize default flags on creation', () => {
      const newService = new FeatureFlagsService();
      
      // Should have default flags
      expect(newService.isEnabled('enablePerformanceMonitoring')).toBe(true);
      expect(newService.isEnabled('enableAdvancedAnalytics')).toBe(true);
      
      newService.destroy();
    });

    it('should handle production vs development flags', () => {
      // Test production mode
      mockEnv.PROD = true;
      const prodService = new FeatureFlagsService();
      expect(prodService.isEnabled('enableDebugPanel')).toBe(false);
      prodService.destroy();

      // Test development mode
      mockEnv.PROD = false;
      const devService = new FeatureFlagsService();
      expect(devService.isEnabled('enableDebugPanel')).toBe(true);
      devService.destroy();
    });

    it('should clean up intervals on destroy', () => {
      const serviceWithInterval = new FeatureFlagsService({
        remoteConfigUrl: 'https://example.com/flags',
        refreshInterval: 5000
      });

      serviceWithInterval.destroy();

      expect(clearInterval).toHaveBeenCalled();
    });
  });

  describe('complex condition evaluation', () => {
    it('should evaluate multiple conditions correctly', () => {
      const complexFlag: FeatureFlag = {
        key: 'complexFlag',
        enabled: true,
        rolloutPercentage: 100,
        conditions: {
          userAgent: ['Mobile'],
          timeRange: {
            start: new Date(Date.now() - 60 * 60 * 1000),
            end: new Date(Date.now() + 60 * 60 * 1000)
          }
        }
      };

      // Should fail due to desktop user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true
      });

      service.setFlag('complexFlag', complexFlag);
      expect(service.isEnabled('complexFlag')).toBe(false);

      // Should pass with mobile user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) Mobile/15E148',
        writable: true
      });

      expect(service.isEnabled('complexFlag')).toBe(true);
    });

    it('should handle empty conditions', () => {
      const emptyConditionsFlag: FeatureFlag = {
        key: 'emptyConditions',
        enabled: true,
        rolloutPercentage: 100,
        conditions: {}
      };

      service.setFlag('emptyConditions', emptyConditionsFlag);
      expect(service.isEnabled('emptyConditions')).toBe(true);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle malformed user bucket seed', () => {
      mockLocalStorage.getItem.mockReturnValue('');
      const serviceWithEmptySeed = new FeatureFlagsService();
      
      // Should still function
      expect(typeof serviceWithEmptySeed.isEnabled('enablePerformanceMonitoring')).toBe('boolean');
      
      serviceWithEmptySeed.destroy();
    });

    it('should handle missing navigator.userAgent', () => {
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: undefined,
        writable: true
      });

      const userAgentFlag: FeatureFlag = {
        key: 'userAgentFlag',
        enabled: true,
        rolloutPercentage: 100,
        conditions: {
          userAgent: ['Mobile']
        }
      };

      service.setFlag('userAgentFlag', userAgentFlag);
      expect(service.isEnabled('userAgentFlag')).toBe(false);

      // Restore
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        writable: true
      });
    });
  });
});