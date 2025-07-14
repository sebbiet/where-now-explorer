/**
 * Feature Flags Service
 * Enables gradual rollouts and A/B testing in production
 */

import { logger } from '@/utils/logger';

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  rolloutPercentage: number;
  conditions?: {
    userAgent?: string[];
    location?: string[];
    timeRange?: {
      start: Date;
      end: Date;
    };
    userType?: string[];
  };
  metadata?: {
    description: string;
    owner: string;
    createdAt: Date;
    lastModified: Date;
  };
}

export interface FeatureFlagConfig {
  flags: Record<string, FeatureFlag>;
  defaultValues: Record<string, boolean>;
  remoteConfigUrl?: string;
  refreshInterval?: number;
}

class FeatureFlagsService {
  private flags: Map<string, FeatureFlag> = new Map();
  private userBucket: number;
  private refreshInterval: NodeJS.Timeout | null = null;
  private config: FeatureFlagConfig;

  constructor(config?: Partial<FeatureFlagConfig>) {
    this.config = {
      flags: {},
      defaultValues: {},
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      ...config
    };

    this.userBucket = this.calculateUserBucket();
    this.initializeFlags();
    this.startPeriodicRefresh();
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(flagKey: string): boolean {
    const flag = this.flags.get(flagKey);
    
    if (!flag) {
      const defaultValue = this.config.defaultValues[flagKey] ?? false;
      logger.warn(`Feature flag '${flagKey}' not found, using default: ${defaultValue}`, {
        service: 'FeatureFlags',
        flagKey,
        defaultValue
      });
      return defaultValue;
    }

    // Check if flag is globally disabled
    if (!flag.enabled) {
      return false;
    }

    // Check rollout percentage
    if (this.userBucket > flag.rolloutPercentage) {
      return false;
    }

    // Check conditions
    if (flag.conditions && !this.evaluateConditions(flag.conditions)) {
      return false;
    }

    logger.debug(`Feature flag '${flagKey}' evaluated as enabled`, {
      service: 'FeatureFlags',
      flagKey,
      userBucket: this.userBucket,
      rolloutPercentage: flag.rolloutPercentage
    });

    return true;
  }

  /**
   * Get feature flag value with fallback
   */
  getValue<T>(flagKey: string, defaultValue: T): T {
    if (this.isEnabled(flagKey)) {
      const flag = this.flags.get(flagKey);
      return (flag?.metadata as any)?.value ?? defaultValue;
    }
    return defaultValue;
  }

  /**
   * Set a feature flag (for testing/admin)
   */
  setFlag(flagKey: string, flag: FeatureFlag): void {
    this.flags.set(flagKey, flag);
    logger.info(`Feature flag '${flagKey}' updated`, {
      service: 'FeatureFlags',
      flagKey,
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage
    });
  }

  /**
   * Get all feature flags status
   */
  getAllFlags(): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    
    // Include configured flags
    this.flags.forEach((flag, key) => {
      result[key] = this.isEnabled(key);
    });

    // Include default values for missing flags
    Object.keys(this.config.defaultValues).forEach(key => {
      if (!(key in result)) {
        result[key] = this.config.defaultValues[key];
      }
    });

    return result;
  }

