// main.jsx

// entry point for frontend.

// imports.
import React from 'react'
import App from './App.jsx'
import ReactDOM from 'react-dom/client'

// render app.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

