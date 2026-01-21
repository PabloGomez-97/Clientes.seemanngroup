// src/components/administrador/PricingTabs.tsx
import { useState } from 'react';
import { Tab, Tabs } from 'react-bootstrap';
import Pricing from './Pricing/Pricing';
import PricingFCL from './Pricing/PricingFCL';
import PricingLCL from './Pricing/PricingLCL';
import './PricingTabs.css';

function PricingTabs() {
  const [activeKey, setActiveKey] = useState<string>('air');

  return (
    <div className="pricing-tabs-container">
      {/* Header Premium */}
      <div className="pricing-header">
        <div className="header-content">
          <div className="header-left">
            <img 
              src="/logocompleto.png" 
              alt="Seemann Group Logo" 
              className="header-logo"
            />
            <div className="header-text">
              <h1 className="header-title">Gestión Integral de Tarifas</h1>
              <p className="header-subtitle">Administra tus precios de envíos aéreos, FCL y LCL en un solo lugar</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs personalizadas */}
      <div className="tabs-wrapper">
        <Tabs
          id="pricing-tabs"
          activeKey={activeKey}
          onSelect={(k) => setActiveKey(k as string)}
          className="custom-tabs"
        >
          <Tab 
            eventKey="air" 
            title={
              <div className="tab-title">
                <div className="tab-icon airplane-icon">
                  <i className="bi bi-airplane-fill"></i>
                </div>
                <span>Aéreo</span>
              </div>
            }
            tabClassName={activeKey === 'air' ? 'tab-active' : 'tab-inactive'}
          >
            <div className="tab-content">
              <Pricing />
            </div>
          </Tab>

          <Tab 
            eventKey="fcl" 
            title={
              <div className="tab-title">
                <div className="tab-icon fcl-icon">
                  <i className="bi bi-box-seam-fill"></i>
                </div>
                <span>FCL</span>
              </div>
            }
            tabClassName={activeKey === 'fcl' ? 'tab-active' : 'tab-inactive'}
          >
            <div className="tab-content">
              <PricingFCL />
            </div>
          </Tab>

          <Tab 
            eventKey="lcl" 
            title={
              <div className="tab-title">
                <div className="tab-icon lcl-icon">
                  <i className="bi bi-box2-fill"></i>
                </div>
                <span>LCL</span>
              </div>
            }
            tabClassName={activeKey === 'lcl' ? 'tab-active' : 'tab-inactive'}
          >
            <div className="tab-content">
              <PricingLCL />
            </div>
          </Tab>
        </Tabs>
      </div>
    </div>
  );
}

export default PricingTabs;
