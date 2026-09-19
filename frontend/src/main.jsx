import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
// Agar AuthContext alag se wrap karna ho toh uncomment karo:
// import { AuthProvider } from './context/AuthContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        {/* <AuthProvider> */}
          <App />
        {/* </AuthProvider> */}
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
