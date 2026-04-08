import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Music2, UserPlus, MoreVertical } from 'lucide-react';

interface Reel {
  id: string;
  userId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  description: string;
  likes: string[];
  views: number;
  createdAt: any;
  displayName?: string;
  photoURL?: string;
}

const ReelsPage: React.FC = () => {
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'reels'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reelsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Reel[];
      setReels(reelsData);
    });
    return () => unsubscribe();
  }, []);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const index = Math.round(containerRef.current.scrollTop / window.innerHeight);
    setActiveIndex(index);
  };

  return (
    <div className="h-screen bg-black overflow-hidden relative">
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      >
        {reels.length > 0 ? (
          reels.map((reel, i) => (
            <div key={reel.id} className="h-screen w-full snap-start relative flex items-center justify-center">
              {/* Video Placeholder (Using Image for Demo since we don't have real video processing yet) */}
              <img 
                src={reel.videoUrl} 
                className="h-full w-full object-cover"
                alt=""
                referrerPolicy="no-referrer"
              />
              
              {/* Overlay UI */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
              
              {/* Right Side Actions */}
              <div className="absolute right-4 bottom-32 flex flex-col gap-6 items-center z-10">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-slate-800">
                    <img src={reel.photoURL || `https://picsum.photos/seed/${reel.userId}/100/100`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <button className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-pink-500 text-white rounded-full p-1">
                    <UserPlus className="w-3 h-3 fill-white" />
                  </button>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <button className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:text-pink-500 transition-colors">
                    <Heart className="w-7 h-7" />
                  </button>
                  <span className="text-white text-xs font-bold">{reel.likes.length}</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <button className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white">
                    <MessageCircle className="w-7 h-7" />
                  </button>
                  <span className="text-white text-xs font-bold">124</span>
                </div>

                <button className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white">
                  <Share2 className="w-7 h-7" />
                </button>

                <button className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white">
                  <MoreVertical className="w-7 h-7" />
                </button>
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-10 left-4 right-16 z-10">
                <h3 className="text-white font-black text-lg mb-2">@{reel.displayName || 'user'}</h3>
                <p className="text-white/90 text-sm font-medium mb-4 line-clamp-2">
                  {reel.description}
                </p>
                <div className="flex items-center gap-2 text-white/80">
                  <Music2 className="w-4 h-4 animate-spin-slow" />
                  <span className="text-xs font-bold tracking-wide">Original Sound - {reel.displayName}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-white gap-4">
            <div className="w-20 h-20 bg-slate-800 rounded-full animate-pulse" />
            <p className="font-bold text-slate-400">No reels found. Upload your first one!</p>
          </div>
        )}
      </div>

      {/* Top Nav Overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-center gap-8 z-20">
        <button className="text-white/60 font-black text-lg hover:text-white transition-colors">Following</button>
        <button className="text-white font-black text-lg border-b-2 border-white pb-1">For You</button>
      </div>
    </div>
  );
};

export default ReelsPage;
