import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, addDoc, query, where, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Group, Post } from '../types';
import { Users, Globe, Lock, Shield, ArrowLeft, Image as ImageIcon, Send, MoreHorizontal, Heart, MessageSquare } from 'lucide-react';
import { cn, formatTime } from '../lib/utils';

const GroupDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: authUser, profile } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');

  useEffect(() => {
    if (!id) return;

    const unsubGroup = onSnapshot(doc(db, 'groups', id), (doc) => {
      if (doc.exists()) {
        setGroup({ id: doc.id, ...doc.data() } as Group);
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `groups/${id}`);
      setLoading(false);
    });

    const postsQuery = query(
      collection(db, 'posts'),
      where('groupId', '==', id),
      orderBy('createdAt', 'desc')
    );

    const unsubPosts = onSnapshot(postsQuery, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    return () => {
      unsubGroup();
      unsubPosts();
    };
  }, [id]);

  const handleJoin = async () => {
    if (!authUser || !group) return;
    const isMember = group.members.includes(authUser.uid);
    const groupRef = doc(db, 'groups', group.id);

    try {
      if (isMember) {
        await updateDoc(groupRef, { members: arrayRemove(authUser.uid) });
      } else {
        await updateDoc(groupRef, { members: arrayUnion(authUser.uid) });
        // Notify owner
        if (group.ownerId !== authUser.uid) {
          await addDoc(collection(db, 'notifications'), {
            receiverId: group.ownerId,
            senderId: authUser.uid,
            senderName: profile?.name || 'Someone',
            type: 'group_join',
            targetId: group.id,
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

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !group || !newPost.trim()) return;

    try {
      await addDoc(collection(db, 'posts'), {
        userId: authUser.uid,
        groupId: group.id,
        authorName: profile?.name || 'Anonymous',
        authorPhoto: profile?.photos?.[0],
        content: newPost,
        likes: [],
        comments: [],
        views: 0,
        createdAt: new Date().toISOString()
      });
      setNewPost('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'posts');
    }
  };

  if (loading) return <div className="p-8">Loading group...</div>;
  if (!group) return <div className="p-8 text-center">Group not found.</div>;

  const isMember = group.members.includes(authUser?.uid || '');

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100 mb-8">
        <div className="h-48 bg-gradient-to-r from-emerald-500 to-teal-600 relative">
          {group.coverPhoto && <img src={group.coverPhoto} className="w-full h-full object-cover" alt="Cover" />}
          <button 
            onClick={() => navigate(-1)}
            className="absolute top-6 left-6 p-2 bg-white/20 backdrop-blur-md rounded-xl text-white hover:bg-white/30 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        
        <div className="px-8 pb-8 pt-6">
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-slate-900">{group.title}</h1>
              <div className="flex items-center gap-4 text-sm font-bold text-slate-400 uppercase tracking-widest">
                <div className="flex items-center gap-1">
                  {group.privacy === 'public' ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>{group.privacy} Group</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{group.members.length} Members</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleJoin}
              className={cn(
                "px-8 py-3 rounded-2xl font-black transition-all",
                isMember 
                  ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
                  : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
              )}
            >
              {isMember ? 'Joined' : 'Join Group'}
            </button>
          </div>
          
          <p className="text-slate-600 max-w-2xl leading-relaxed">{group.description}</p>
        </div>
      </div>

      {/* Create Post (Only for members) */}
      {isMember ? (
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 mb-8">
          <form onSubmit={handleCreatePost}>
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Share something with the group..."
              className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 transition-all min-h-[120px] mb-4"
            />
            <div className="flex justify-between items-center">
              <button type="button" className="p-3 text-slate-400 hover:text-emerald-500 transition-colors">
                <ImageIcon className="w-6 h-6" />
              </button>
              <button 
                type="submit"
                disabled={!newPost.trim()}
                className="bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
              >
                <Send className="w-4 h-4" />
                Post
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] p-12 shadow-sm border border-slate-100 mb-8 text-center">
          <Shield className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-xl font-black text-slate-900 mb-2">Private Community</h3>
          <p className="text-slate-500 font-bold">Join this group to see posts and participate in discussions.</p>
        </div>
      )}

      {/* Posts */}
      {isMember && (
        <div className="space-y-6">
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <img src={post.authorPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.userId}`} className="w-12 h-12 rounded-2xl object-cover" alt={post.authorName} />
                  <div>
                    <h3 className="font-black text-slate-900">{post.authorName}</h3>
                    <p className="text-xs font-bold text-slate-400">{formatTime(post.createdAt)}</p>
                  </div>
                </div>
                <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <p className="text-slate-600 leading-relaxed mb-6">{post.content}</p>
              <div className="flex items-center gap-6 pt-6 border-t border-slate-50">
                <button className="flex items-center gap-2 text-slate-400 hover:text-rose-500 transition-colors font-bold text-sm">
                  <Heart className="w-5 h-5" />
                  <span>{post.likes.length}</span>
                </button>
                <button className="flex items-center gap-2 text-slate-400 hover:text-indigo-500 transition-colors font-bold text-sm">
                  <MessageSquare className="w-5 h-5" />
                  <span>{post.comments.length}</span>
                </button>
              </div>
            </div>
          ))}
          {posts.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
              <p className="text-slate-400 font-bold">No posts yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupDetails;
