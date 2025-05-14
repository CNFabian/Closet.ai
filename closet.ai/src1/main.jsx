import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './services/firebase/config.js' // Initialize Firebase
import './index.css'
import TestComponent from './pages/test.jsx'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)