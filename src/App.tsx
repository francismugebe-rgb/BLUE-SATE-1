import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Heart, Sparkles, ArrowRight, Shield, Zap, Users, LogOut, MessageCircle, User, Play, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

// Lazy load pages
const LoginPage = lazy(() => import('./pages/Auth/LoginPage'));
const SignUpPage = lazy(() => import('./pages/Auth/SignUpPage'));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const ProfilePage = lazy(() => import('./pages/User/ProfilePage'));
const FeedPage = lazy(() => import('./pages/Social/FeedPage'));
const ReelsPage = lazy(() => import('./pages/Social/ReelsPage'));
const DatingPage = lazy(() => import('./pages/Dating/DatingPage'));
const ChatPage = lazy(() => import('./pages/Social/ChatPage'));

import { AuthProvider, useAuth } from './contexts/AuthContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode; role?: 'admin' | 'user' }> = ({ children, role }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return <>{children}</>;
};

const ProfileCompletionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" />;
  
  // If user hasn't filled in Name and Surname, redirect to profile
  const isProfileIncomplete = !user.firstName || !user.lastName;
  
  if (isProfileIncomplete && location.pathname !== '/profile') {
    return <Navigate to="/profile" state={{ from: location, incomplete: true }} />;
  }

  return <>{children}</>;
};

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const navItems = [
    { path: '/feed', icon: Users, label: 'Home' },
    { path: '/reels', icon: Zap, label: 'Reels' },
    { path: '/dating', icon: Heart, label: 'Dating' },
    { path: '/chat', icon: MessageCircle, label: 'Chat' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <>
      {/* Desktop Top Nav */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 hidden md:block">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/feed" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-pink-500 rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="text-xl font-black tracking-tight">Heart Connect</span>
          </Link>
          
          <div className="flex items-center gap-2">
            {navItems.map((item) => (
              <Link 
                key={item.path}
                to={item.path}
                className={`px-6 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                  location.pathname === item.path 
                    ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <Link to="/profile" className="flex items-center gap-2 hover:bg-slate-50 px-3 py-1.5 rounded-xl transition-all group">
                <div className="w-8 h-8 rounded-full bg-pink-50 overflow-hidden border border-pink-100">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-pink-500 text-xs font-black">
                      {user.displayName?.[0] || user.email?.[0]}
                    </div>
                  )}
                </div>
                <span className="text-sm font-black text-slate-700 group-hover:text-pink-500 transition-colors">
                  {user.displayName || user.email.split('@')[0]}
                </span>
              </Link>
            )}
            {user.role === 'admin' && (
              <Link to="/admin" className="text-sm font-bold text-pink-500 hover:text-pink-600 transition-colors">
                Admin
              </Link>
            )}
            <button 
              onClick={logout}
              className="p-2 text-slate-400 hover:text-pink-500 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-t border-slate-100 md:hidden pb-safe">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <Link 
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 transition-all ${
                location.pathname === item.path ? 'text-pink-500' : 'text-slate-400'
              }`}
            >
              <item.icon className={`w-6 h-6 ${location.pathname === item.path ? 'fill-pink-500/10' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
};

const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate('/feed', { replace: true });
    }
  }, [user, navigate]);

  const featuredProfiles = [
    { name: 'Zanele', age: 25, city: 'Harare, Zimbabwe', photo: 'https://picsum.photos/seed/zanele/400/600' },
    { name: 'Nyasha', age: 30, city: 'Bulawayo, Zimbabwe', photo: 'https://picsum.photos/seed/nyasha/400/600' },
    { name: 'Tendai', age: 35, city: 'Mutare, Zimbabwe', photo: 'https://picsum.photos/seed/tendai/400/600' },
    { name: 'Chipo', age: 40, city: 'Gweru, Zimbabwe', photo: 'https://picsum.photos/seed/chipo/400/600' },
    { name: 'Lerato', age: 45, city: 'Johannesburg, South Africa', photo: 'https://picsum.photos/seed/lerato/400/600' },
  ];

  const handleConnect = () => {
    navigate('/signup');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative h-[90vh] flex items-center justify-center overflow-hidden bg-slate-900">
        <div className="absolute inset-0 z-0 opacity-40">
          <img 
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80" 
            className="w-full h-full object-cover"
            alt="Background"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-white z-10" />
        
        <div className="relative z-20 text-center px-6 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white mb-8"
          >
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span className="text-sm font-bold tracking-wide uppercase">The All-In-One Social Network</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-black text-white mb-8 tracking-tight"
          >
            Connect. Match. <span className="text-pink-500">Chat.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-white/80 font-medium mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Find beautiful connections across Africa. Share your life, find your match, and chat in real-time.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/signup" className="w-full sm:w-auto px-12 py-5 bg-pink-500 text-white rounded-[2rem] font-black text-xl hover:bg-pink-600 transition-all shadow-2xl shadow-pink-500/40 flex items-center justify-center gap-3">
              Join Heart Connect
              <ArrowRight className="w-6 h-6" />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Featured Profiles Section */}
      <div className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Meet Single Ladies</h2>
          <p className="text-slate-500 text-lg font-medium">Discover beautiful connections in Zimbabwe and South Africa</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {featuredProfiles.map((profile, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="group relative h-[400px] rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-100"
            >
              <img 
                src={profile.photo} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                alt={profile.name}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-2xl font-black">{profile.name}, {profile.age}</h3>
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                </div>
                <div className="flex items-center gap-1 text-white/70 text-sm font-bold mb-4">
                  <MapPin className="w-4 h-4" />
                  {profile.city}
                </div>
                <button 
                  onClick={handleConnect}
                  className="w-full py-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl font-bold hover:bg-white hover:text-pink-500 transition-all"
                >
                  Connect Now
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-slate-50 py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12">
          {[
            { label: 'Active Users', value: '500K+' },
            { label: 'Daily Matches', value: '12K+' },
            { label: 'Success Stories', value: '5K+' },
            { label: 'Countries', value: '45+' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl md:text-5xl font-black text-pink-500 mb-2">{stat.value}</div>
              <div className="text-slate-500 font-bold uppercase tracking-widest text-xs">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { icon: <Heart className="w-8 h-8" />, title: 'Social Wall', desc: 'Share your thoughts, photos, and life updates with your circle. Connect like never before.' },
            { icon: <Sparkles className="w-8 h-8" />, title: 'TikTok Reels', desc: 'Express yourself through short, engaging vertical videos. Discover trending content daily.' },
            { icon: <User className="w-8 h-8" />, title: 'Dating Match', desc: 'Find your perfect match with our intelligent swipe system. Verified profiles only.' },
            { icon: <MessageCircle className="w-8 h-8" />, title: 'Real-time Chat', desc: 'Instant messaging with your matches and friends. Secure, fast, and reliable.' },
          ].map((f, i) => (
            <div key={i} className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
              <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-500 mb-6 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3">{f.title}</h3>
              <p className="text-slate-500 font-medium leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Success Stories */}
      <section id="stories" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-5xl font-black mb-6">Real Love Stories</h2>
              <p className="text-xl text-slate-500 font-medium">Thousands of people have found their forever partner on Heart Connect. Here are just a few of their stories.</p>
            </div>
            <button className="text-pink-500 font-black text-lg hover:underline flex items-center gap-2">
              Read all stories <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            {[
              {
                names: "James & Elena",
                story: "We matched on our first day using Heart Connect. The AI suggested we both loved obscure 80s synth-pop, and we've been inseparable ever since.",
                image: "https://picsum.photos/seed/couple1/800/600",
                time: "Married after 1 year"
              },
              {
                names: "Marcus & Sophie",
                story: "I was skeptical about online dating, but Heart Connect's verification made me feel safe. I met Marcus, and he's everything I was looking for.",
                image: "https://picsum.photos/seed/couple2/800/600",
                time: "Engaged"
              }
            ].map((story, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="bg-white rounded-[3rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500"
              >
                <div className="aspect-[16/9] overflow-hidden">
                  <img src={story.image} alt={story.names} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="p-10">
                  <div className="flex items-center gap-2 text-pink-500 mb-4">
                    {[1, 2, 3, 4, 5].map(s => <Sparkles key={s} className="w-4 h-4 fill-pink-500" />)}
                  </div>
                  <h3 className="text-2xl font-black mb-4">{story.names}</h3>
                  <p className="text-slate-600 leading-relaxed font-medium mb-6 italic">"{story.story}"</p>
                  <div className="text-sm font-black text-slate-400 uppercase tracking-widest">{story.time}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-pink-500 rounded-[4rem] p-12 md:p-24 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-10 left-10 w-40 h-40 border-8 border-white rounded-full" />
              <div className="absolute bottom-10 right-10 w-60 h-60 border-8 border-white rounded-full" />
            </div>
            
            <h2 className="text-5xl md:text-7xl font-black mb-8 relative z-10">Ready to find your match?</h2>
            <p className="text-xl md:text-2xl font-medium mb-12 opacity-90 relative z-10 max-w-2xl mx-auto">
              Join thousands of happy couples who found love on Heart Connect. Your journey starts with a single click.
            </p>
            <Link 
              to="/signup"
              className="bg-white text-pink-500 px-12 py-6 rounded-[2rem] font-black text-2xl hover:bg-slate-50 transition-all shadow-2xl active:scale-95 relative z-10 inline-block"
            >
              Start Your Journey Now
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-lg font-black tracking-tight">Heart Connect</span>
          </div>
          <div className="flex gap-8 text-sm font-bold text-slate-500">
            <a href="#" className="hover:text-pink-500 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-pink-500 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-pink-500 transition-colors">Cookie Policy</a>
          </div>
          <div className="text-sm font-bold text-slate-400">
            © 2026 Heart Connect. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-black mb-4">Something went wrong</h2>
            <p className="text-slate-500 mb-8 font-medium">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all"
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <pre className="mt-6 p-4 bg-slate-50 rounded-xl text-left text-xs overflow-auto max-h-40 text-slate-400 font-mono">
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    </ErrorBoundary>
  );
};

const AuthConsumer: React.FC = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <Navigation />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route 
            path="/feed" 
            element={
              <ProtectedRoute>
                <ProfileCompletionGuard>
                  <FeedPage />
                </ProfileCompletionGuard>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reels" 
            element={
              <ProtectedRoute>
                <ProfileCompletionGuard>
                  <ReelsPage />
                </ProfileCompletionGuard>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dating" 
            element={
              <ProtectedRoute>
                <ProfileCompletionGuard>
                  <DatingPage />
                </ProfileCompletionGuard>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/chat" 
            element={
              <ProtectedRoute>
                <ProfileCompletionGuard>
                  <ChatPage />
                </ProfileCompletionGuard>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
