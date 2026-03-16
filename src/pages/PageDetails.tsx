import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, addDoc, query, where, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Page, Post } from '../types';
import { BadgeCheck, Users, Heart, MessageSquare, ArrowLeft, Image as ImageIcon, Send, MoreHorizontal } from 'lucide-react';
import { cn, formatTime } from '../lib/utils';

const PageDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: authUser, profile } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState<Page | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');

  useEffect(() => {
    if (!id) return;

    const unsubPage = onSnapshot(doc(db, 'pages', id), (doc) => {
      if (doc.exists()) {
        setPage({ id: doc.id, ...doc.data() } as Page);
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `pages/${id}`);
      setLoading(false);
    });

    const postsQuery = query(
      collection(db, 'posts'),
      where('pageId', '==', id),
      orderBy('createdAt', 'desc')
    );

    const unsubPosts = onSnapshot(postsQuery, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
    });

    return () => {
      unsubPage();
      unsubPosts();
    };
  }, [id]);

  const handleFollow = async () => {
    if (!authUser || !page) return;
    const isFollowing = page.followers.includes(authUser.uid);
    const pageRef = doc(db, 'pages', page.id);

    try {
      if (isFollowing) {
        await updateDoc(pageRef, { followers: arrayRemove(authUser.uid) });
      } else {
        await updateDoc(pageRef, { followers: arrayUnion(authUser.uid) });
        // Notify owner
        if (page.ownerId !== authUser.uid) {
          await addDoc(collection(db, 'notifications'), {
            receiverId: page.ownerId,
            senderId: authUser.uid,
            senderName: profile?.name || 'Someone',
            type: 'page_follow',
            targetId: page.id,
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

  const handleLike = async () => {
    if (!authUser || !page) return;
    const isLiked = page.likes?.includes(authUser.uid);
    const pageRef = doc(db, 'pages', page.id);

    try {
      if (isLiked) {
        await updateDoc(pageRef, { likes: arrayRemove(authUser.uid) });
      } else {
        await updateDoc(pageRef, { likes: arrayUnion(authUser.uid) });
        // Notify owner
        if (page.ownerId !== authUser.uid) {
          await addDoc(collection(db, 'notifications'), {
            receiverId: page.ownerId,
            senderId: authUser.uid,
            senderName: profile?.name || 'Someone',
            type: 'like',
            targetId: page.id,
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

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !page || !newPost.trim()) return;

    try {
      await addDoc(collection(db, 'posts'), {
        userId: page.id, // Post as page
        pageId: page.id,
        authorName: page.title,
        authorPhoto: page.avatarUrl,
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

  if (loading) return <div className="p-8">Loading page...</div>;
  if (!page) return <div className="p-8 text-center">Page not found.</div>;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100 mb-8">
        <div className="h-48 bg-gradient-to-r from-indigo-500 to-purple-600 relative">
          {page.coverUrl && <img src={page.coverUrl} className="w-full h-full object-cover" alt="Cover" />}
          <button 
            onClick={() => navigate(-1)}
            className="absolute top-6 left-6 p-2 bg-white/20 backdrop-blur-md rounded-xl text-white hover:bg-white/30 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="relative">
              <img 
                src={page.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${page.id}`} 
                className="w-32 h-32 rounded-[2rem] border-4 border-white shadow-lg bg-white object-cover"
                alt={page.title}
              />
              {page.isVerified && (
                <div className="absolute bottom-2 right-2 bg-blue-500 rounded-full p-1 border-4 border-white">
                  <BadgeCheck className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={handleLike}
                className={cn(
                  "p-3 rounded-2xl transition-all",
                  page.likes?.includes(authUser?.uid || '') 
                    ? "text-rose-500 bg-rose-50" 
                    : "text-slate-400 bg-slate-50 hover:text-rose-500"
                )}
              >
                <Heart className={cn("w-6 h-6", page.likes?.includes(authUser?.uid || '') && "fill-current")} />
              </button>
              <button 
                onClick={handleFollow}
                className={cn(
                  "px-8 py-3 rounded-2xl font-black transition-all",
                  page.followers.includes(authUser?.uid || '') 
                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
                    : "bg-[#ff3366] text-white hover:bg-[#ff1a53] shadow-lg shadow-[#ff3366]/20"
                )}
              >
                {page.followers.includes(authUser?.uid || '') ? 'Following' : 'Follow'}
              </button>
              <Link 
                to={`/messages?pageId=${page.id}`}
                className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"
              >
                <MessageSquare className="w-6 h-6" />
              </Link>
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900">{page.title}</h1>
            <p className="text-sm font-bold text-[#ff3366] uppercase tracking-widest">{page.category}</p>
            <p className="text-slate-600 max-w-2xl leading-relaxed">{page.description}</p>
          </div>
          
          <div className="flex gap-8 mt-8 pt-8 border-t border-slate-50">
            <div className="text-center">
              <p className="text-2xl font-black text-slate-900">{page.followers.length}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-slate-900">{page.likes?.length || 0}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Likes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Post (Only for owner) */}
      {authUser?.uid === page.ownerId && (
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 mb-8">
          <form onSubmit={handleCreatePost}>
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder={`Post as ${page.title}...`}
              className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-[#ff3366] transition-all min-h-[120px] mb-4"
            />
            <div className="flex justify-between items-center">
              <button type="button" className="p-3 text-slate-400 hover:text-[#ff3366] transition-colors">
                <ImageIcon className="w-6 h-6" />
              </button>
              <button 
                type="submit"
                disabled={!newPost.trim()}
                className="bg-[#ff3366] text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-[#ff1a53] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#ff3366]/20"
              >
                <Send className="w-4 h-4" />
                Post
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Posts */}
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
    </div>
  );
};

export default PageDetails;
