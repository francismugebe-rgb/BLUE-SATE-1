import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, collection, query, orderBy, addDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove, getDoc, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, Share2, Image as ImageIcon, Send, MoreHorizontal, MapPin, Sparkles, Camera, Zap, TrendingUp, Clock, DollarSign, X, UserCheck, Megaphone, ExternalLink, ArrowLeft, Globe, Layout, Users, Settings, Crown, User } from 'lucide-react';
import LoadingScreen from '../../components/LoadingScreen';
import imageCompression from 'browser-image-compression';
import { ActionService } from '../../services/ActionService';
import { getDocs } from 'firebase/firestore';

const PageDetailPage: React.FC = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  
  const [newPostText, setNewPostText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [isUpdatingPhotos, setIsUpdatingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pageId) return;

    const unsubPage = onSnapshot(doc(db, 'pages', pageId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPage({ id: docSnap.id, ...data });
        setIsOwner(user?.uid === data.ownerId);
        setIsFollowing(data.followers?.includes(user?.uid));
        setIsLiked(data.likes?.includes(user?.uid));
        setLoading(false);
      } else {
        navigate('/pages');
      }
    });

    const qPosts = query(
      collection(db, `pages/${pageId}/posts`),
      orderBy('createdAt', 'desc')
    );
    const unsubPosts = onSnapshot(qPosts, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubPage();
      unsubPosts();
    };
  }, [pageId, user, navigate]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1920 };
        const compressedFile = await imageCompression(file, options);
        setSelectedImage(compressedFile);
        setImagePreview(URL.createObjectURL(compressedFile));
      } catch (error) {
        console.error("Compression error:", error);
      }
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim() && !selectedImage) return;
    if (!pageId) return;

    setIsPosting(true);
    try {
      let mediaUrl = '';
      if (selectedImage) {
        const reader = new FileReader();
        mediaUrl = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(selectedImage);
        });
      }

      const response = await ActionService.createPagePost(pageId, newPostText, mediaUrl, mediaUrl ? 'image' : undefined);
      if (response.status) {
        setNewPostText('');
        setSelectedImage(null);
        setImagePreview(null);
      }
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setIsPosting(false);
    }
  };

  const handleFollow = async () => {
    if (!pageId) return;
    try {
      await ActionService.followPage(pageId);
    } catch (error) {
      console.error("Error following page:", error);
    }
  };

  const handleLike = async () => {
    if (!pageId) return;
    try {
      await ActionService.likePage(pageId);
    } catch (error) {
      console.error("Error liking page:", error);
    }
  };

  const handleUpdatePhoto = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file || !pageId) return;

    setIsUpdatingPhotos(true);
    try {
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1200 };
      const compressedFile = await imageCompression(file, options);
      
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(compressedFile);
      });

      await updateDoc(doc(db, 'pages', pageId), {
        [type === 'photo' ? 'photoURL' : 'coverURL']: base64
      });
    } catch (error) {
      console.error(`Error updating ${type}:`, error);
    } finally {
      setIsUpdatingPhotos(false);
    }
  };

  const handleMessage = async () => {
    if (!user || !pageId) return;
    
    try {
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', user.uid)
      );
      const snapshot = await getDocs(q);
      const existing = snapshot.docs.find(doc => doc.data().participants.includes(pageId));
      
      if (existing) {
        navigate(`/chat?convId=${existing.id}`);
      } else {
        const docRef = await addDoc(collection(db, 'conversations'), {
          participants: [user.uid, pageId],
          updatedAt: serverTimestamp(),
          lastMessage: 'Started a conversation'
        });
        navigate(`/chat?convId=${docRef.id}`);
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12">
      {/* Page Header */}
      <div className="relative h-64 md:h-80 bg-slate-200">
        {page.coverURL ? (
          <img src={page.coverURL} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-pink-500 to-rose-600 opacity-20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        
        {isOwner && (
          <button 
            onClick={() => coverInputRef.current?.click()}
            className="absolute bottom-8 right-8 p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white hover:bg-white/30 transition-all flex items-center gap-2 font-bold text-sm"
          >
            <Camera className="w-5 h-5" />
            Change Cover
          </button>
        )}
        <input 
          type="file" 
          ref={coverInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={(e) => handleUpdatePhoto(e, 'cover')}
        />

        <Link to="/pages" className="absolute top-8 left-8 p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white hover:bg-white/30 transition-all">
          <ArrowLeft className="w-6 h-6" />
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <div className="relative -mt-20 flex flex-col md:flex-row items-end gap-6 mb-8">
          <div className="w-40 h-40 rounded-[2.5rem] bg-white p-2 shadow-2xl relative group">
            <div className="w-full h-full rounded-[2rem] bg-pink-50 overflow-hidden flex items-center justify-center">
              {page.photoURL ? (
                <img src={page.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-black text-pink-500">{page.name[0]}</span>
              )}
            </div>
            {isOwner && (
              <button 
                onClick={() => photoInputRef.current?.click()}
                className="absolute inset-2 bg-black/40 text-white rounded-[2rem] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
              >
                <Camera className="w-8 h-8" />
              </button>
            )}
            <input 
              type="file" 
              ref={photoInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={(e) => handleUpdatePhoto(e, 'photo')}
            />
          </div>
          <div className="flex-1 pb-4">
            <h1 className="text-4xl font-black text-slate-900 mb-2">{page.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-slate-500 font-bold text-sm">
              <span className="flex items-center gap-1">
                <Globe className="w-4 h-4" />
                {page.category}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {page.followers?.length || 0} Followers
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                {page.likes?.length || 0} Likes
              </span>
            </div>
          </div>
          <div className="flex gap-3 pb-4">
            {isOwner && (
              <Link 
                to="/profile"
                className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2"
              >
                <User className="w-5 h-5" />
                Switch to Profile
              </Link>
            )}
            {!isOwner && (
              <>
                <button 
                  onClick={handleMessage}
                  className="p-3 bg-white text-slate-600 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all shadow-sm"
                >
                  <MessageCircle className="w-6 h-6" />
                </button>
                <button 
                  onClick={handleFollow}
                  className={`px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-lg ${
                    isFollowing 
                      ? 'bg-slate-100 text-slate-600 shadow-none' 
                      : 'bg-pink-500 text-white shadow-pink-500/20 hover:bg-pink-600'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow Page'}
                </button>
                <button 
                  onClick={handleLike}
                  className={`p-3 rounded-2xl transition-all border ${
                    isLiked 
                      ? 'bg-pink-50 text-pink-500 border-pink-100' 
                      : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <Heart className={`w-6 h-6 ${isLiked ? 'fill-pink-500' : ''}`} />
                </button>
              </>
            )}
            {isOwner && (
              <button className="p-3 bg-white text-slate-600 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all shadow-sm">
                <Settings className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* About Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-900 mb-4">About</h3>
              <p className="text-slate-500 font-medium leading-relaxed mb-6">
                {page.description || "No description provided."}
              </p>
              <div className="space-y-4 pt-6 border-t border-slate-50">
                <div className="flex items-center gap-3 text-slate-600">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <span className="text-sm font-bold">Created {page.createdAt?.toDate?.()?.toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Layout className="w-5 h-5 text-slate-400" />
                  <span className="text-sm font-bold">{page.category}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Posts Feed */}
          <div className="lg:col-span-2 space-y-6">
            {isOwner && (
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                <form onSubmit={handleCreatePost}>
                  <textarea 
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    placeholder={`Post as ${page.name}...`}
                    className="w-full bg-slate-50 border-none rounded-2xl p-6 font-medium text-lg focus:ring-2 focus:ring-pink-500/20 resize-none mb-4"
                    rows={3}
                  />
                  
                  <AnimatePresence>
                    {imagePreview && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="relative w-full aspect-video rounded-2xl overflow-hidden mb-4"
                      >
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                          className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-xl hover:bg-black/70 transition-all"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center justify-between">
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 text-slate-500 font-bold hover:text-pink-500 transition-colors"
                    >
                      <ImageIcon className="w-5 h-5" />
                      Add Photo
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageSelect}
                    />
                    <button 
                      type="submit"
                      disabled={isPosting || (!newPostText.trim() && !selectedImage)}
                      className="bg-pink-500 text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-pink-500/20 hover:bg-pink-600 transition-all disabled:opacity-50"
                    >
                      {isPosting ? 'Posting...' : 'Post Update'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-6">
              {posts.map(post => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100"
                >
                  <div className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-pink-50 overflow-hidden">
                        {page.photoURL ? (
                          <img src={page.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-pink-500 font-black">
                            {page.name[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 leading-none mb-1">{page.name}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {post.createdAt?.toDate?.()?.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-slate-600 font-medium text-lg leading-relaxed mb-6">{post.text}</p>
                    {post.mediaUrl && (
                      <div className="rounded-[2rem] overflow-hidden mb-6 border border-slate-50">
                        <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex items-center gap-6 pt-6 border-t border-slate-50">
                      <button className="flex items-center gap-2 text-slate-400 font-bold hover:text-pink-500 transition-colors">
                        <Heart className="w-5 h-5" />
                        {post.likeCount || 0}
                      </button>
                      <button className="flex items-center gap-2 text-slate-400 font-bold hover:text-pink-500 transition-colors">
                        <MessageCircle className="w-5 h-5" />
                        {post.commentCount || 0}
                      </button>
                      <button className="flex items-center gap-2 text-slate-400 font-bold hover:text-pink-500 transition-colors ml-auto">
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
              {posts.length === 0 && (
                <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100">
                  <Layout className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold">No posts yet from this page.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageDetailPage;
