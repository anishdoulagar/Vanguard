import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// StrictMode intentionally removed — it causes double invocation of effects
// which triggers duplicate API scans in development mode.
createRoot(document.getElementById('root')).render(<App />)
