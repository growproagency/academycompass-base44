import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from './components/lib/SupabaseAuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Page imports
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Rocks from './pages/Rocks';
import RockDetail from './pages/RockDetail';
import MyTasks from './pages/MyTasks';
import Announcements from './pages/Announcements';
import CalendarPage from './pages/CalendarPage';
import ArchivePage from './pages/ArchivePage';
import StrategicOrganizer from './pages/StrategicOrganizer';
import AdminPanel from './pages/AdminPanel';
import LoginPage from './pages/LoginPage';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/Dashboard" replace />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Rocks" element={<Rocks />} />
        <Route path="/RockDetail" element={<RockDetail />} />
        <Route path="/MyTasks" element={<MyTasks />} />
        <Route path="/Announcements" element={<Announcements />} />
        <Route path="/Calendar" element={<CalendarPage />} />
        <Route path="/ArchivePage" element={<ArchivePage />} />
        <Route path="/StrategicOrganizer" element={<StrategicOrganizer />} />
        <Route path="/AdminPanel" element={<AdminPanel />} />
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
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App