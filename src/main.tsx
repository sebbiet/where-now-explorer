import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from './utils/serviceWorker'
import './utils/performanceMonitor'

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for offline support
if (import.meta.env.PROD) {
  registerSW();
}
