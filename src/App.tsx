import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Heart, Sparkles, ArrowRight, Shield, Zap, Users, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import LoginPage from './pages/Auth/LoginPage';
import SignUpPage from './pages/Auth/SignUpPage';
import AdminDashboard from './pages/Admin/AdminDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode; role?: 'admin' | 'user' }> = ({ children, role }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return <>{children}</>;
};

const LandingPage: React.FC = () => {
  const { user, logout } = useAuth();
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
            <a href="#contact" className="hover:text-pink-500 transition-colors">Contact</a>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
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
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-bold text-slate-700 hover:text-pink-500 transition-colors">
                  Sign In
                </Link>
                <Link to="/signup" className="bg-pink-500 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-pink-600 transition-all shadow-lg shadow-pink-500/20 active:scale-95">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-600 rounded-full text-sm font-bold mb-6">
              <Sparkles className="w-4 h-4" />
              The Future of Connection
            </div>
            <h1 className="text-6xl md:text-7xl font-black leading-[1.1] mb-8">
              Find Your <span className="text-pink-500">Perfect</span> Match Today.
            </h1>
            <p className="text-xl text-slate-500 leading-relaxed mb-10 max-w-lg">
              Experience a dating platform designed for real connections. Smart matching, verified profiles, and meaningful conversations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/signup" className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95">
                Join Now
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="px-8 py-4 rounded-2xl font-bold text-lg border border-slate-200 hover:bg-slate-50 transition-all active:scale-95">
                Learn More
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-square rounded-[3rem] overflow-hidden shadow-2xl shadow-pink-500/10">
              <img 
                src="https://picsum.photos/seed/love/1200/1200" 
                alt="Happy Couple" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Floating Cards */}
            <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-xl border border-slate-100 max-w-[200px]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <span className="font-bold text-slate-900">Join Now</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Be part of our growing community</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-slate-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Why Choose Heart Connect?</h2>
            <p className="text-slate-500 font-medium">We prioritize your safety and experience above all else.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: "Verified Profiles", desc: "Every profile is manually verified to ensure you're meeting real people." },
              { icon: Zap, title: "Smart Matching", desc: "Our AI-driven algorithm finds people who truly share your interests." },
              { icon: Heart, title: "Deep Connections", desc: "Focus on meaningful conversations rather than just endless swiping." }
            ].map((feature, i) => (
              <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                <div className="w-14 h-14 bg-pink-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-pink-500 transition-colors">
                  <feature.icon className="w-7 h-7 text-pink-500 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
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
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
};

export default App;
