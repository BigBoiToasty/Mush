import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './holo/index.css' // before the app's own CSS, as the old <link> tags were
import './index.css'
import App from './App'
import SharedBinderView from './SharedBinderView'

const shareToken = new URLSearchParams(window.location.search).get('share')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {shareToken ? <SharedBinderView token={shareToken} /> : <App />}
  </StrictMode>,
)
