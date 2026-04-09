import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, where, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Layout, Users, Heart, MessageCircle, MoreHorizontal, Image as ImageIcon, Camera, ArrowLeft, Globe, Lock, ChevronRight, Sparkles, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import LoadingScreen from '../../components/LoadingScreen';
import { ActionService } from '../../services/ActionService';

const CATEGORIES = ['Business', 'Community', 'Entertainment', 'Education', 'Personal', 'Other'];

const PagesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pages, setPages] = useState<any[]>([]);
  const [myPages, setMyPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Business'
  });

  useEffect(() => {
    if (!user) return;

    // Fetch all pages
    const qAll = query(collection(db, 'pages'));
    const unsubAll = onSnapshot(qAll, (snapshot) => {
      setPages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // Fetch my pages
    const qMy = query(collection(db, 'pages'), where('ownerId', '==', user.uid));
    const unsubMy = onSnapshot(qMy, (snapshot) => {
      setMyPages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubAll();
      unsubMy();
    };
  }, [user]);

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const response = await ActionService.createPage(formData.name, formData.description, formData.category);
      if (response.status) {
        setIsCreateModalOpen(false);
        setFormData({ name: '', description: '', category: 'Business' });
        navigate(`/pages/${response.data.pageId}`);
      } else {
        alert(response.error || "Failed to create page");
      }
    } catch (error) {
      console.error("Error creating page:", error);
    }
  };

  const filteredPages = pages.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-slate-900 mb-2">Pages</h1>
            <p className="text-slate-500 font-medium">Discover and connect with businesses and communities.</p>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-pink-500 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-pink-500/20 hover:bg-pink-600 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Page
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-12">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search pages by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-16 pr-8 py-5 bg-white border-none rounded-[2rem] shadow-sm focus:ring-2 focus:ring-pink-500/20 font-medium text-lg"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - My Pages */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                <Layout className="w-5 h-5 text-pink-500" />
                My Pages
              </h3>
              <div className="space-y-4">
                {myPages.length > 0 ? (
                  myPages.map(page => (
                    <Link 
                      key={page.id} 
                      to={`/pages/${page.id}`}
                      className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-pink-50 overflow-hidden flex-shrink-0">
                        {page.photoURL ? (
                          <img src={page.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-pink-500 font-black text-xs">
                            {page.name[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate group-hover:text-pink-500 transition-colors">{page.name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{page.category}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-pink-500 transition-colors" />
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 font-medium italic">You haven't created any pages yet.</p>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-pink-500/20">
              <Sparkles className="w-10 h-10 mb-4 opacity-50" />
              <h3 className="text-xl font-black mb-2">Boost Your Reach</h3>
              <p className="text-white/80 text-sm font-medium mb-6 leading-relaxed">Create a page for your business and reach thousands of potential customers in our community.</p>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full py-3 bg-white text-pink-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Get Started
              </button>
            </div>
          </div>

          {/* Main Content - Discover Pages */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPages.map(page => (
                <motion.div
                  key={page.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100 group hover:shadow-xl transition-all duration-500"
                >
                  <div className="h-32 bg-slate-100 relative">
                    {page.coverURL && (
                      <img src={page.coverURL} alt="" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                  <div className="p-8 pt-0 relative">
                    <div className="w-20 h-20 rounded-3xl bg-white p-1 shadow-lg -mt-10 mb-4 relative z-10">
                      <div className="w-full h-full rounded-2xl bg-pink-50 overflow-hidden flex items-center justify-center">
                        {page.photoURL ? (
                          <img src={page.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl font-black text-pink-500">{page.name[0]}</span>
                        )}
                      </div>
                    </div>
                    <div className="mb-6">
                      <h3 className="text-xl font-black text-slate-900 mb-1 group-hover:text-pink-500 transition-colors">{page.name}</h3>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{page.category}</p>
                      <p className="text-slate-500 text-sm font-medium line-clamp-2 leading-relaxed">
                        {page.description || "No description provided."}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-sm font-black text-slate-900">{page.followers?.length || 0}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Followers</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-black text-slate-900">{page.likes?.length || 0}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Likes</p>
                        </div>
                      </div>
                      <Link 
                        to={`/pages/${page.id}`}
                        className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-pink-500 transition-all"
                      >
                        View Page
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            {filteredPages.length === 0 && (
              <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100">
                <Layout className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-bold">No pages found matching your search.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Page Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900">Create New Page</h2>
                <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleCreatePage} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 ml-1 uppercase tracking-widest">Page Name</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. My Awesome Business"
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-pink-500/20 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 ml-1 uppercase tracking-widest">Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-pink-500/20 font-medium"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 ml-1 uppercase tracking-widest">Description</label>
                  <textarea 
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Tell people what your page is about..."
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-pink-500/20 font-medium resize-none"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-5 bg-pink-500 text-white rounded-2xl font-black shadow-lg shadow-pink-500/20 hover:bg-pink-600 transition-all"
                >
                  Create Page
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PagesPage;
