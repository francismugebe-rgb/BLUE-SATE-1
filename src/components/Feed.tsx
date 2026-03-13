import React, { useState, useEffect } from 'react';
import { feedService } from '../services/feedService';
import { Heart, MessageSquare, Share2, Send, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface FeedProps {
  user: any;
}

export const Feed: React.FC<FeedProps> = ({ user }) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    const unsubscribe = feedService.listenToFeed((fetchedPosts) => {
      setPosts(fetchedPosts);
    });
    return () => unsubscribe();
  }, []);

  const handleCreatePost = async () => {
    if (!newPostText.trim()) return;
    setIsPosting(true);
    try {
      await feedService.createPost(user.uid, user.fullName || user.displayName, newPostText);
      setNewPostText('');
    } catch (error) {
      console.error("Error creating post", error);
    }
    setIsPosting(false);
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Social Feed</h2>
      </div>

      {/* Create Post */}
      <div className="glass rounded-3xl p-4 space-y-4">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            <img src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} alt="Me" className="w-full h-full object-cover" />
          </div>
          <textarea 
            value={newPostText}
            onChange={(e) => setNewPostText(e.target.value)}
            placeholder="What's on your mind?"
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm resize-none h-20"
          />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <button className="p-2 hover:bg-white/5 rounded-xl text-blue-400 transition-colors">
            <ImageIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={handleCreatePost}
            disabled={isPosting || !newPostText.trim()}
            className="px-6 py-2 bg-sky-500 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2"
          >
            Post <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-6">
        {posts.map((post) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={post.id} 
            className="glass rounded-3xl overflow-hidden"
          >
            <div className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <img src={`https://picsum.photos/seed/${post.authorId}/100/100`} alt="Author" className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="font-bold text-sm">{post.authorName}</h4>
                <span className="text-[10px] text-blue-500">2 hours ago</span>
              </div>
            </div>
            
            <div className="px-4 pb-4">
              <p className="text-sm text-blue-200 leading-relaxed">{post.text}</p>
            </div>

            {post.imageUrl && (
              <div className="aspect-video w-full overflow-hidden">
                <img src={post.imageUrl} alt="Post" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="p-4 border-t border-white/5 flex items-center gap-6">
              <button 
                onClick={() => feedService.toggleLike(post.id, user.uid, post.likes?.includes(user.uid))}
                className={`flex items-center gap-2 text-sm transition-colors ${post.likes?.includes(user.uid) ? 'text-sky-500' : 'text-blue-400 hover:text-white'}`}
              >
                <Heart className={`w-5 h-5 ${post.likes?.includes(user.uid) ? 'fill-current' : ''}`} />
                <span>{post.likes?.length || 0}</span>
              </button>
              <button className="flex items-center gap-2 text-sm text-blue-400 hover:text-white transition-colors">
                <MessageSquare className="w-5 h-5" />
                <span>{post.comments?.length || 0}</span>
              </button>
              <button className="flex items-center gap-2 text-sm text-blue-400 hover:text-white transition-colors ml-auto">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