  /**
   * Refresh flags from remote config
   */
  async refreshFlags(): Promise<void> {
    if (!this.config.remoteConfigUrl) {
      return;
    }

    try {
      logger.debug('Refreshing feature flags from remote config', {
        service: 'FeatureFlags',
        url: this.config.remoteConfigUrl
      });

      const response = await fetch(this.config.remoteConfigUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const remoteFlags: Record<string, FeatureFlag> = await response.json();
      
      // Update local flags
      Object.entries(remoteFlags).forEach(([key, flag]) => {
        this.flags.set(key, flag);
      });

      logger.info('Feature flags refreshed successfully', {
        service: 'FeatureFlags',
        flagCount: Object.keys(remoteFlags).length
      });

    } catch (error) {
      logger.error('Failed to refresh feature flags', error as Error, {
        service: 'FeatureFlags',
        url: this.config.remoteConfigUrl
      });
    }
  }

  /**
   * Initialize default flags
   */
  private initializeFlags(): void {
    const defaultFlags: Record<string, FeatureFlag> = {
      // Performance monitoring
      enablePerformanceMonitoring: {
        key: 'enablePerformanceMonitoring',
        enabled: true,
        rolloutPercentage: 100,
        metadata: {
          description: 'Enable detailed performance monitoring',
          owner: 'platform-team',
          createdAt: new Date(),
          lastModified: new Date()
        }
      },

      // Enhanced analytics
      enableAdvancedAnalytics: {
        key: 'enableAdvancedAnalytics',
        enabled: true,
        rolloutPercentage: 100,
        metadata: {
          description: 'Enable advanced analytics and user behavior tracking',
          owner: 'product-team',
          createdAt: new Date(),
          lastModified: new Date()
        }
      },

      // PWA features
      enablePWAInstallPrompt: {
        key: 'enablePWAInstallPrompt',
        enabled: true,
        rolloutPercentage: 100,
        metadata: {
          description: 'Show PWA installation prompt',
          owner: 'mobile-team',
          createdAt: new Date(),
          lastModified: new Date()
        }
      },

      // Experimental features
      enableOfflineMode: {
        key: 'enableOfflineMode',
        enabled: true,
        rolloutPercentage: 100,
        metadata: {
          description: 'Enable offline mode capabilities',
          owner: 'platform-team',
          createdAt: new Date(),
          lastModified: new Date()
        }
      },

      // Location features
      enableTraditionalLandInfo: {
        key: 'enableTraditionalLandInfo',
        enabled: true,
        rolloutPercentage: 100,
        metadata: {
          description: 'Show traditional land acknowledgments',
          owner: 'product-team',
          createdAt: new Date(),
          lastModified: new Date()
        }
      },

      // Debug features (only in development)
      enableDebugPanel: {
        key: 'enableDebugPanel',
        enabled: !import.meta.env.PROD,
        rolloutPercentage: import.meta.env.PROD ? 0 : 100,
        metadata: {
          description: 'Show debug panel for development',
          owner: 'dev-team',
          createdAt: new Date(),
          lastModified: new Date()
        }
      },

      // A/B testing example
      enableNewLocationUI: {
        key: 'enableNewLocationUI',
        enabled: true,
        rolloutPercentage: 50, // 50% rollout
        metadata: {
          description: 'Test new location display UI',
          owner: 'design-team',
          createdAt: new Date(),
          lastModified: new Date()
        }
      },

      // Gradual rollout example
      enableHapticFeedback: {
        key: 'enableHapticFeedback',
        enabled: true,
        rolloutPercentage: 100,
        conditions: {
          userAgent: ['Mobile'], // Only on mobile devices
        },
        metadata: {
          description: 'Enable haptic feedback on mobile devices',
          owner: 'mobile-team',
          createdAt: new Date(),
          lastModified: new Date()
        }
      }
    };

    // Load flags
    Object.entries(defaultFlags).forEach(([key, flag]) => {
      this.flags.set(key, flag);
    });

    logger.info('Feature flags initialized', {
      service: 'FeatureFlags',
      flagCount: this.flags.size
    });
  }

  /**
   * Calculate user bucket for consistent rollout
   */
  private calculateUserBucket(): number {
    // Use a combination of localStorage and sessionStorage for consistency
    let userSeed = localStorage.getItem('user-bucket-seed');
    
    if (!userSeed) {
      userSeed = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('user-bucket-seed', userSeed);
    }

    // Convert seed to number between 0-100
    let hash = 0;
    for (let i = 0; i < userSeed.length; i++) {
      const char = userSeed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash) % 100;
  }

  /**
   * Evaluate feature flag conditions
   */
  private evaluateConditions(conditions: FeatureFlag['conditions']): boolean {
    if (!conditions) {
      return true;
    }

    // Check user agent
    if (conditions.userAgent && conditions.userAgent.length > 0) {
      const userAgent = navigator.userAgent;
      const matches = conditions.userAgent.some(pattern => 
        userAgent.toLowerCase().includes(pattern.toLowerCase())
      );
      if (!matches) return false;
    }

    // Check time range
    if (conditions.timeRange) {
      const now = new Date();
      if (now < conditions.timeRange.start || now > conditions.timeRange.end) {
        return false;
      }
    }

    // Check location (if available)
    if (conditions.location && conditions.location.length > 0) {
      // This would require geolocation data
      // For now, we'll assume it passes
    }

    return true;
  }

  /**
   * Start periodic refresh of flags
   */
  private startPeriodicRefresh(): void {
    if (this.config.refreshInterval && this.config.remoteConfigUrl) {
      this.refreshInterval = setInterval(() => {
        this.refreshFlags();
      }, this.config.refreshInterval);
    }
  }

  /**
   * Stop periodic refresh
   */
  destroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

// Create singleton instance
export const featureFlags = new FeatureFlagsService();

// React hook for using feature flags
export function useFeatureFlag(flagKey: string): boolean {
  return featureFlags.isEnabled(flagKey);
}

// React hook for feature flag value
export function useFeatureFlagValue<T>(flagKey: string, defaultValue: T): T {
  return featureFlags.getValue(flagKey, defaultValue);
}