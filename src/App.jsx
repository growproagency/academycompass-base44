import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from './components/lib/SupabaseAuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Page imports
import Layout from './components/Layout';
import SignIn from './pages/SignIn';
import AccessPending from './pages/AccessPending';
import Dashboard from './pages/Dashboard';
import Rocks from './pages/Rocks';
import RockDetail from './pages/RockDetail';
import MyTasks from './pages/MyTasks';
import Announcements from './pages/Announcements';
import CalendarPage from './pages/CalendarPage';
import ArchivePage from './pages/ArchivePage';
import StrategicOrganizer from './pages/StrategicOrganizer';
import StrategicOrganizerPreview from './pages/StrategicOrganizerPreview';
import AdminPanel from './pages/AdminPanel';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/SignIn" element={<SignIn />} />
      <Route path="/AccessPending" element={<AccessPending />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/Dashboard" replace />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Rocks" element={<Rocks />} />
        <Route path="/RockDetail" element={<RockDetail />} />
        <Route path="/MyTasks" element={<MyTasks />} />
        <Route path="/Announcements" element={<Announcements />} />
        <Route path="/Calendar" element={<CalendarPage />} />
        <Route path="/ArchivePage" element={<ArchivePage />} />
        <Route path="/StrategicOrganizer" element={<StrategicOrganizer />} />
        <Route path="/AdminPanel" element={<ProtectedRoute requireAdmin={true}><AdminPanel /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster />
        <SonnerToaster richColors position="top-right" />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App