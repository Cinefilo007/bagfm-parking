import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import 'leaflet/dist/leaflet.css';
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useAuthStore } from './store/auth.store'
import { registerSW } from 'virtual:pwa-register'

// Registrar Service Worker para PWA
registerSW({ immediate: true })

// Hidratar sesión local al iniciar la app
useAuthStore.getState().checkSession()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Toaster 
      position="top-center"
      toastOptions={{
        duration: 5000,
        style: {
          background: '#1A1F2F',
          color: '#DEE1F7',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '600'
        },
        success: {
          iconTheme: {
            primary: '#4EDEA3',
            secondary: '#003824',
          },
        },
        error: {
          duration: 20000,
          iconTheme: {
            primary: '#FFAB4B',
            secondary: '#93000A',
          },
        }
      }}
    />
    <RouterProvider router={router} />
  </StrictMode>,
)
