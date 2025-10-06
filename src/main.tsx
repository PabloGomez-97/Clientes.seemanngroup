// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider, useAuth } from './auth/AuthContext'
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import Login from './auth/Login'

function RootGate() {
  const { user } = useAuth();
  return user ? <App /> : <Login />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RootGate />
    </AuthProvider>
  </React.StrictMode>,
)
