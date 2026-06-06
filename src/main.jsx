import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ContentBrief from './ContentBrief.jsx'
import AmazonBidTool from './AmazonBidTool.jsx'

const path = window.location.pathname
const isContentBrief = path.startsWith('/content-brief')
const isAmazonBids = path.startsWith('/amazon-ads')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isContentBrief ? <ContentBrief /> : isAmazonBids ? <AmazonBidTool /> : <App />}
  </StrictMode>,
)
