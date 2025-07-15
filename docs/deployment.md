# Deployment Guide

This guide covers how to deploy Where Now Explorer to various hosting platforms and environments.

## Table of Contents

- [Overview](#overview)
- [Build Process](#build-process)
- [Deployment Options](#deployment-options)
- [Environment Configuration](#environment-configuration)
- [Production Considerations](#production-considerations)
- [Monitoring and Maintenance](#monitoring-and-maintenance)

---

## Overview

Where Now Explorer is a client-side web application built with React, TypeScript, and Vite. It requires:

- **Static hosting** (no server-side rendering)
- **HTTPS** (required for location services)
- **Modern browser support** (ES2020+)
- **No database** (all data stored client-side)

### Technologies Used

- **Frontend:** React 18, TypeScript, Tailwind CSS
- **Build Tool:** Vite
- **PWA:** Service Worker, Web App Manifest
- **APIs:** OpenStreetMap Nominatim (external)

---

## Build Process

### Prerequisites

- Node.js 18+ and npm
- Git access to repository
- Environment variables configured

### Local Development

```bash
# Clone repository
git clone <repository-url>
cd where-now-explorer

# Install dependencies
npm install

# Start development server
npm run dev

# Access at http://localhost:8080
```

### Production Build

```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview

# Output directory: dist/
```

### Build Scripts

- `npm run dev` - Development server with hot reload
- `npm run build` - Production build
- `npm run preview` - Preview production build
- `npm run lint` - Code linting
- `npm test` - Run test suite
- `npm run coverage` - Test coverage report

---

## Deployment Options

### 1. GitHub Pages (Current)

**Automated deployment via GitHub Actions:**

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

**Manual deployment:**

```bash
# Build and deploy to GitHub Pages
npm run deploy
```

### 2. Netlify

**Automatic deployment:**

1. Connect GitHub repository to Netlify
2. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** 18+

**Manual deployment:**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build project
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

**netlify.toml configuration:**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

### 3. Vercel

**Automatic deployment:**

1. Connect GitHub repository to Vercel
2. Zero-config deployment (auto-detects Vite)

**Manual deployment:**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**vercel.json configuration:**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### 4. AWS S3 + CloudFront

**S3 bucket setup:**

```bash
# Create S3 bucket
aws s3 mb s3://where-now-explorer

# Configure static website hosting
aws s3 website s3://where-now-explorer \
  --index-document index.html \
  --error-document index.html

# Upload files
npm run build
aws s3 sync dist/ s3://where-now-explorer --delete
```

**CloudFront distribution:**

```yaml
# cloudformation.yml
Resources:
  CloudFrontDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        DefaultCacheBehavior:
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6
        Origins:
          - Id: S3Origin
            DomainName: !GetAtt S3Bucket.DomainName
            S3OriginConfig:
              OriginAccessIdentity: !Sub 'origin-access-identity/cloudfront/${OAI}'
```

### 5. DigitalOcean App Platform

**app.yaml configuration:**

```yaml
name: where-now-explorer
services:
  - name: web
    source_dir: /
    github:
      repo: your-username/where-now-explorer
      branch: main
    run_command: npm start
    build_command: npm run build
    http_port: 8080
    instance_count: 1
    instance_size_slug: basic-xxs
    routes:
      - path: /
    static_sites:
      - name: app
        source_dir: dist
        index_document: index.html
        error_document: index.html
```

---

## Environment Configuration

### Environment Variables

Create `.env.production` for production settings:

```bash
# Production environment
VITE_APP_ENV=production
VITE_API_BASE_URL=https://nominatim.openstreetmap.org
VITE_APP_VERSION=1.0.0
VITE_ANALYTICS_ID=your-analytics-id
```

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['date-fns', 'clsx'],
        },
      },
    },
  },
  server: {
    port: 8080,
    host: true,
  },
});
```

### PWA Configuration

```typescript
// vite.config.ts - PWA plugin
import { VitePWA } from 'vite-plugin-pwa';

