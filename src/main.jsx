import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import SharedBinderView from './SharedBinderView'

const shareToken = new URLSearchParams(window.location.search).get('share')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {shareToken ? <SharedBinderView token={shareToken} /> : <App />}
  </StrictMode>,
)
