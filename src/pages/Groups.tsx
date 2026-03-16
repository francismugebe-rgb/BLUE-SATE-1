import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Group } from '../types';
import { Link } from 'react-router-dom';
import { Users, Plus, Search, MoreHorizontal, Lock, Globe, Shield, MessageSquare } from 'lucide-react';
import { cn, formatTime } from '../lib/utils';

const Groups: React.FC = () => {
  const { profile, user: authUser } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroup, setNewGroup] = useState({ title: '', description: '', privacy: 'public' });

  useEffect(() => {
    const q = query(collection(db, 'groups'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'groups');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !newGroup.title.trim()) return;

    const groupData = {
      ownerId: authUser.uid,
      title: newGroup.title,
      description: newGroup.description,
      privacy: newGroup.privacy,
      members: [authUser.uid],
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'groups'), groupData);
      setShowCreateModal(false);
      setNewGroup({ title: '', description: '', privacy: 'public' });
      alert("Group created successfully!");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'groups');
    }
  };

  const handleJoinGroup = async (groupId: string, members: string[]) => {
    if (!authUser) return;
    const isMember = members.includes(authUser.uid);
    const newMembers = isMember 
      ? members.filter(id => id !== authUser.uid)
      : [...members, authUser.uid];

    try {
      await updateDoc(doc(db, 'groups', groupId), { members: newMembers });
      
      if (!isMember) {
        // Notify owner
        const group = groups.find(g => g.id === groupId);
        if (group && group.ownerId !== authUser.uid) {
          await addDoc(collection(db, 'notifications'), {
            receiverId: group.ownerId,
            senderId: authUser.uid,
            senderName: profile?.name || 'Someone',
            type: 'group_join',
            targetId: groupId,
            targetName: group.title,
            read: false,
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'groups');
    }
  };

  if (loading) return <div className="p-8">Loading groups...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Groups</h2>
          <p className="text-slate-500 font-medium">Join discussions and meet people with similar interests</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-[#ff3366] text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-[#ff3366]/20 hover:scale-105 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Create Group</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search groups by name or interest..." 
            className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3366]/20 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {groups.map(group => (
          <div key={group.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 flex gap-6 hover:shadow-md transition-all group">
            <Link to={`/groups/${group.id}`} className="w-24 h-24 bg-slate-100 rounded-3xl overflow-hidden flex-shrink-0 block">
              <img src={group.coverPhoto || `https://picsum.photos/seed/${group.id}/200/200`} className="w-full h-full object-cover" />
            </Link>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <Link to={`/groups/${group.id}`} className="font-black text-slate-900 text-lg hover:text-[#ff3366] transition-colors">{group.title}</Link>
                  <div className="flex items-center gap-1 text-slate-400">
                    {group.privacy === 'public' ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    <span className="text-[10px] font-black uppercase tracking-widest">{group.privacy}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2 mb-4">{group.description || 'No description provided.'}</p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-slate-400">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-bold">{group.members.length}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-xs font-bold">12 posts</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleJoinGroup(group.id, group.members)}
                  className={cn(
                    "px-6 py-2 rounded-xl font-black text-sm transition-all",
                    group.members.includes(authUser?.uid || '') 
                      ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
                      : "bg-[#ff3366] text-white hover:bg-[#ff1a53]"
                  )}
                >
                  {group.members.includes(authUser?.uid || '') ? 'Joined' : 'Join Group'}
                </button>
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
              <h3 className="text-2xl font-black text-slate-900">Create New Group</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <Plus className="w-6 h-6 rotate-45 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleCreateGroup} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Group Name</label>
                <input 
                  type="text" 
                  value={newGroup.title}
                  onChange={(e) => setNewGroup({ ...newGroup, title: e.target.value })}
                  placeholder="e.g. Tech Enthusiasts" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/20 transition-all font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                <textarea 
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="What is this group about?" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 h-32 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/20 transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Privacy</label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setNewGroup({ ...newGroup, privacy: 'public' })}
                    className={cn(
                      "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                      newGroup.privacy === 'public' ? "border-[#ff3366] bg-[#ff3366]/5" : "border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <Globe className={cn("w-6 h-6", newGroup.privacy === 'public' ? "text-[#ff3366]" : "text-slate-400")} />
                    <span className="font-bold text-sm">Public</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewGroup({ ...newGroup, privacy: 'private' })}
                    className={cn(
                      "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                      newGroup.privacy === 'private' ? "border-[#ff3366] bg-[#ff3366]/5" : "border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <Lock className={cn("w-6 h-6", newGroup.privacy === 'private' ? "text-[#ff3366]" : "text-slate-400")} />
                    <span className="font-bold text-sm">Private</span>
                  </button>
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-[#ff3366] text-white py-4 rounded-2xl font-black shadow-lg shadow-[#ff3366]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Create Group
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
