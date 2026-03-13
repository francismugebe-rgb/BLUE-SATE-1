import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Post } from '../types';
import { Heart, MessageCircle, Share2, Image as ImageIcon, Send, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';

const Feed: React.FC = () => {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(postsData);
    });
    return () => unsubscribe();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newPost.trim()) return;
    setIsPosting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        userId: profile.uid,
        authorName: profile.name,
        authorPhoto: profile.photos?.[0] || '',
        content: newPost,
        likes: [],
        comments: [],
        createdAt: new Date().toISOString()
      });
      setNewPost('');
    } catch (err) {
      console.error("Error creating post:", err);
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (post: Post) => {
    if (!profile) return;
    const postRef = doc(db, 'posts', post.id);
    const isLiked = post.likes.includes(profile.uid);
    
    if (isLiked) {
      await updateDoc(postRef, { likes: arrayRemove(profile.uid) });
    } else {
      await updateDoc(postRef, { likes: arrayUnion(profile.uid) });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Create Post */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
        <div className="flex gap-4">
          <img src={profile?.photos?.[0] || `https://picsum.photos/seed/${profile?.uid}/100/100`} className="w-12 h-12 rounded-2xl object-cover" referrerPolicy="no-referrer" />
          <form onSubmit={handleCreatePost} className="flex-1 space-y-4">
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10 focus:border-[#ff3366] transition-all resize-none h-24"
            />
            <div className="flex justify-between items-center">
              <button type="button" className="flex items-center gap-2 text-slate-500 hover:text-[#ff3366] transition-colors font-medium">
                <ImageIcon className="w-5 h-5" />
                <span>Photo</span>
              </button>
              <button
                type="submit"
                disabled={isPosting || !newPost.trim()}
                className="bg-[#ff3366] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#e62e5c] transition-all disabled:opacity-50"
              >
                {isPosting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3">
                  <img src={post.authorPhoto || `https://picsum.photos/seed/${post.userId}/100/100`} className="w-12 h-12 rounded-2xl object-cover" referrerPolicy="no-referrer" />
                  <div>
                    <h4 className="font-bold text-slate-900">{post.authorName}</h4>
                    <p className="text-xs text-slate-400 font-medium">
                      {formatDistanceToNow(new Date(post.createdAt))} ago
                    </p>
                  </div>
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-slate-700 leading-relaxed mb-4 whitespace-pre-wrap">
                {post.content}
              </p>
              
              {post.image && (
                <img src={post.image} className="w-full rounded-2xl mb-4 object-cover max-h-96" referrerPolicy="no-referrer" />
              )}
              
              <div className="flex items-center gap-6 pt-4 border-t border-slate-50">
                <button 
                  onClick={() => handleLike(post)}
                  className={cn(
                    "flex items-center gap-2 transition-colors font-bold text-sm",
                    post.likes.includes(profile?.uid || '') ? "text-[#ff3366]" : "text-slate-400 hover:text-[#ff3366]"
                  )}
                >
                  <Heart className={cn("w-5 h-5", post.likes.includes(profile?.uid || '') && "fill-current")} />
                  <span>{post.likes.length}</span>
                </button>
                <button className="flex items-center gap-2 text-slate-400 hover:text-[#6c5ce7] transition-colors font-bold text-sm">
                  <MessageCircle className="w-5 h-5" />
                  <span>{post.comments.length}</span>
                </button>
                <button className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors font-bold text-sm">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Feed;
