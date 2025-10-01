import { useState } from 'react';
import TokenForm from './components/tokenform/TokenForm';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import QuotesView from './components/quotes/QuotesView';
import AirShipmentsView from './components/shipments/AirShipmentsView.tsx';
import Reports from './components/reports/Reports.tsx';
import Settings from './components/settings/Settings.tsx';
import ShipmentsView from './components/shipments/Shipments.tsx';

function App() {
  const [accessToken, setAccessToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('quotes');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleTokenSaved = (token: string) => {
    console.log('Token recibido en App:', token ? 'Sí (longitud: ' + token.length + ')' : 'No');
    setAccessToken(token);
    setError(null);
  };

  const handleLogout = () => {
    setAccessToken('');
    setError(null);
    setActiveView('quotes');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (!accessToken) {
    return (
      <div className="container py-5">
        <div className="text-center mb-5">
          <h1 className="display-4 fw-bold text-primary mb-2">Cotizaciones Linbis</h1>
          <p className="text-muted">Sistema de gestión de cotizaciones</p>
        </div>
        <TokenForm 
          onTokenSaved={handleTokenSaved}
          error={error}
          setError={setError}
        />
      </div>
    );
  }

  return (
    <div className="d-flex" style={{ height: '100vh' }}>
      <Sidebar 
        activeView={activeView}
        setActiveView={setActiveView}
        isOpen={sidebarOpen}
      />

      <div className="flex-fill d-flex flex-column" style={{ overflow: 'hidden' }}>
        <Navbar 
          accessToken={accessToken}
          onLogout={handleLogout}
          toggleSidebar={toggleSidebar}
        />

        <div className="flex-fill p-4" style={{ overflowY: 'auto', backgroundColor: '#f8f9fa' }}>
          {activeView === 'quotes' && (
            <QuotesView 
              accessToken={accessToken}
              onLogout={handleLogout}
            />
          )}
          {activeView === 'shipments' && (
            <AirShipmentsView 
              accessToken={accessToken}
              onLogout={handleLogout}
            />
          )}
          {activeView === 'all-shipments' && (
            <ShipmentsView 
              accessToken={accessToken}
              onLogout={handleLogout}
            />
          )}
          {activeView === 'reports' && <Reports />}
          {activeView === 'settings' && <Settings />}
        </div>
      </div>
    </div>
  );
}

export default App;