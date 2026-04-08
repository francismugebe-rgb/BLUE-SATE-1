import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, updateDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Users, Shield, Sparkles, Settings, Save, Search, CheckCircle, XCircle } from 'lucide-react';

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  isVerified: boolean;
  proTier: string;
  points: number;
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'settings'>('users');
  const [settings, setSettings] = useState({
    pointValuePost: 10,
    pointValueLike: 2,
    pointValueComment: 5,
    priceBronze: 9.99,
    priceGold: 19.99,
    pricePlatinum: 29.99
  });

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as UserProfile[];
      setUsers(usersData);
    });

    const fetchSettings = async () => {
      const settingsDoc = await getDocs(query(collection(db, 'settings')));
      if (!settingsDoc.empty) {
        setSettings(settingsDoc.docs[0].data() as any);
      }
    };
    fetchSettings();

    return () => unsubscribe();
  }, []);

  const handleUpdateUser = async (uid: string, data: Partial<UserProfile>) => {
    try {
      await updateDoc(doc(db, 'users', uid), data);
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'global'), settings);
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-black text-slate-900">Admin Dashboard</h1>
          <div className="flex gap-2 bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Users className="w-4 h-4" />
              Users
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        {activeTab === 'users' ? (
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 font-medium"
              />
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">User</th>
                    <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Verification</th>
                    <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Pro Tier</th>
                    <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Points</th>
                    <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="font-black text-slate-900">{u.displayName}</div>
                        <div className="text-sm text-slate-500 font-medium">{u.email}</div>
                      </td>
                      <td className="px-8 py-6">
                        <button 
                          onClick={() => handleUpdateUser(u.uid, { isVerified: !u.isVerified })}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${u.isVerified ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}
                        >
                          {u.isVerified ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          {u.isVerified ? 'Verified' : 'Unverified'}
                        </button>
                      </td>
                      <td className="px-8 py-6">
                        <select 
                          value={u.proTier || 'none'}
                          onChange={(e) => handleUpdateUser(u.uid, { proTier: e.target.value })}
                          className="bg-slate-100 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none"
                        >
                          <option value="none">None</option>
                          <option value="bronze">Bronze</option>
                          <option value="gold">Gold</option>
                          <option value="platinum">Platinum</option>
                        </select>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 font-black text-slate-900">
                          <Sparkles className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          {u.points || 0}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <button className="text-pink-500 font-bold text-sm hover:underline">Edit Profile</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-500" />
                Point Values
              </h2>
              <div className="space-y-6">
                {[
                  { label: 'Points per Post', key: 'pointValuePost' },
                  { label: 'Points per Like', key: 'pointValueLike' },
                  { label: 'Points per Comment', key: 'pointValueComment' },
                ].map((item) => (
                  <div key={item.key} className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">{item.label}</label>
                    <input 
                      type="number"
                      value={(settings as any)[item.key]}
                      onChange={(e) => setSettings({...settings, [item.key]: Number(e.target.value)})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 font-medium"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <Shield className="w-6 h-6 text-pink-500" />
                Pro Tier Pricing ($)
              </h2>
              <div className="space-y-6">
                {[
                  { label: 'Bronze Price', key: 'priceBronze' },
                  { label: 'Gold Price', key: 'priceGold' },
                  { label: 'Platinum Price', key: 'pricePlatinum' },
                ].map((item) => (
                  <div key={item.key} className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">{item.label}</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={(settings as any)[item.key]}
                      onChange={(e) => setSettings({...settings, [item.key]: Number(e.target.value)})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 font-medium"
                    />
                  </div>
                ))}
              </div>
              <button 
                onClick={handleSaveSettings}
                className="w-full mt-8 bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20"
              >
                <Save className="w-5 h-5" />
                Save All Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
