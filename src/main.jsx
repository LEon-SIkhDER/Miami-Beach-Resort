import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { RouterProvider } from 'react-router'
import { router } from './Router/router.jsx'
import AuthProvider from './Context/AuthProvider.jsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster position="top-center"/>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)

// Smoothly dismiss luxury PWA splash screen once the app is mounted
const hidePwaSplash = () => {
  const splash = document.getElementById('pwa-splash')
  if (splash) {
    if (window.innerWidth >= 640) {
      try { splash.remove() } catch { /* ignore */ }
      return
    }
    splash.classList.add('splash-fade-out')
    setTimeout(() => {
      try { splash.remove() } catch { /* ignore */ }
    }, 650)
  }
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    setTimeout(hidePwaSplash, 550)
  } else {
    window.addEventListener('load', () => setTimeout(hidePwaSplash, 550))
  }

  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.log('PWA Service Worker registration:', err)
      })
    })
  }
}

