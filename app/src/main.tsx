import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'


// Initialize demo data on app start
// Note: In production, you would remove this or make it conditional
const initializeApp = async () => {
  try {
    // Seed demo data (users, departments, projects, etc.)
    // WARNING: Running this on every load causes Firestore contention and blocks login
    // await seedAllDemoData()
    console.log('App initialization skipped')
  } catch (error) {
    console.error('App initialization error:', error)
  }
}

// Run initialization
initializeApp()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
