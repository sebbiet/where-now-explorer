# Where Now Explorer

A location-based web application for families that provides real-time location tracking and destination progress monitoring. The "There yet app!" answers the timeless question: "Are we there yet?"

## Project History

This is an independent web application built with React and TypeScript.

## Features

- **Real-time Location Tracking**: View your current location with automatic updates every 30 seconds
- **Destination Monitoring**: Set a destination and track your progress with distance and time estimates
- **Family-Friendly Design**: Colorful, playful interface designed for children
- **Dark Mode Support**: Toggle between light and dark themes

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd where-now-explorer

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:8080/`

### Troubleshooting Location Services

If you're getting location errors:

1. **Check Browser Permissions**: Click the location icon in your browser's address bar and allow location access
2. **Enable HTTPS (if needed)**: Some browsers require HTTPS for geolocation. To enable:
   - Edit `vite.config.ts` and change `https: false` to `https: true`
   - Run `npm run dev` and accept the self-signed certificate warning
3. **Check System Settings**: Ensure your OS allows the browser to access location services

## Technology Stack

This project is built with:

- **Vite**: Fast build tool and development server
- **TypeScript**: Type-safe JavaScript
- **React**: UI library
- **shadcn/ui**: Component library
- **Tailwind CSS**: Utility-first CSS framework
- **Vitest**: Unit testing framework with Testing Library

## Available Scripts

```sh
npm run dev        # Start development server on port 8080
npm run build      # Build for production
npm run lint       # Run ESLint
npm run preview    # Preview production build
npm test           # Run unit tests with Vitest
npm run test:run   # Run tests once (CI mode)
npm run coverage   # Generate test coverage report
```

## License

This project is open source and available under the MIT License.
