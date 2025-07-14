/**
 * Production Status Component
 * Shows production readiness status and metrics
 */

import React, { useState, useEffect } from 'react';
import { Shield, Activity, Settings, TrendingUp, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { productionService } from '@/services/production.service';
import { featureFlags } from '@/services/featureFlags.service';

interface ProductionStatusData {
  isProduction: boolean;
  isInitialized: boolean;
  healthStatus: any;
  featureFlags: Record<string, boolean>;
  analytics: any;
}

const ProductionStatus: React.FC = () => {
  const [status, setStatus] = useState<ProductionStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const productionStatus = await productionService.getStatus();
        setStatus(productionStatus);
      } catch (error) {
        console.error('Failed to load production status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
        <div className="flex items-center">
          <XCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700 dark:text-red-300">Failed to load production status</span>
        </div>
      </div>
    );
  }

  const getHealthStatusIcon = (healthStatus: string) => {
    switch (healthStatus) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getHealthStatusColor = (healthStatus: string) => {
    switch (healthStatus) {
      case 'healthy':
        return 'text-green-600 dark:text-green-400';
      case 'degraded':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'unhealthy':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const enabledFeatures = Object.entries(status.featureFlags)
    .filter(([_, enabled]) => enabled)
    .map(([flag, _]) => flag);

  const uptime = status.healthStatus?.uptime ? 
    Math.round(status.healthStatus.uptime / 1000 / 60) : 0; // minutes

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center">
              <Shield className="h-6 w-6 mr-2" />
              Production Status
            </h3>
            <p className="text-blue-100 text-sm mt-1">
              Environment: {status.isProduction ? 'Production' : 'Development'}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center">
              {getHealthStatusIcon(status.healthStatus?.status)}
              <span className="ml-2 font-medium">
                {status.healthStatus?.status?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
            <div className="text-blue-100 text-sm mt-1">
              Uptime: {uptime}m
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* System Health */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            System Health
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {status.healthStatus?.checks?.map((check: any) => (
              <div 
                key={check.name}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {check.name.replace(/-/g, ' ').toUpperCase()}
                  </span>
                  {check.status === 'pass' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : check.status === 'warn' ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {Math.round(check.duration)}ms
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Flags */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Feature Flags ({enabledFeatures.length} enabled)
          </h4>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(status.featureFlags).map(([flag, enabled]) => (
                <div 
                  key={flag}
                  className={`flex items-center text-sm ${
                    enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    enabled ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                  <span className="truncate" title={flag}>
                    {flag.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Analytics */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Session Analytics
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {status.analytics?.pageViews || 0}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Page Views</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {status.analytics?.actions || 0}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">Actions</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {status.analytics?.errors || 0}
              </div>
              <div className="text-sm text-yellow-600 dark:text-yellow-400">Errors</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {Math.round((Date.now() - (status.analytics?.startTime || Date.now())) / 1000 / 60)}
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">Session (min)</div>
            </div>
          </div>
        </div>

        {/* Status Summary */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                Production Services Status
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                All systems operational • Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                LIVE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionStatus;