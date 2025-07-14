# Deployment Guide for Where Now Explorer

This guide explains how to deploy the Where Now Explorer app to GitHub Pages.

## Prerequisites

- GitHub repository with Pages enabled
- Node.js and npm installed
- Push access to the repository

## Automatic Deployment (Recommended)

The project includes a GitHub Actions workflow that automatically deploys to GitHub Pages whenever you push to the `main` branch.

### Setup GitHub Pages (One-time setup)

1. Go to your repository on GitHub: https://github.com/sebbiet/where-now-explorer
2. Navigate to Settings → Pages
3. Under "Source", select "GitHub Actions"
4. Save the settings

### Deploy

Simply push your changes to the main branch:

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

The GitHub Action will automatically:
- Build the project
- Deploy to GitHub Pages
- Make it available at: https://sebbiet.github.io/where-now-explorer/

## Manual Deployment

If you prefer to deploy manually:

```bash
# Build and deploy
npm run deploy
```

This command will:
1. Build the project with the correct base path
2. Deploy the `dist` folder to the `gh-pages` branch
3. GitHub Pages will serve from this branch

## Important Notes

### HTTPS Requirement for Geolocation

The Geolocation API requires HTTPS to work. GitHub Pages provides HTTPS by default, so this should work automatically.

### Base Path Configuration

The app is configured with the base path `/where-now-explorer/` in `vite.config.ts`. This ensures all assets load correctly when deployed to GitHub Pages.

### Custom Domain (Optional)

If you want to use a custom domain:
1. Update the `public/CNAME` file with your domain
2. Configure your domain's DNS to point to GitHub Pages
3. Enable custom domain in repository settings

### Troubleshooting

If the app doesn't load correctly:

1. **Check deployment status**: Go to Actions tab in your repository to see if the deployment succeeded
2. **Wait a few minutes**: GitHub Pages can take up to 10 minutes to update
3. **Clear browser cache**: Force refresh with Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
4. **Check console errors**: Open browser developer tools to see any errors

### Environment Considerations

- The debug panel only appears in development mode
- All API calls (OpenStreetMap, OSRM) work from GitHub Pages
- Location permissions will prompt the user due to HTTPS

## Local Preview

To preview the production build locally:

```bash
npm run build
npm run preview
```

This will serve the built app at http://localhost:4173/where-now-explorer/