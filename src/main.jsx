import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QuickitThemeProvider, Toaster } from 'quickit-ui'
import '@/styles/global.css'
import App from './App.jsx'
import { AuthProvider } from './auth.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <QuickitThemeProvider defaultTheme="system" radius="8px" storageKey="short_qr" lang="es">
        <Toaster position="bottom-right" />
        <AuthProvider>
          <App />
        </AuthProvider>
      </QuickitThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