plugins: [
  VitePWA({
    registerType: 'autoUpdate',
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    },
    manifest: {
      name: 'Where Now Explorer',
      short_name: 'WhereNow',
      description: 'Kid-friendly location tracking app',
      theme_color: '#3b82f6',
      background_color: '#ffffff',
      display: 'standalone',
      icons: [
        {
          src: 'icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: 'icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    },
  }),
];
```

---

## Production Considerations

### Security

**HTTPS Requirements:**

- Location services require HTTPS
- Service workers require HTTPS
- Configure SSL/TLS certificates

**Content Security Policy:**

```html
<!-- index.html -->
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; 
               script-src 'self' 'unsafe-eval' *.openstreetmap.org;
               style-src 'self' 'unsafe-inline';
               img-src 'self' data: *.openstreetmap.org;
               connect-src 'self' *.openstreetmap.org;"
/>
```

**Security Headers:**

```
# _headers (Netlify) or similar
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(self)
```

### Performance

**Optimization checklist:**

- Enable gzip/brotli compression
- Configure proper cache headers
- Optimize images (WebP with fallbacks)
- Code splitting and lazy loading
- Service worker caching

**Cache Headers:**

```
# Static assets (long cache)
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# HTML (short cache)
/*.html
  Cache-Control: public, max-age=3600

# Service worker (no cache)
/sw.js
  Cache-Control: no-cache
```

### Monitoring

**Analytics Setup:**

```typescript
// src/utils/analytics.ts
import { GTagEvent } from './types';

export const trackEvent = (event: GTagEvent) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', event.action, {
      event_category: event.category,
      event_label: event.label,
      value: event.value,
    });
  }
};
```

**Error Tracking:**

```typescript
// src/utils/errorTracking.ts
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Send to error tracking service
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Send to error tracking service
});
```

### Health Checks

**Status endpoint simulation:**

```typescript
// src/utils/healthCheck.ts
export const performHealthCheck = async () => {
  const checks = {
    location: await checkLocationServices(),
    api: await checkApiConnectivity(),
    storage: checkLocalStorage(),
  };

  return {
    status: Object.values(checks).every(Boolean) ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  };
};
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm run test:run

      - name: Build project
        run: npm run build

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install and build
        run: |
          npm ci
          npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Quality Gates

**Pre-deployment checks:**

- All tests pass
- Linting passes
- Build succeeds
- Performance budget met
- Security scan passes

### Automated Testing

```bash
# package.json scripts
{
  "scripts": {
    "test:ci": "vitest run --coverage --reporter=junit",
    "lint:ci": "eslint . --format junit",
    "build:ci": "npm run build && npm run test:build",
    "test:build": "npm run preview & npx wait-on http://localhost:4173"
  }
}
```

---

## Monitoring and Maintenance

### Performance Monitoring

**Core Web Vitals tracking:**

```typescript
// src/utils/webVitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

const sendToAnalytics = (metric) => {
  if (window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.value),
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true,
    });
  }
};

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### Error Monitoring

**Service integration:**

```typescript
// Initialize error tracking
import * as Sentry from '@sentry/browser';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.VITE_APP_ENV,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 0.1,
});
```

### Uptime Monitoring

**External monitoring services:**

- Pingdom
- UptimeRobot
- StatusCake
- AWS CloudWatch (if using AWS)

### Maintenance Tasks

**Regular maintenance:**

1. **Weekly:**
   - Review error logs
   - Check performance metrics
   - Update dependencies (automated via Dependabot)

2. **Monthly:**
   - Security audit
   - Performance audit
   - User feedback review

3. **Quarterly:**
   - Accessibility audit
   - Browser compatibility testing
   - Infrastructure review

### Rollback Strategy

**Quick rollback process:**

```bash
# Revert to previous GitHub Pages deployment
git revert HEAD
git push origin main

# Or restore from backup
git reset --hard <previous-commit>
git push --force-with-lease origin main
```

### Disaster Recovery

**Backup strategy:**

- Source code in Git (multiple remotes recommended)
- Build artifacts stored in CI/CD system
- Configuration documented
- DNS settings documented

**Recovery procedures:**

1. Restore from Git repository
2. Rebuild and redeploy
3. Verify functionality
4. Update monitoring

---

## Custom Domain Setup

### DNS Configuration

```
# DNS Records
CNAME   www.your-domain.com   your-username.github.io
A       your-domain.com       185.199.108.153
A       your-domain.com       185.199.109.153
A       your-domain.com       185.199.110.153
A       your-domain.com       185.199.111.153
```

### SSL Certificate

**GitHub Pages:** Automatic Let's Encrypt
**Netlify:** Automatic Let's Encrypt
**CloudFlare:** Free SSL with proxy
**AWS:** ACM certificates with CloudFront

---

This deployment guide provides comprehensive coverage for deploying Where Now Explorer to production environments with proper security, performance, and monitoring considerations.
