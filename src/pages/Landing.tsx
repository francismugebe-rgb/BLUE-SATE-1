import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Shield, Zap, MessageCircle, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Landing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate('/feed');
    }
  }, [user, navigate]);

  if (user) {
    return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>;
  }

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#ff3366] rounded-lg flex items-center justify-center">
            <Heart className="text-white w-5 h-5 fill-current" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">HeartConnect</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-slate-600 font-medium hover:text-[#ff3366] transition-colors">Login</Link>
          <Link to="/register" className="bg-[#ff3366] text-white px-6 py-2 rounded-full font-semibold hover:bg-[#e62e5c] transition-all shadow-lg shadow-[#ff3366]/20">
            Join Now
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-32 grid lg:grid-template-columns-[1fr_1fr] gap-12 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-6xl md:text-7xl font-extrabold text-slate-900 leading-[1.1] mb-6">
            Find your <span className="text-[#ff3366]">perfect</span> match today.
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-lg leading-relaxed">
            The modern way to connect, date, and build meaningful relationships. Join thousands of people finding love and friendship on HeartConnect.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/register" className="bg-[#ff3366] text-white px-10 py-4 rounded-full text-lg font-bold hover:scale-105 transition-all shadow-xl shadow-[#ff3366]/30 text-center">
              Create Account
            </Link>
            <Link to="/login" className="bg-slate-100 text-slate-900 px-10 py-4 rounded-full text-lg font-bold hover:bg-slate-200 transition-all text-center">
              Sign In
            </Link>
          </div>
          
          <div className="mt-12 flex items-center gap-4">
            <div className="flex -space-x-3">
              {[1,2,3,4].map(i => (
                <img key={i} src={`https://picsum.photos/seed/user${i}/100/100`} className="w-10 h-10 rounded-full border-2 border-white object-cover" referrerPolicy="no-referrer" />
              ))}
            </div>
            <p className="text-sm text-slate-500 font-medium">
              <span className="text-slate-900 font-bold">10k+</span> users joined this week
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative hidden lg:block"
        >
          <div className="relative z-10 bg-white p-4 rounded-[2rem] shadow-2xl border border-slate-100 rotate-3 max-w-sm mx-auto">
            <img src="https://picsum.photos/seed/dating1/600/800" className="rounded-[1.5rem] w-full aspect-[3/4] object-cover" referrerPolicy="no-referrer" />
            <div className="absolute bottom-10 left-10 right-10 bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/50">
              <h3 className="text-2xl font-bold text-slate-900">Sarah, 24</h3>
              <p className="text-slate-600 font-medium italic">"Looking for someone to explore the city with!"</p>
            </div>
          </div>
          <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#ff3366]/10 rounded-full blur-3xl -z-10"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#6c5ce7]/10 rounded-full blur-3xl -z-10"></div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Why HeartConnect?</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">We combine the best of social networking and dating to help you find real connections.</p>
          </div>
          
          <div className="grid md:grid-template-columns-[1fr_1fr_1fr] gap-8">
            {[
              { icon: Zap, title: "Smart Matching", desc: "Our algorithm finds people you'll actually click with based on interests and lifestyle." },
              { icon: MessageCircle, title: "Real-time Chat", desc: "Connect instantly with matches through our secure and fast messaging system." },
              { icon: Shield, title: "Safe & Secure", desc: "Advanced AI moderation and reporting tools to keep your experience safe." }
            ].map((f, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#ff3366]/10 transition-colors">
                  <f.icon className="w-7 h-7 text-[#ff3366]" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{f.title}</h3>
                <p className="text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
