// app.jsx

// basically the root component for our frontend.

// imports.
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Landing from './pages/1landing/Landing'
import Auth from './pages/2auth/Auth'
import AccountSetup from './pages/3setup/AccountSetup'
import Home from './pages/4home/Home'
import ResumePreview from './pages/5resume/ResumePreview'
import ResumesHub from './pages/5resume/ResumesHub'
import ResumeCreate from './pages/5resume/ResumeCreate'
import ResumeChoose from './pages/5resume/ResumeChoose'
import ResumeTailorSetup from './pages/5resume/ResumeTailorSetup'
import Info from './pages/info/Info'
import TemplatesPage from './pages/templates/TemplatesPage'
import Settings from './pages/settings/Settings'
import ProtectedRoute from './components/ProtectedRoute'
import ThemedToaster from './components/notifications/ThemedToaster'
import NotFound from './pages/notfound/NotFound'

// ----------- main component -----------

function App() {
  return (
    <Router>
      <ThemedToaster />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/reset-password" element={<Auth />} />
        <Route path="/auth/verify-email" element={<Auth />} />
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
          path="/templates" 
          element={
            <ProtectedRoute requireSetup={true}>
              <TemplatesPage />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute requireSetup={true}>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/resumes" 
          element={
            <ProtectedRoute requireSetup={true}>
              <ResumesHub />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/resume/create" 
          element={
            <ProtectedRoute requireSetup={true}>
              <ResumeCreate />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/resume/create/choose" 
          element={
            <ProtectedRoute requireSetup={true}>
              <ResumeChoose />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/resume/create/tailor" 
          element={
            <ProtectedRoute requireSetup={true}>
              <ResumeTailorSetup />
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
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  )
}

export default App
