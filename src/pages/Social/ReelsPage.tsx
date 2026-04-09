import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove, getDoc, where, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, Share2, Music2, UserPlus, MoreVertical, Play, Plus, X, Send, UserCheck, Volume2, VolumeX, Crown, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import LoadingScreen from '../../components/LoadingScreen';
import { ActionService } from '../../services/ActionService';

interface Reel {
  id: string;
  userId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  caption: string;
  likes: string[];
  views: number;
  commentCount: number;
  createdAt: any;
  displayName?: string;
  photoURL?: string;
  isSuperAdmin?: boolean;
}

interface Comment {
  id: string;
  userId: string;
  displayName: string;
  photoURL: string;
  text: string;
  createdAt: any;
}

const ReelsPage: React.FC = () => {
  const { user, awardPoints } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({ caption: '', hashtags: '' });
  const [loading, setLoading] = useState(true);
  const [feedType, setFeedType] = useState<'for-you' | 'following'>('for-you');
  const [isMuted, setIsMuted] = useState(true);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let q;
    if (feedType === 'following' && user?.following?.length > 0) {
      q = query(
        collection(db, 'reels'),
        where('userId', 'in', user.following),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
    } else {
      q = query(collection(db, 'reels'), orderBy('createdAt', 'desc'), limit(20));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reelsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Reel[];
      setReels(reelsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [feedType, user]);

  useEffect(() => {
    if (!showComments) {
      setComments([]);
      return;
    }

    const q = query(
      collection(db, `reels/${showComments}/comments`),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Comment[]);
    });
    return () => unsubscribe();
  }, [showComments]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const index = Math.round(containerRef.current.scrollTop / window.innerHeight);
    if (index !== activeIndex) {
      setActiveIndex(index);
      // Track view
      if (reels[index]) {
        ActionService.viewReel(reels[index].id);
      }
    }
  };

  const handleLike = async (reelId: string) => {
    if (!user) return;
    await ActionService.likeReel(reelId);
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !showComments || !newComment.trim()) return;

    const response = await ActionService.commentReel(showComments, newComment);
    if (response.status) {
      setNewComment('');
    }
  };

  const handleFollow = async (targetId: string) => {
    if (!user) return;
    await ActionService.followUser(targetId);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("Video size must be less than 3MB.");
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      if (video.duration > 180) {
        alert("Video must be less than 3 minutes.");
        return;
      }
      if (video.duration < 5) {
        alert("Video must be at least 5 seconds.");
        return;
      }

      setUploadFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    };
    video.src = URL.createObjectURL(file);
  };

  const handlePublishReel = async () => {
    if (!uploadFile || !user) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const { url } = await response.json();
      
      const finalCaption = `${uploadForm.caption} ${uploadForm.hashtags}`.trim();

      await addDoc(collection(db, 'reels'), {
        userId: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL || '',
        isSuperAdmin: user.email === 'FRANCISMUGEBE@gmail.com',
        videoUrl: url,
        caption: finalCaption || "Check out my new reel! #HeartConnect",
        likes: [],
        views: 0,
        commentCount: 0,
        createdAt: serverTimestamp()
      });

      await awardPoints(20);
      alert("Reel published successfully!");
      setUploadPreview(null);
      setUploadFile(null);
      setUploadForm({ caption: '', hashtags: '' });
    } catch (error) {
      console.error("Error publishing reel:", error);
      alert("Failed to publish reel. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleShare = (reelId: string) => {
    const url = `${window.location.origin}/reels?id=${reelId}`;
    navigator.clipboard.writeText(url);
    alert("Link copied to clipboard!");
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="h-screen bg-slate-950 overflow-hidden relative flex justify-center items-center md:py-8">
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full w-full max-w-[450px] md:h-full md:aspect-[9/19] bg-black overflow-y-scroll snap-y snap-mandatory scrollbar-hide relative shadow-[0_0_100px_rgba(0,0,0,0.8)] md:border-[12px] border-slate-800 md:rounded-[3rem]"
      >
        {reels.length > 0 ? (
          reels.map((reel, i) => (
            <div key={reel.id} className="h-screen w-full snap-start relative flex items-center justify-center">
              <video 
                src={reel.videoUrl} 
                className="h-full w-full object-cover"
                autoPlay={activeIndex === i}
                loop
                muted={isMuted}
                playsInline
                onClick={() => setIsMuted(!isMuted)}
              />
              
              {/* Overlay UI */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
              
              {/* Mute Indicator */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-active:opacity-100 transition-opacity">
                {isMuted ? <VolumeX className="w-16 h-16 text-white/50" /> : <Volume2 className="w-16 h-16 text-white/50" />}
              </div>

              {/* Right Side Actions */}
              <div className="absolute right-4 bottom-32 flex flex-col gap-6 items-center z-10">
                <div className="relative">
                  <Link to={`/profile/${reel.userId}`} className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-slate-800 block">
                    <img src={reel.photoURL || `https://picsum.photos/seed/${reel.userId}/100/100`} alt="" className="w-full h-full object-cover" />
                  </Link>
                  {user?.uid !== reel.userId && !user?.following?.includes(reel.userId) && (
                    <button 
                      onClick={() => handleFollow(reel.userId)}
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-pink-500 text-white rounded-full p-1 hover:scale-110 transition-transform"
                    >
                      <Plus className="w-3 h-3 fill-white" />
                    </button>
                  )}
                  {user?.following?.includes(reel.userId) && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-500 text-white rounded-full p-1">
                      <UserCheck className="w-3 h-3" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center gap-1">
                  <button 
                    onClick={() => handleLike(reel.id)}
                    className={`w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white transition-colors ${reel.likes?.includes(user?.uid) ? 'text-pink-500' : 'hover:text-pink-500'}`}
                  >
                    <Heart className={`w-7 h-7 ${reel.likes?.includes(user?.uid) ? 'fill-current' : ''}`} />
                  </button>
                  <span className="text-white text-xs font-bold">{reel.likes?.length || 0}</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <button 
                    onClick={() => setShowComments(reel.id)}
                    className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:text-blue-400 transition-colors"
                  >
                    <MessageCircle className="w-7 h-7" />
                  </button>
                  <span className="text-white text-xs font-bold">{reel.commentCount || 0}</span>
                </div>

                <button 
                  onClick={() => handleShare(reel.id)}
                  className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:text-green-400 transition-colors"
                >
                  <Share2 className="w-7 h-7" />
                </button>

                <button className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white">
                  <MoreVertical className="w-7 h-7" />
                </button>
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-10 left-4 right-16 z-10">
                <Link to={`/profile/${reel.userId}`} className="inline-block">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white font-black text-lg hover:text-pink-500 transition-colors">@{reel.displayName || 'user'}</span>
                    {reel.isSuperAdmin && <Crown className="w-5 h-5 text-yellow-400 fill-yellow-400" />}
                  </div>
                </Link>
                <p className="text-white/90 text-sm font-medium mb-4 line-clamp-2">
                  {reel.caption}
                </p>
                <div className="flex items-center gap-2 text-white/80">
                  <Music2 className="w-4 h-4 animate-spin-slow" />
                  <span className="text-xs font-bold tracking-wide">Original Sound - {reel.displayName}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-white gap-6">
            <div className="w-24 h-24 bg-slate-800 rounded-[2rem] flex items-center justify-center shadow-2xl border border-slate-700">
              <Zap className="w-12 h-12 text-pink-500 fill-pink-500" />
            </div>
            <div className="text-center">
              <p className="font-black text-2xl text-white mb-2">No Reels Yet</p>
              <p className="text-slate-400 font-medium">Be the first to share a short video!</p>
            </div>
            <label className="flex items-center gap-3 bg-pink-500 text-white px-8 py-4 rounded-2xl font-black cursor-pointer hover:bg-pink-600 transition-all shadow-xl shadow-pink-500/20">
              <Plus className="w-6 h-6" />
              <span>Upload Your First Reel</span>
              <input type="file" accept="video/*" className="hidden" onChange={handleFileSelect} disabled={isUploading} />
            </label>
          </div>
        )}
      </div>

      {/* Top Nav Overlay */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[450px] p-6 flex justify-between items-center z-20">
        <div className="w-10" /> {/* Spacer */}
        <div className="flex gap-8">
          <button 
            onClick={() => setFeedType('following')}
            className={`font-black text-lg transition-colors ${feedType === 'following' ? 'text-white border-b-2 border-white pb-1' : 'text-white/60 hover:text-white'}`}
          >
            Following
          </button>
          <button 
            onClick={() => setFeedType('for-you')}
            className={`font-black text-lg transition-colors ${feedType === 'for-you' ? 'text-white border-b-2 border-white pb-1' : 'text-white/60 hover:text-white'}`}
          >
            For You
          </button>
        </div>
        <label className="flex items-center gap-2 bg-pink-500 text-white px-4 py-2 rounded-full font-bold cursor-pointer hover:bg-pink-600 transition-all shadow-lg shadow-pink-500/20">
          <Plus className="w-5 h-5" />
          <span>Upload</span>
          <input type="file" accept="video/*" className="hidden" onChange={handleFileSelect} disabled={isUploading} />
        </label>
      </div>

      {/* Comment Modal */}
      <AnimatePresence>
        {showComments && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowComments(null)}
              className="absolute inset-0 bg-black/40 z-[60]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="absolute bottom-0 left-0 right-0 h-[70vh] bg-white rounded-t-[3rem] z-[70] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">{comments.length} Comments</h3>
                <button onClick={() => setShowComments(null)} className="p-2 hover:bg-slate-50 rounded-full">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-4">
                    <img src={comment.photoURL} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-slate-900 text-sm">{comment.displayName}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {comment.createdAt?.toDate?.()?.toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-600 text-sm font-medium leading-relaxed">{comment.text}</p>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                    <MessageCircle className="w-12 h-12 opacity-20" />
                    <p className="font-bold">No comments yet. Be the first!</p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 pb-10">
                <form onSubmit={handleComment} className="flex gap-4">
                  <input 
                    type="text" 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-4 font-medium focus:ring-2 focus:ring-pink-500/20"
                  />
                  <button 
                    type="submit"
                    disabled={!newComment.trim()}
                    className="w-14 h-14 bg-pink-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/20 hover:bg-pink-600 transition-all disabled:opacity-50"
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {uploadPreview && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] overflow-hidden max-w-4xl w-full flex flex-col md:flex-row shadow-2xl"
            >
              <div className="md:w-1/2 aspect-[9/16] bg-black relative">
                <video src={uploadPreview} className="w-full h-full object-cover" autoPlay muted loop />
                <button 
                  onClick={() => { setUploadPreview(null); setUploadFile(null); }}
                  className="absolute top-4 left-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="md:w-1/2 p-8 flex flex-col">
                <div className="flex-1 space-y-6">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">Publish Reel</h3>
                    <p className="text-slate-500 font-medium text-sm">Share your moment with the world.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Caption</label>
                      <textarea 
                        value={uploadForm.caption}
                        onChange={(e) => setUploadForm({...uploadForm, caption: e.target.value})}
                        placeholder="What's on your mind?"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium resize-none h-32 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Hashtags</label>
                      <input 
                        type="text"
                        value={uploadForm.hashtags}
                        onChange={(e) => setUploadForm({...uploadForm, hashtags: e.target.value})}
                        placeholder="#trending #love #reels"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-8 flex gap-4">
                  <button 
                    onClick={() => { setUploadPreview(null); setUploadFile(null); }}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all text-sm"
                  >
                    Discard
                  </button>
                  <button 
                    onClick={handlePublishReel}
                    disabled={isUploading}
                    className="flex-1 py-4 bg-pink-500 text-white rounded-2xl font-bold hover:bg-pink-600 transition-all shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 text-sm"
                  >
                    {isUploading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Publish
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isUploading && !uploadPreview && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center">
          <div className="text-center max-w-xs w-full px-6">
            <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white font-bold">Uploading Reel...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReelsPage;
