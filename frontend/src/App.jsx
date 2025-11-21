// app.jsx

// basically the root component for our frontend.

// imports.
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Landing from './pages/1landing/Landing'
import Auth from './pages/2auth/Auth'
import AccountSetup from './pages/3setup/AccountSetup'
import Home from './pages/4home/Home'
import ProtectedRoute from './components/ProtectedRoute'

// ----------- main component -----------

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route 
          path="/setup" 
          element={
            <ProtectedRoute>
              <AccountSetup />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/home" 
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  )
}

export default App

