import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, limit, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Post } from '../types';
import { Users, FileText, AlertTriangle, BarChart3, Trash2, Ban, CheckCircle, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(50)));
        const postsSnap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50)));
        
        setUsers(usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
        setPosts(postsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
      } catch (err) {
        console.error("Admin fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handlePromote = async (userId: string) => {
    if (!window.confirm("Are you sure you want to promote this user to admin?")) return;
    try {
      await updateDoc(doc(db, 'users', userId), { role: 'admin' });
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, role: 'admin' } : u));
      alert("User promoted to admin successfully!");
    } catch (err) {
      console.error("Promotion error:", err);
      alert("Failed to promote user.");
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    await deleteDoc(doc(db, 'posts', postId));
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  if (loading) return <div className="p-8">Loading dashboard...</div>;

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Posts', value: posts.length, icon: FileText, color: 'bg-purple-500' },
    { label: 'Reports', value: 0, icon: AlertTriangle, color: 'bg-orange-500' },
    { label: 'Active Now', value: 12, icon: BarChart3, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-slate-900">Admin Dashboard</h2>
        <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm">
          <CheckCircle className="w-4 h-4" />
          <span>System Online</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg", stat.color)}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* User Management */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-900">User Management</h3>
            <button className="text-[#ff3366] font-bold text-sm">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-xs font-bold uppercase tracking-widest">
                  <th className="px-8 py-4">User</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map(user => (
                  <tr key={user.uid} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <img src={user.photos?.[0] || `https://picsum.photos/seed/${user.uid}/100/100`} className="w-10 h-10 rounded-xl object-cover" referrerPolicy="no-referrer" />
                        <div>
                          <p className="font-bold text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider">Active</span>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex gap-2">
                        {user.role !== 'admin' && (
                          <button 
                            onClick={() => handlePromote(user.uid)}
                            className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
                            title="Promote to Admin"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button className="p-2 text-slate-400 hover:text-orange-500 transition-colors"><Ban className="w-4 h-4" /></button>
                        <button className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Posts */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-900">Recent Content</h3>
            <button className="text-[#ff3366] font-bold text-sm">View All</button>
          </div>
          <div className="p-8 space-y-6">
            {posts.map(post => (
              <div key={post.id} className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all group">
                <img src={post.authorPhoto || `https://picsum.photos/seed/${post.userId}/100/100`} className="w-10 h-10 rounded-xl object-cover" referrerPolicy="no-referrer" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed">{post.content}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">by {post.authorName}</p>
                </div>
                <button 
                  onClick={() => handleDeletePost(post.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
