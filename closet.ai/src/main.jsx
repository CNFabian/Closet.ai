import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import TestComponent from './pages/test.jsx'
import DataAnalysis from './pages/DataAnalysis.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DataAnalysis />
  </StrictMode>,
)
