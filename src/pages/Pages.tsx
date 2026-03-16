import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc, getDocs, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Page } from '../types';
import { Flag, Plus, Search, MoreHorizontal, BadgeCheck, Users, Globe, Lock, Shield, MessageSquare, Heart } from 'lucide-react';
import { cn, formatTime } from '../lib/utils';
import { Link } from 'react-router-dom';

const Pages: React.FC = () => {
  const { profile, user: authUser } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPage, setNewPage] = useState({ title: '', description: '', category: 'Community' });

  useEffect(() => {
    const q = query(collection(db, 'pages'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Page)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !newPage.title.trim()) return;

    const pageData = {
      ownerId: authUser.uid,
      title: newPage.title,
      description: newPage.description,
      category: newPage.category,
      followers: [],
      likes: [],
      isVerified: false,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'pages'), pageData);
      setShowCreateModal(false);
      setNewPage({ title: '', description: '', category: 'Community' });
      alert("Page created successfully!");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'pages');
    }
  };

  const handleFollowPage = async (pageId: string, followers: string[]) => {
    if (!authUser) return;
    const isFollowing = followers.includes(authUser.uid);
    const newFollowers = isFollowing 
      ? followers.filter(id => id !== authUser.uid)
      : [...followers, authUser.uid];

    try {
      await updateDoc(doc(db, 'pages', pageId), { followers: newFollowers });
      
      if (!isFollowing) {
        // Notify owner
        const page = pages.find(p => p.id === pageId);
        if (page && page.ownerId !== authUser.uid) {
          await addDoc(collection(db, 'notifications'), {
            receiverId: page.ownerId,
            senderId: authUser.uid,
            senderName: profile?.name || 'Someone',
            type: 'page_follow',
            targetId: pageId,
            targetName: page.title,
            read: false,
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'pages');
    }
  };

  const handleLikePage = async (pageId: string, likes: string[]) => {
    if (!authUser) return;
    const isLiked = likes?.includes(authUser.uid);
    const newLikes = isLiked 
      ? likes.filter(id => id !== authUser.uid)
      : [...(likes || []), authUser.uid];

    try {
      await updateDoc(doc(db, 'pages', pageId), { likes: newLikes });
      
      if (!isLiked) {
        const page = pages.find(p => p.id === pageId);
        if (page && page.ownerId !== authUser.uid) {
          await addDoc(collection(db, 'notifications'), {
            receiverId: page.ownerId,
            senderId: authUser.uid,
            senderName: profile?.name || 'Someone',
            type: 'like',
            targetId: pageId,
            targetName: page.title,
            read: false,
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'pages');
    }
  };

  if (loading) return <div className="p-8">Loading pages...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Pages</h2>
          <p className="text-slate-500 font-medium">Discover and connect with communities</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-[#ff3366] text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-[#ff3366]/20 hover:scale-105 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Create Page</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search pages by name or category..." 
            className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3366]/20 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Pages Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {pages.map(page => (
          <div key={page.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition-all">
            <Link to={`/pages/${page.id}`} className="block h-32 bg-gradient-to-br from-slate-100 to-slate-200 relative">
              {page.coverUrl && <img src={page.coverUrl} className="w-full h-full object-cover" />}
              <div className="absolute -bottom-6 left-6">
                <div className="w-16 h-16 bg-white rounded-2xl p-1 shadow-md">
                  <img src={page.avatarUrl || `https://picsum.photos/seed/${page.id}/100/100`} className="w-full h-full rounded-xl object-cover" />
                </div>
              </div>
            </Link>
            <div className="p-6 pt-10">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1">
                  <Link to={`/pages/${page.id}`} className="font-black text-slate-900 truncate max-w-[150px] hover:text-[#ff3366] transition-colors">{page.title}</Link>
                  {page.isVerified && <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500" />}
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-4">{page.category}</p>
              <p className="text-sm text-slate-600 line-clamp-2 mb-6 min-h-[40px]">{page.description || 'No description provided.'}</p>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-bold">{page.followers.length} followers</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Heart className="w-4 h-4" />
                  <span className="text-xs font-bold">{page.likes?.length || 0} likes</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleLikePage(page.id, page.likes || [])}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      page.likes?.includes(authUser?.uid || '') 
                        ? "text-rose-500 bg-rose-50" 
                        : "text-slate-400 bg-slate-50 hover:text-rose-500"
                    )}
                  >
                    <Heart className={cn("w-5 h-5", page.likes?.includes(authUser?.uid || '') && "fill-current")} />
                  </button>
                  <button 
                    onClick={() => handleFollowPage(page.id, page.followers)}
                    className={cn(
                      "px-4 py-2 rounded-xl font-black text-sm transition-all",
                      page.followers.includes(authUser?.uid || '') 
                        ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
                        : "bg-[#ff3366] text-white hover:bg-[#ff1a53] shadow-md shadow-[#ff3366]/10"
                    )}
                  >
                    {page.followers.includes(authUser?.uid || '') ? 'Following' : 'Follow'}
                  </button>
                  <Link 
                    to={`/messages?pageId=${page.id}`}
                    className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
                    title="Message Page"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-900">Create New Page</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <Plus className="w-6 h-6 rotate-45 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleCreatePage} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Page Title</label>
                <input 
                  type="text" 
                  value={newPage.title}
                  onChange={(e) => setNewPage({ ...newPage, title: e.target.value })}
                  placeholder="e.g. Photography Lovers" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/20 transition-all font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                <textarea 
                  value={newPage.description}
                  onChange={(e) => setNewPage({ ...newPage, description: e.target.value })}
                  placeholder="What is this page about?" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 h-32 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/20 transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                <select 
                  value={newPage.category}
                  onChange={(e) => setNewPage({ ...newPage, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/20 transition-all font-bold appearance-none"
                >
                  <option>Community</option>
                  <option>Business</option>
                  <option>Entertainment</option>
                  <option>Education</option>
                  <option>Lifestyle</option>
                </select>
              </div>
              <button 
                type="submit"
                className="w-full bg-[#ff3366] text-white py-4 rounded-2xl font-black shadow-lg shadow-[#ff3366]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Create Page
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pages;
