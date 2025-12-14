
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { DigitalTwinView } from './components/DigitalTwinView';
import { AssetManager } from './components/AssetManager';
import { TicketManager } from './components/TicketManager';
import { PreventiveManager } from './components/PreventiveManager';
import { WorkOrderKanban } from './components/WorkOrderKanban';
import { InventoryManager } from './components/InventoryManager';
import { PurchaseManager } from './components/PurchaseManager';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import { MobileFieldView } from './components/MobileFieldView'; // IMPORTED
import { ViewState } from './types';
import { MaintenanceProvider, useMaintenance } from './context/MaintenanceContext';

function AppContent() {
  const [showLanding, setShowLanding] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  const { assets, plans, addPlan, updatePlan, addTicket } = useMaintenance();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView setView={setCurrentView} />;
      case 'analytics':
        return <AnalyticsView />;
      case 'digital-twin':
        return <DigitalTwinView />;
      case 'assets':
        return <AssetManager />;
      case 'tickets':
        return <TicketManager />;
      case 'preventive':
        return (
          <PreventiveManager 
            plans={plans} 
            assets={assets} 
            onAddPlan={addPlan}
            onUpdatePlan={updatePlan}
            onCreateTicket={addTicket}
          />
        );
      case 'kanban':
        return <WorkOrderKanban />;
      case 'inventory':
        return <InventoryManager />;
      case 'purchases': 
        return <PurchaseManager />;
      case 'settings':
        return <SettingsView />;
      case 'mobile-field': // NEW ROUTE
        return <MobileFieldView />;
      default:
        return <DashboardView setView={setCurrentView} />;
    }
  };

  const getPageTitle = () => {
    switch (currentView) {
        case 'dashboard': return 'Dashboard Geral';
        case 'analytics': return 'BI & Analytics';
        case 'digital-twin': return 'Visualização 3D & Digital Twin';
        case 'assets': return 'Gestão de Ativos (3.1)';
        case 'tickets': return 'Chamados Corretivos (3.2)';
        case 'preventive': return 'Planejamento Preventivo (3.3)';
        case 'kanban': return 'Execução de Ordens';
        case 'inventory': return 'Gestão de Almoxarifado';
        case 'purchases': return 'Gestão de Compras';
        case 'settings': return 'Configurações & Administração';
        default: return 'Painel de Controle';
    }
  }

  // Se estiver no estado de Landing Page, renderiza apenas ela
  if (showLanding) {
      return <LandingPage onEnter={() => setShowLanding(false)} />;
  }

  // If Mobile Field View is active, Render without default shell to simulate native app feel
  if (currentView === 'mobile-field') {
      return (
          <div className="h-screen w-full bg-black font-sans">
              <MobileFieldView />
          </div>
      );
  }

  return (
    <div className="flex h-screen w-full bg-omni-dark text-slate-200 font-sans grid-bg">
      <Sidebar currentView={currentView} setView={setCurrentView} />
      
      <main className="flex-1 flex flex-col min-w-0">
        <Header title={getPageTitle()} setView={setCurrentView} />
        <div className="flex-1 overflow-hidden relative">
           {renderView()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <MaintenanceProvider>
      <AppContent />
    </MaintenanceProvider>
  );
}
