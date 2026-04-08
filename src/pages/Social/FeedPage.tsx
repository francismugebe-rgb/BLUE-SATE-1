import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Image as ImageIcon, Send, MoreHorizontal, MapPin } from 'lucide-react';

interface Post {
  id: string;
  userId: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  likes: string[];
  location?: string;
  createdAt: any;
  displayName?: string;
  photoURL?: string;
}

const FeedPage: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [newPostMedia, setNewPostMedia] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
    });
    return () => unsubscribe();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!newPostText.trim() && !newPostMedia.trim())) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        text: newPostText,
        mediaUrl: newPostMedia,
        mediaType: newPostMedia ? 'image' : null,
        likes: [],
        createdAt: serverTimestamp()
      });
      setNewPostText('');
      setNewPostMedia('');
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return;
    const postRef = doc(db, 'posts', postId);
    try {
      await updateDoc(postRef, {
        likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Create Post */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100"
        >
          <form onSubmit={handleCreatePost} className="space-y-4">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                    {user?.displayName?.[0]}
                  </div>
                )}
              </div>
              <textarea
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder={`What's on your mind, ${user?.displayName?.split(' ')[0]}?`}
                className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-pink-500/20 resize-none font-medium text-slate-700 min-h-[100px]"
              />
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => {
                    const url = prompt("Enter image URL:");
                    if (url) setNewPostMedia(url);
                  }}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 rounded-xl text-slate-600 font-bold transition-colors"
                >
                  <ImageIcon className="w-5 h-5 text-green-500" />
                  Photo
                </button>
                <button type="button" className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 rounded-xl text-slate-600 font-bold transition-colors">
                  <MapPin className="w-5 h-5 text-red-500" />
                  Location
                </button>
              </div>
              <button 
                type="submit"
                disabled={isSubmitting || (!newPostText.trim() && !newPostMedia.trim())}
                className="bg-pink-500 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-pink-600 disabled:bg-pink-300 transition-all shadow-lg shadow-pink-500/20 flex items-center gap-2"
              >
                {isSubmitting ? "Posting..." : "Post"}
                <Send className="w-4 h-4" />
              </button>
            </div>
            {newPostMedia && (
              <div className="relative rounded-2xl overflow-hidden aspect-video group">
                <img src={newPostMedia} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setNewPostMedia('')}
                  className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                >
                  ×
                </button>
              </div>
            )}
          </form>
        </motion.div>

        {/* Feed */}
        <div className="space-y-6">
          <AnimatePresence>
            {posts.map((post) => {
              const isLiked = user ? post.likes.includes(user.uid) : false;
              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100"
                >
                  {/* Post Header */}
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden">
                        {post.photoURL ? (
                          <img src={post.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                            {post.displayName?.[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 leading-none">{post.displayName}</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                          {post.createdAt?.toDate().toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Post Content */}
                  <div className="px-6 pb-4">
                    <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                      {post.text}
                    </p>
                  </div>

                  {post.mediaUrl && (
                    <div className="aspect-square md:aspect-video bg-slate-100">
                      <img 
                        src={post.mediaUrl} 
                        alt="" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="p-4 flex items-center justify-between border-t border-slate-50">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleLike(post.id, isLiked)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                          isLiked ? 'bg-pink-50 text-pink-500' : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <Heart className={`w-5 h-5 ${isLiked ? 'fill-pink-500' : ''}`} />
                        {post.likes.length > 0 && post.likes.length}
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 rounded-xl text-slate-600 font-bold transition-colors">
                        <MessageCircle className="w-5 h-5" />
                        Comment
                      </button>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 rounded-xl text-slate-600 font-bold transition-colors">
                      <Share2 className="w-5 h-5" />
                      Share
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default FeedPage;
