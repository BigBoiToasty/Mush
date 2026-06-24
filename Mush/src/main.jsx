import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import LoginCard from './LoginCard.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LoginCard />
  </StrictMode>,
)
