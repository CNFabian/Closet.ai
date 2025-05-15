import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import TestComponent from './pages/firestoreTest.jsx'
import Header from './components/Header.jsx'
import GeminiChat from './components/geminiChat.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Header />
    <GeminiChat />
    <TestComponent />
  </StrictMode>,
)
