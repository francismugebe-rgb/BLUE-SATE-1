import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Reel } from '../types';
import { Play, Heart, MessageCircle, Share2, Plus, X, Eye } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

const Reels: React.FC = () => {
  const { profile } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [caption, setCaption] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'reels'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reel)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reels');
    });
    return () => unsubscribe();
  }, []);

  const handleAddReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !videoUrl.trim()) return;

    try {
      await addDoc(collection(db, 'reels'), {
        userId: profile.uid,
        authorName: profile.name,
        authorPhoto: profile.photos?.[0] || '',
        videoUrl,
        caption,
        likes: [],
        comments: [],
        views: 0,
        createdAt: new Date().toISOString()
      });
      setIsAdding(false);
      setVideoUrl('');
      setCaption('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'reels');
    }
  };

  const handleLike = async (reel: Reel) => {
    if (!profile) return;
    const reelRef = doc(db, 'reels', reel.id);
    const isLiked = reel.likes.includes(profile.uid);
    try {
      await updateDoc(reelRef, {
        likes: isLiked ? arrayRemove(profile.uid) : arrayUnion(profile.uid)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reels/${reel.id}`);
    }
  };

  const handleView = async (reelId: string) => {
    try {
      await updateDoc(doc(db, 'reels', reelId), { views: increment(1) });
    } catch (err) {}
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Reels</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-[#ff3366] text-white p-3 rounded-2xl shadow-lg shadow-[#ff3366]/20 hover:scale-105 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900">Post a Reel</h3>
            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleAddReel} className="space-y-4">
            <input 
              type="url" 
              placeholder="Video URL (MP4, YouTube, etc.)"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10"
              required
            />
            <textarea 
              placeholder="Write a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10 h-24 resize-none"
            />
            <button className="w-full bg-[#ff3366] text-white py-4 rounded-xl font-bold shadow-lg shadow-[#ff3366]/20">
              Share Reel
            </button>
          </form>
        </div>
      )}

      <div className="space-y-8">
        {reels.map(reel => (
          <div key={reel.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden group">
            <div className="relative aspect-[9/16] bg-black flex items-center justify-center overflow-hidden">
              {/* In a real app we'd use a video tag, here we simulate with an image if it's not a direct video link */}
              <video 
                src={reel.videoUrl} 
                className="w-full h-full object-cover"
                controls
                onPlay={() => handleView(reel.id)}
              />
              <div className="absolute top-6 left-6 flex items-center gap-3">
                <img src={reel.authorPhoto} className="w-10 h-10 rounded-xl border-2 border-white shadow-md" />
                <div className="text-white drop-shadow-md">
                  <p className="font-bold text-sm">{reel.authorName}</p>
                  <p className="text-[10px] opacity-80">{formatDistanceToNow(new Date(reel.createdAt))} ago</p>
                </div>
              </div>
              <div className="absolute bottom-6 right-6 flex flex-col gap-4">
                <button 
                  onClick={() => handleLike(reel)}
                  className="flex flex-col items-center gap-1 group/btn"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center transition-all",
                    reel.likes.includes(profile?.uid || '') ? "bg-[#ff3366] text-white" : "bg-white/20 text-white hover:bg-white/40"
                  )}>
                    <Heart className={cn("w-6 h-6", reel.likes.includes(profile?.uid || '') && "fill-current")} />
                  </div>
                  <span className="text-white text-xs font-bold drop-shadow-md">{reel.likes.length}</span>
                </button>
                <button className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-all">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <span className="text-white text-xs font-bold drop-shadow-md">{reel.comments.length}</span>
                </button>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                    <Eye className="w-6 h-6" />
                  </div>
                  <span className="text-white text-xs font-bold drop-shadow-md">{reel.views}</span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-700 font-medium">{reel.caption}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reels;
