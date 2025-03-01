import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import BackgroundManager from './components/background/BackgroundManager';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import AgentDetail from './pages/AgentDetail';
import './index.css';
import { useEffect } from 'react';
import { initializeSocket } from './services/api';

// Create a client for React Query
const queryClient = new QueryClient();

// AppContent component to access location
function AppContent() {
  // Initialize socket connection when the app starts
  useEffect(() => {
    initializeSocket();
  }, []);

  return (
    <>
      <BackgroundManager />
      <Navbar />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/agents/:id" element={<AgentDetail />} />
          <Route path="/transactions" element={<Transactions />} />
        </Routes>
      </Layout>
      <Footer />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
