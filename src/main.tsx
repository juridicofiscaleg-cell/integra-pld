import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

async function setupServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return

  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((r) => r.unregister()))
    await navigator.serviceWorker.register(`${base}/sw.js`)
  } catch {
    // PWA opcional — no bloquear la app
  }
}

void setupServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
