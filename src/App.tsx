import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { ThemeProvider } from './context/ThemeContext';
import ChatOverlay from './components/ChatOverlay';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Discover from './pages/Discover';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import Matches from './pages/Matches';
import Messages from './pages/Messages';
import Wallet from './pages/Wallet';
import Pages from './pages/Pages';
import PageDetails from './pages/PageDetails';
import Groups from './pages/Groups';
import GroupDetails from './pages/GroupDetails';
import AdminDashboard from './pages/AdminDashboard';
import Settings from './pages/Settings';
import Reels from './pages/Reels';
import Market from './pages/Market';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!isAdmin) return <Navigate to="/" />;
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  console.log('AppContent is rendering...');
  const errorDisplay = document.getElementById('error-display');
  if (errorDisplay) errorDisplay.innerText = 'AppContent is rendering...';
  
  try {
    const { profile, loading } = useAuth();
    console.log('Auth profile:', profile, 'loading:', loading);
    if (errorDisplay) errorDisplay.innerText = `AppContent rendering (loading: ${loading})`;
    
    if (loading) {
      return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }
    return (
      <ChatProvider currentUserId={profile?.uid}>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/discover" element={<Discover />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:id" element={<Profile />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/pages" element={<Pages />} />
              <Route path="/pages/:id" element={<PageDetails />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/groups/:id" element={<GroupDetails />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/chat/:id" element={<Chat />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/reels" element={<Reels />} />
              <Route path="/market" element={<Market />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            <Route path="/admin" element={<AdminRoute><Layout admin /></AdminRoute>}>
              <Route index element={<AdminDashboard />} />
            </Route>
          </Routes>
          <ChatOverlay />
        </Router>
      </ChatProvider>
    );
  } catch (error) {
    console.error('AppContent render error:', error);
    if (errorDisplay) {
      errorDisplay.innerText = 'AppContent Error: ' + (error instanceof Error ? error.message : String(error));
    }
    return <div>Error loading application. Check console.</div>;
  }
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
