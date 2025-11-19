// app.jsx

// basically the root component for our frontend.

// imports.
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Landing from './pages/1landing/Landing'
import Auth from './pages/2auth/Auth'

// ----------- main component -----------

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
      </Routes>
    </Router>
  )
}

export default App

