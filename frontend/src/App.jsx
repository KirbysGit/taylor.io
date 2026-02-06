// app.jsx

// basically the root component for our frontend.

// imports.
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Landing from './pages/1landing/Landing'
import Auth from './pages/2auth/Auth'
import AccountSetup from './pages/3setup/AccountSetup'
import Home from './pages/4home/Home'
import ResumePreview from './pages/5resume/ResumePreview'
import Info from './pages/info/Info'
import ProtectedRoute from './components/ProtectedRoute'

// ----------- main component -----------

function App() {
  return (
    <Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#333',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#ec4899', // brand-pink
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444', // red-500
              secondary: '#fff',
            },
          },
        }}
      />
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
            <ProtectedRoute requireSetup={true}>
              <Home />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/info" 
          element={
            <ProtectedRoute requireSetup={true}>
              <Info />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/resume/preview" 
          element={
            <ProtectedRoute requireSetup={true}>
              <ResumePreview />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  )
}

export default App

