import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HealthCheckService, healthCheck, createHealthEndpoint, type HealthCheck } from '../healthCheck.service';

// Mock dependencies
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock environment
const mockEnv = {
  VITE_APP_VERSION: '1.0.0',
  PROD: false
};
vi.mock('import.meta.env', () => mockEnv);

// Mock global APIs
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

const mockNavigator = {
  onLine: true,
  geolocation: {},
  serviceWorker: {
    getRegistration: vi.fn()
  }
};

const mockPerformance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
  }
};

// Mock fetch
global.fetch = vi.fn();

// Mock AbortController
global.AbortController = vi.fn(() => ({
  abort: vi.fn(),
  signal: {}
}));

// Mock setTimeout
global.setTimeout = vi.fn((fn, delay) => {
  if (typeof fn === 'function') fn();
  return 123 as any;
});

global.clearTimeout = vi.fn();

describe('HealthCheckService', () => {
  let service: HealthCheckService;
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock timers
    global.setInterval = vi.fn() as any;
    global.clearInterval = vi.fn();
    
    // Mock global objects
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });
    
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    });
    
    Object.defineProperty(global, 'performance', {
      value: mockPerformance,
      writable: true
    });

    Object.defineProperty(global, 'window', {
      value: {
        fetch: global.fetch,
        localStorage: mockLocalStorage,
        navigator: mockNavigator
      },
      writable: true
    });

    // Reset navigator mocks
    mockNavigator.onLine = true;
    mockLocalStorage.getItem.mockReturnValue('test');
    mockLocalStorage.setItem.mockImplementation(() => {});
    mockLocalStorage.removeItem.mockImplementation(() => {});
    mockNavigator.serviceWorker.getRegistration.mockResolvedValue({
      active: {},
      scope: '/test-scope'
    });

    // Mock successful fetch
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK'
    } as Response);

    service = new HealthCheckService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    
    if (service) {
      service.stopMonitoring();
    }
  });

  describe('browser API checks', () => {
    it('should pass when all required APIs are available', async () => {
      const status = await service.getHealthStatus();
      const browserApiCheck = status.checks.find(c => c.name === 'browser-apis');
      
      expect(browserApiCheck).toBeDefined();
      expect(browserApiCheck!.status).toBe('pass');
      expect(browserApiCheck!.message).toBe('All required browser APIs available');
    });

    it('should fail when required APIs are missing', async () => {
      // Remove fetch from window
      const windowWithoutFetch = { ...global.window };
      delete (windowWithoutFetch as any).fetch;
      Object.defineProperty(global, 'window', {
        value: windowWithoutFetch,
        writable: true
      });

      const serviceWithMissingApi = new HealthCheckService();
      const status = await serviceWithMissingApi.getHealthStatus();
      const browserApiCheck = status.checks.find(c => c.name === 'browser-apis');
      
      expect(browserApiCheck!.status).toBe('fail');
      expect(browserApiCheck!.message).toContain('Missing APIs: fetch');
      expect(browserApiCheck!.details?.missing).toContain('fetch');

      serviceWithMissingApi.stopMonitoring();
    });
  });

  describe('memory usage checks', () => {
    it('should pass with normal memory usage', async () => {
      mockPerformance.memory = {
        usedJSHeapSize: 50 * 1024 * 1024, // 50MB
        jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB (50% usage)
      };

      const status = await service.getHealthStatus();
      const memoryCheck = status.checks.find(c => c.name === 'memory-usage');
      
      expect(memoryCheck!.status).toBe('pass');
      expect(memoryCheck!.message).toContain('50MB / 100MB');
      expect(memoryCheck!.details?.usagePercent).toBe(50);
    });

    it('should warn with high memory usage', async () => {
      mockPerformance.memory = {
        usedJSHeapSize: 85 * 1024 * 1024, // 85MB
        jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB (85% usage)
      };

      const status = await service.getHealthStatus();
      const memoryCheck = status.checks.find(c => c.name === 'memory-usage');
      
      expect(memoryCheck!.status).toBe('warn');
      expect(memoryCheck!.details?.usagePercent).toBe(85);
    });

    it('should fail with critical memory usage', async () => {
      mockPerformance.memory = {
        usedJSHeapSize: 95 * 1024 * 1024, // 95MB
        jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB (95% usage)
      };

      const status = await service.getHealthStatus();
      const memoryCheck = status.checks.find(c => c.name === 'memory-usage');
      
      expect(memoryCheck!.status).toBe('fail');
      expect(memoryCheck!.details?.usagePercent).toBe(95);
    });

    it('should warn when memory API is not available', async () => {
      const performanceWithoutMemory = { ...mockPerformance };
      delete (performanceWithoutMemory as any).memory;
      Object.defineProperty(global, 'performance', {
        value: performanceWithoutMemory,
        writable: true
      });

      const serviceWithoutMemoryApi = new HealthCheckService();
      const status = await serviceWithoutMemoryApi.getHealthStatus();
      const memoryCheck = status.checks.find(c => c.name === 'memory-usage');
      
      expect(memoryCheck!.status).toBe('warn');
      expect(memoryCheck!.message).toBe('Memory API not available');

      serviceWithoutMemoryApi.stopMonitoring();
    });
  });

  describe('network connectivity checks', () => {
    it('should pass when online', async () => {
      mockNavigator.onLine = true;

      const status = await service.getHealthStatus();
      const networkCheck = status.checks.find(c => c.name === 'network-connectivity');
      
      expect(networkCheck!.status).toBe('pass');
      expect(networkCheck!.message).toBe('Network connection available');
      expect(networkCheck!.details?.onLine).toBe(true);
    });

    it('should warn when offline', async () => {
      mockNavigator.onLine = false;

      const status = await service.getHealthStatus();
      const networkCheck = status.checks.find(c => c.name === 'network-connectivity');
      
      expect(networkCheck!.status).toBe('warn');
      expect(networkCheck!.message).toBe('No network connection detected');
      expect(networkCheck!.details?.onLine).toBe(false);
    });

    it('should warn when network status API is not available', async () => {
      const navigatorWithoutOnline = { ...mockNavigator };
      delete (navigatorWithoutOnline as any).onLine;
      Object.defineProperty(global, 'navigator', {
        value: navigatorWithoutOnline,
        writable: true
      });

      const serviceWithoutNetworkApi = new HealthCheckService();
      const status = await serviceWithoutNetworkApi.getHealthStatus();
      const networkCheck = status.checks.find(c => c.name === 'network-connectivity');
      
      expect(networkCheck!.status).toBe('warn');
      expect(networkCheck!.message).toBe('Network status API not available');

      serviceWithoutNetworkApi.stopMonitoring();
    });
  });

  describe('storage availability checks', () => {
    it('should pass when localStorage works correctly', async () => {
      mockLocalStorage.getItem.mockReturnValue('test');

      const status = await service.getHealthStatus();
      const storageCheck = status.checks.find(c => c.name === 'local-storage');
      
      expect(storageCheck!.status).toBe('pass');
      expect(storageCheck!.message).toBe('Local storage working');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('__health_check_test__', 'test');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('__health_check_test__');
    });

    it('should fail when localStorage test fails', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const status = await service.getHealthStatus();
      const storageCheck = status.checks.find(c => c.name === 'local-storage');
      
      expect(storageCheck!.status).toBe('fail');
      expect(storageCheck!.message).toBe('Local storage test failed');
    });

    it('should fail when localStorage throws error', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const status = await service.getHealthStatus();
      const storageCheck = status.checks.find(c => c.name === 'local-storage');
      
      expect(storageCheck!.status).toBe('fail');
      expect(storageCheck!.message).toBe('Local storage not available or full');
      expect(storageCheck!.details?.error).toContain('QuotaExceededError');
    });
  });

  describe('monitoring interval', () => {
    it('should start monitoring on initialization', () => {
      expect(setInterval).toHaveBeenCalled();
    });

    it('should not start multiple monitoring intervals', () => {
      const intervalCallCount = vi.mocked(setInterval).mock.calls.length;
      
      service.startMonitoring();
      service.startMonitoring();
      
      expect(setInterval).toHaveBeenCalledTimes(intervalCallCount);
    });

    it('should stop monitoring when requested', () => {
      service.stopMonitoring();
      
      expect(clearInterval).toHaveBeenCalled();
    });

    it('should use custom interval when provided', () => {
      const customService = new HealthCheckService({
        timeout: 5000,
        retries: 2,
        interval: 60000
      });

      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 60000);
      
      customService.stopMonitoring();
    });
  });

  describe('overall status calculation', () => {
    it('should return healthy when all checks pass', async () => {
      const status = await service.getHealthStatus();
      
      expect(status.status).toBe('healthy');
      expect(status.checks.every(c => c.status === 'pass')).toBe(true);
    });

    it('should return degraded when some checks warn', async () => {
      mockNavigator.onLine = false; // This will cause a warning

      const status = await service.getHealthStatus();
      
      expect(status.status).toBe('degraded');
      expect(status.checks.some(c => c.status === 'warn')).toBe(true);
    });

    it('should return unhealthy when any check fails', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const status = await service.getHealthStatus();
      
      expect(status.status).toBe('unhealthy');
      expect(status.checks.some(c => c.status === 'fail')).toBe(true);
    });
  });

  describe('custom health checks', () => {
    it('should register and run custom health checks', async () => {
      const customCheck = vi.fn().mockResolvedValue({
        name: 'custom',
        status: 'pass' as const,
        message: 'Custom check passed',
        duration: 0
      });

      service.registerCheck('custom', customCheck);
      const status = await service.getHealthStatus();
      
      expect(customCheck).toHaveBeenCalled();
      expect(status.checks.find(c => c.name === 'custom')).toBeDefined();
      expect(status.checks.find(c => c.name === 'custom')!.status).toBe('pass');
    });

    it('should handle custom check failures', async () => {
      const failingCheck = vi.fn().mockRejectedValue(new Error('Custom check failed'));

      service.registerCheck('failing', failingCheck);
      const status = await service.getHealthStatus();
      
      const customCheck = status.checks.find(c => c.name === 'failing');
      expect(customCheck!.status).toBe('fail');
      expect(customCheck!.message).toBe('Custom check failed');
    });

    it('should handle custom check timeouts', async () => {
      const timeoutCheck = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );

      const fastService = new HealthCheckService({
        timeout: 100,
        retries: 1,
        interval: 30000
      });

      fastService.registerCheck('timeout', timeoutCheck);
      const status = await fastService.getHealthStatus();
      
      const timeoutCheckResult = status.checks.find(c => c.name === 'timeout');
      expect(timeoutCheckResult!.status).toBe('fail');
      expect(timeoutCheckResult!.message).toBe('Health check timeout');

      fastService.stopMonitoring();
    });
  });

  describe('geolocation API check', () => {
    it('should pass when geolocation API is available', async () => {
      const status = await service.getHealthStatus();
      const geoCheck = status.checks.find(c => c.name === 'geolocation-api');
      
      expect(geoCheck!.status).toBe('pass');
      expect(geoCheck!.message).toBe('Geolocation API available');
    });

    it('should fail when geolocation API is not available', async () => {
      const navigatorWithoutGeo = { ...mockNavigator };
      delete (navigatorWithoutGeo as any).geolocation;
      Object.defineProperty(global, 'navigator', {
        value: navigatorWithoutGeo,
        writable: true
      });

      const serviceWithoutGeo = new HealthCheckService();
      const status = await serviceWithoutGeo.getHealthStatus();
      const geoCheck = status.checks.find(c => c.name === 'geolocation-api');
      
      expect(geoCheck!.status).toBe('fail');
      expect(geoCheck!.message).toBe('Geolocation API not available');

      serviceWithoutGeo.stopMonitoring();
    });
  });

  describe('service worker check', () => {
    it('should pass when service worker is active', async () => {
      mockNavigator.serviceWorker.getRegistration.mockResolvedValue({
        active: {},
        scope: '/test-scope'
      });

      const status = await service.getHealthStatus();
      const swCheck = status.checks.find(c => c.name === 'service-worker');
      
      expect(swCheck!.status).toBe('pass');
      expect(swCheck!.message).toBe('Service worker active');
      expect(swCheck!.details?.scope).toBe('/test-scope');
    });

    it('should warn when service worker is not active', async () => {
      mockNavigator.serviceWorker.getRegistration.mockResolvedValue({
        active: null,
        scope: '/test-scope'
      });

      const status = await service.getHealthStatus();
      const swCheck = status.checks.find(c => c.name === 'service-worker');
      
      expect(swCheck!.status).toBe('warn');
      expect(swCheck!.message).toBe('Service worker not active');
    });

    it('should warn when service worker API is not available', async () => {
      const navigatorWithoutSW = { ...mockNavigator };
      delete (navigatorWithoutSW as any).serviceWorker;
      Object.defineProperty(global, 'navigator', {
        value: navigatorWithoutSW,
        writable: true
      });

      const serviceWithoutSW = new HealthCheckService();
      const status = await serviceWithoutSW.getHealthStatus();
      const swCheck = status.checks.find(c => c.name === 'service-worker');
      
      expect(swCheck!.status).toBe('warn');
      expect(swCheck!.message).toBe('Service Worker API not available');

      serviceWithoutSW.stopMonitoring();
    });

    it('should warn when service worker check throws error', async () => {
      mockNavigator.serviceWorker.getRegistration.mockRejectedValue(new Error('SW error'));

      const status = await service.getHealthStatus();
      const swCheck = status.checks.find(c => c.name === 'service-worker');
      
      expect(swCheck!.status).toBe('warn');
      expect(swCheck!.message).toBe('Service worker check failed');
    });
  });

  describe('external API checks', () => {
    it('should pass when external API is reachable', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK'
      } as Response);

      const status = await service.getHealthStatus();
      const apiCheck = status.checks.find(c => c.name === 'external-apis');
      
      expect(apiCheck!.status).toBe('pass');
      expect(apiCheck!.message).toBe('External API connectivity working');
      expect(apiCheck!.details?.statusCode).toBe(200);
    });

    it('should warn when external API returns error', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      const status = await service.getHealthStatus();
      const apiCheck = status.checks.find(c => c.name === 'external-apis');
      
      expect(apiCheck!.status).toBe('warn');
      expect(apiCheck!.message).toBe('External API connectivity degraded');
      expect(apiCheck!.details?.statusCode).toBe(500);
    });

    it('should warn when external API is unreachable', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const status = await service.getHealthStatus();
      const apiCheck = status.checks.find(c => c.name === 'external-apis');
      
      expect(apiCheck!.status).toBe('warn');
      expect(apiCheck!.message).toBe('External API connectivity may be limited');
    });
  });

  describe('health status caching', () => {
    it('should cache last health status', async () => {
      const firstStatus = await service.getHealthStatus();
      const cachedStatus = service.getLastHealthStatus();
      
      expect(cachedStatus).toEqual(firstStatus);
    });

    it('should return null for last status before first check', () => {
      const newService = new HealthCheckService();
      expect(newService.getLastHealthStatus()).toBeNull();
      newService.stopMonitoring();
    });
  });

  describe('isHealthy method', () => {
    it('should return true when healthy', async () => {
      const isHealthy = await service.isHealthy();
      expect(isHealthy).toBe(true);
    });

    it('should return false when unhealthy', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const isHealthy = await service.isHealthy();
      expect(isHealthy).toBe(false);
    });
  });

  describe('health endpoint middleware', () => {
    it('should return 200 for healthy status', async () => {
      const req = {};
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      const endpoint = createHealthEndpoint();
      await endpoint(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'healthy'
      }));
    });

    it('should return 200 for degraded status', async () => {
      mockNavigator.onLine = false;

      const req = {};
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      const endpoint = createHealthEndpoint();
      await endpoint(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'degraded'
      }));
    });

    it('should return 503 for unhealthy status', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const req = {};
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      const endpoint = createHealthEndpoint();
      await endpoint(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'unhealthy'
      }));
    });

    it('should handle endpoint errors', async () => {
      // Mock health check to throw error
      const errorService = new HealthCheckService();
      errorService.registerCheck('error', async () => {
        throw new Error('Health check error');
      });

      const originalHealthCheck = (global as any).healthCheck;
      (global as any).healthCheck = errorService;

      const req = {};
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      const endpoint = createHealthEndpoint();

      // Mock getHealthStatus to throw
      errorService.getHealthStatus = vi.fn().mockRejectedValue(new Error('Service error'));

      await endpoint(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'unhealthy',
        message: 'Health check failed'
      }));

      (global as any).healthCheck = originalHealthCheck;
      errorService.stopMonitoring();
    });
  });

  describe('status metadata', () => {
    it('should include correct metadata in status', async () => {
      const status = await service.getHealthStatus();
      
      expect(status.timestamp).toBeTypeOf('number');
      expect(status.uptime).toBeGreaterThan(0);
      expect(status.version).toBe('1.0.0');
      expect(status.environment).toBe('development');
    });

    it('should handle production environment', async () => {
      mockEnv.PROD = true;
      
      const prodService = new HealthCheckService();
      const status = await prodService.getHealthStatus();
      
      expect(status.environment).toBe('production');
      
      prodService.stopMonitoring();
    });

    it('should handle unknown version', async () => {
      mockEnv.VITE_APP_VERSION = undefined;
      
      const unknownVersionService = new HealthCheckService();
      const status = await unknownVersionService.getHealthStatus();
      
      expect(status.version).toBe('unknown');
      
      unknownVersionService.stopMonitoring();
    });
  });
});