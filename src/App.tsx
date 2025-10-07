// src/App.tsx
import { useAuth } from './auth/AuthContext';
import AdminApp from './AdminApp';
import RegularApp from './RegularApp';

function App() {
  const { user } = useAuth();

  // Si el usuario es "Administrador", muestra AdminApp
  if (user?.username === 'Administrador') {
    return <AdminApp />;
  }

  // Para todos los demás usuarios, muestra RegularApp
  return <RegularApp />;
}

export default App;