import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ContentBrief from './ContentBrief.jsx'

const isContentBrief = window.location.pathname.startsWith('/content-brief')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isContentBrief ? <ContentBrief /> : <App />}
  </StrictMode>,
)
