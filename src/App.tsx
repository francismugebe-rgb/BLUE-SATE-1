import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Heart, Sparkles, ArrowRight, Shield, Zap, Users, LogOut, MessageCircle, User, Play } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate('/feed', { replace: true });
    }
  }, [user, navigate]);

  const handleJoinClick = () => {
    if (user) {
      navigate('/profile');
    } else {
      navigate('/signup');
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-pink-500 rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="text-xl font-black tracking-tight">Heart Connect</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
            <a href="#features" className="hover:text-pink-500 transition-colors">Features</a>
            <a href="#about" className="hover:text-pink-500 transition-colors">About</a>
            <a href="#stories" className="hover:text-pink-500 transition-colors">Success Stories</a>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <Link to="/profile" className="text-sm font-bold text-slate-700 hover:text-pink-500 transition-colors">
                  My Profile
                </Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className="text-sm font-bold text-pink-500 hover:text-pink-600 transition-colors">
                    Admin Panel
                  </Link>
                )}
                <button 
                  onClick={logout}
                  className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-pink-500 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-sm font-bold text-slate-700 hover:text-pink-500 transition-colors">
                  Sign In
                </Link>
                <button 
                  onClick={handleJoinClick}
                  className="bg-pink-500 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-pink-600 transition-all shadow-lg shadow-pink-500/20 active:scale-95"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 px-6 overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-pink-50 rounded-full blur-3xl opacity-50 -z-10" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-purple-50 rounded-full blur-3xl opacity-50 -z-10" />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-pink-50 text-pink-600 rounded-full text-sm font-black mb-8 border border-pink-100">
              <Sparkles className="w-4 h-4" />
              THE ALL-IN-ONE SOCIAL NETWORK
            </div>
            <h1 className="text-6xl md:text-8xl font-black leading-[1] mb-8 tracking-tight">
              Connect. <span className="text-pink-500 relative">
                Match.
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-pink-200 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                </svg>
              </span> Chat.
            </h1>
            <p className="text-xl text-slate-500 leading-relaxed mb-12 max-w-xl font-medium">
              The first platform that combines the best of Facebook, Tinder, WhatsApp, and TikTok. Share your life, find your match, and chat in real-time.
            </p>
            <div className="flex flex-col sm:flex-row gap-6">
              <button 
                onClick={handleJoinClick}
                className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20 active:scale-95 group"
              >
                Join Heart Connect
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="flex items-center gap-4 px-6">
                <div className="flex -space-x-3">
                  {[1, 2, 3].map(i => (
                    <img 
                      key={i}
                      src={`https://picsum.photos/seed/user${i}/100/100`} 
                      className="w-12 h-12 rounded-full border-4 border-white shadow-sm"
                      alt="User"
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>
                <div className="text-sm font-bold text-slate-600">
                  <span className="text-slate-900">2,000+</span> joined today
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-[4/5] rounded-[4rem] overflow-hidden shadow-2xl shadow-pink-500/20 border-[12px] border-white">
              <img 
                src="https://picsum.photos/seed/dating-hero/1200/1500" 
                alt="Happy Couple" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              
              {/* Floating Interaction Cards */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-12 -left-8 bg-white p-5 rounded-3xl shadow-2xl border border-slate-100 flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center">
                  <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">New Match!</p>
                  <p className="font-bold text-slate-900">Sarah liked you back</p>
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-12 -right-8 bg-white p-5 rounded-3xl shadow-2xl border border-slate-100 flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-blue-500 fill-blue-500" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Smart Match</p>
                  <p className="font-bold text-slate-900">98% Compatibility</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          {[
            { label: 'Active Users', value: '500K+' },
            { label: 'Daily Matches', value: '12K+' },
            { label: 'Success Stories', value: '5K+' },
            { label: 'Countries', value: '45+' },
          ].map((stat, i) => (
            <div key={i}>
              <div className="text-4xl font-black text-slate-900 mb-2">{stat.value}</div>
              <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32 bg-slate-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-5xl font-black mb-6">Designed for Real Connections</h2>
            <p className="text-xl text-slate-500 font-medium leading-relaxed">We've built the most advanced dating ecosystem to help you find your person faster and safer.</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-10">
            {[
              { 
                icon: Users, 
                title: "Social Wall", 
                desc: "Share your thoughts, photos, and life updates with your circle. Connect like never before.",
                color: "bg-blue-50 text-blue-500"
              },
              { 
                icon: Zap, 
                title: "TikTok Reels", 
                desc: "Express yourself through short, engaging vertical videos. Discover trending content daily.",
                color: "bg-purple-50 text-purple-500"
              },
              { 
                icon: Heart, 
                title: "Dating Match", 
                desc: "Find your perfect match with our intelligent swipe system. Verified profiles only.",
                color: "bg-pink-50 text-pink-500"
              },
              { 
                icon: MessageCircle, 
                title: "Real-time Chat", 
                desc: "Instant messaging with your matches and friends. Secure, fast, and reliable.",
                color: "bg-green-50 text-green-500"
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all group hover:-translate-y-2 duration-500">
                <div className={`w-20 h-20 ${feature.color} rounded-[2rem] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500`}>
                  <feature.icon className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black mb-4">{feature.title}</h3>
                <p className="text-lg text-slate-500 leading-relaxed font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
            <button 
              onClick={handleJoinClick}
              className="bg-white text-pink-500 px-12 py-6 rounded-[2rem] font-black text-2xl hover:bg-slate-50 transition-all shadow-2xl active:scale-95 relative z-10"
            >
              Start Your Journey Now
            </button>
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
                <FeedPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reels" 
            element={
              <ProtectedRoute>
                <ReelsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dating" 
            element={
              <ProtectedRoute>
                <DatingPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/chat" 
            element={
              <ProtectedRoute>
                <ChatPage />
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
