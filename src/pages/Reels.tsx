import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Reel } from '../types';
import { Play, Heart, MessageCircle, Share2, Plus, X, Eye, Upload, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

const Reels: React.FC = () => {
  const { profile } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'reels'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reel)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reels');
    });
    return () => unsubscribe();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('video/')) {
        setVideoFile(file);
      } else {
        alert('Please select a valid video file.');
        e.target.value = '';
      }
    }
  };

  const handleAddReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !videoFile) return;

    setIsUploading(true);
    const storageRef = ref(storage, `reels/${profile.uid}/${Date.now()}_${videoFile.name}`);
    const uploadTask = uploadBytesResumable(storageRef, videoFile);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error("Upload error:", error);
        alert("Failed to upload video. Please try again.");
        setIsUploading(false);
        setUploadProgress(null);
      }, 
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          await addDoc(collection(db, 'reels'), {
            userId: profile.uid,
            authorName: profile.name,
            authorPhoto: profile.photos?.[0] || '',
            videoUrl: downloadURL,
            caption,
            likes: [],
            comments: [],
            views: 0,
            createdAt: new Date().toISOString()
          });
          setIsAdding(false);
          setVideoFile(null);
          setCaption('');
          setUploadProgress(null);
          setIsUploading(false);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'reels');
          setIsUploading(false);
        }
      }
    );
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
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "w-full aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all group",
                videoFile && "border-[#ff3366] bg-rose-50/30"
              )}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="video/*"
                className="hidden"
              />
              {videoFile ? (
                <div className="text-center p-4">
                  <Play className="w-12 h-12 text-[#ff3366] mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{videoFile.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-[#ff3366]" />
                  </div>
                  <p className="text-sm font-bold text-slate-900">Choose a video</p>
                  <p className="text-xs text-slate-400">MP4, MOV, or any video format</p>
                </>
              )}
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <span>Uploading...</span>
                  <span>{Math.round(uploadProgress || 0)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#ff3366] transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <textarea 
              placeholder="Write a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10 h-24 resize-none"
            />
            <button 
              disabled={!videoFile || isUploading}
              className="w-full bg-[#ff3366] text-white py-4 rounded-xl font-bold shadow-lg shadow-[#ff3366]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <span>Share Reel</span>
              )}
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
