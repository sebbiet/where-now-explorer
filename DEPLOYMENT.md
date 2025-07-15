# Deployment Guide for Where Now Explorer

This guide explains how to deploy the Where Now Explorer app to GitHub Pages.

## Prerequisites

- GitHub repository with Pages enabled
- Node.js and npm installed
- Push access to the repository

## Automatic Deployment (Recommended)

The project includes a GitHub Actions workflow that automatically deploys to GitHub Pages whenever you push to the `main` branch.

### Setup GitHub Pages (One-time setup)

1. Go to your repository on GitHub
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
- Make it available at: https://thereyetapp.com/

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

## Environment Variables

### Debug Panel Access

To enable debug panel access in production:

1. Create a `.env` file in your project root (copy from `.env.example`)
2. Set a secure debug key:
   ```bash
   VITE_DEBUG_KEY=your-secret-debug-key
   ```
3. Build and deploy the application
4. Access the debug panel in production by appending `?debug=your-secret-debug-key` to the URL

**Important Security Notes:**
- Never commit your `.env` file to version control
- Use a strong, unique key that's hard to guess
- Change the key periodically for better security
- The debug panel is always visible in development mode without a key

## Important Notes

### HTTPS Requirement for Geolocation

The Geolocation API requires HTTPS to work. GitHub Pages provides HTTPS by default, so this should work automatically.

### Base Path Configuration

The app is configured with the base path `/` in `vite.config.ts` for deployment to the custom domain.

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

- The debug panel only appears in development mode by default
- To enable debug panel in production, see "Debug Panel Access" section below
- All API calls (OpenStreetMap, OSRM) work from GitHub Pages
- Location permissions will prompt the user due to HTTPS

## Debug Panel Access (Production)

The debug panel can be accessed in production using a secret key:

1. **Set up environment variable** (for deployment):
   ```bash
   # Create .env file (DO NOT commit this file)
   cp .env.example .env
   
   # Edit .env and set your secret key
   VITE_DEBUG_KEY=your-very-secret-key-here
   ```

2. **Deploy with environment variable**:
   - For GitHub Actions: Add `VITE_DEBUG_KEY` as a repository secret
   - For manual deployment: Ensure the .env file is present during build

3. **Access debug panel in production**:
   ```
   https://yoursite.com?debug=your-very-secret-key-here
   ```

**Security Notes:**
- Never commit the actual debug key to version control
- Use a strong, unique key that's hard to guess
- Change the key periodically for better security
- The debug panel is completely hidden without the correct key

## Local Preview

To preview the production build locally:

```bash
npm run build
npm run preview
```

This will serve the built app at http://localhost:4173/