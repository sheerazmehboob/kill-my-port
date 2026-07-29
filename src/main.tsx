import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('[Renderer] Main.tsx executing...');
console.log('[Renderer] window.electronAPI available:', !!window.electronAPI);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
