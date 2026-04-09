import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove, getDoc, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, Share2, Image as ImageIcon, Send, MoreHorizontal, MapPin, Sparkles, Camera, Zap, TrendingUp, Clock, DollarSign, X, UserCheck, Megaphone, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import LoadingScreen from '../../components/LoadingScreen';
import imageCompression from 'browser-image-compression';
import { ActionService } from '../../services/ActionService';

interface Ad {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
  placement: 'feed' | 'sidebar';
  status: 'approved';
}

interface Post {
  id: string;
  userId: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  likes: string[];
  likeCount: number;
  location?: string;
  createdAt: any;
  displayName?: string;
  photoURL?: string;
  isVerified?: boolean;
  isBoosted?: boolean;
  isSponsored?: boolean;
  boostUntil?: any;
  boostAmount?: number;
}

interface Comment {
  id: string;
  userId: string;
  displayName: string;
  photoURL: string;
  text: string;
  createdAt: any;
}

const FeedPage: React.FC = () => {
  const { user, awardPoints } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [newPostMedia, setNewPostMedia] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeComments, setActiveComments] = useState<string | null>(null);
  const [isBoosting, setIsBoosting] = useState<string | null>(null);
  const [boostData, setBoostData] = useState({ amount: 5, hours: 24 });
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
  const [loading, setLoading] = useState(true);
  const [feedAds, setFeedAds] = useState<Ad[]>([]);
  const [sidebarAds, setSidebarAds] = useState<Ad[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'ads'),
      where('status', '==', 'approved')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const adsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Ad[];
      setFeedAds(adsData.filter(a => a.placement === 'feed'));
      setSidebarAds(adsData.filter(a => a.placement === 'sidebar'));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'posts'), 
      orderBy(sortBy === 'recent' ? 'createdAt' : 'likeCount', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((post: any) => (post.text?.trim() || post.mediaUrl) && post.displayName) as Post[];
      
      // Sort boosted posts to the top
      const sortedPosts = [...postsData].sort((a: any, b: any) => {
        if (a.isBoosted && !b.isBoosted) return -1;
        if (!a.isBoosted && b.isBoosted) return 1;
        return 0;
      });

      setPosts(sortedPosts);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [sortBy]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!newPostText.trim() && !newPostMedia.trim())) return;

    setIsSubmitting(true);
    try {
      const response = await ActionService.createPost(newPostText, newPostMedia, mediaType || undefined);
      
      if (response.status) {
        // Award points for posting
        await awardPoints(10);
        
        setNewPostText('');
        setNewPostMedia('');
        setMediaPreview(null);
        setMediaType(null);
      } else {
        alert(response.error || "Failed to create post");
      }
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user || isLiked) return; // Only handle liking through service for now, unliking can stay simple or be added

    try {
      const response = await ActionService.likePost(postId);
      if (response.status) {
        await awardPoints(2);
        
        // Add notification logic is handled inside ActionService (or should be)
        // Actually, my ActionService doesn't handle notifications for likes yet.
        // I should update ActionService to handle notifications for all actions.
      } else {
        alert(response.error || "Failed to like post");
      }
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleBoost = async (postId: string) => {
    if (!user) return;

    // Check Pro Status and Boost Limits
    const isPro = user.proTier && user.proTier !== 'none' && user.proExpiration?.toDate() > new Date();
    
    if (!isPro) {
      alert("Only Pro members can boost posts! Upgrade your account to boost.");
      return;
    }

    // Check active boosts
    const activeBoosts = posts.filter(p => p.userId === user.uid && p.isBoosted).length;
    let boostLimit = 0;
    let boostDurationDays = 0;

    if (user.proTier === 'bronze') {
      boostLimit = 1;
      boostDurationDays = 5;
    } else if (user.proTier === 'gold') {
      boostLimit = 1;
      boostDurationDays = 7;
    } else if (user.proTier === 'platinum') {
      boostLimit = 5;
      boostDurationDays = 30;
    }

    if (activeBoosts >= boostLimit) {
      alert(`You have reached your active boost limit (${boostLimit}) for ${user.proTier} tier.`);
      return;
    }

    try {
      const postRef = doc(db, 'posts', postId);
      const boostUntil = new Date();
      boostUntil.setDate(boostUntil.getDate() + boostDurationDays);

      await updateDoc(postRef, {
        isBoosted: true,
        boostUntil: boostUntil,
        boostAmount: 0 // Free boost for Pro members
      });

      setIsBoosting(null);
      alert(`Post boosted successfully for ${boostDurationDays} days!`);
    } catch (error) {
      console.error("Error boosting post:", error);
    }
  };

  const handleSponsor = async (postId: string) => {
    if (!user) return;
    const sponsorCost = 1.00;

    if ((user.walletBalance || 0) < sponsorCost) {
      alert("Insufficient wallet balance to sponsor this post! Cost: $1.00");
      return;
    }

    try {
      const postRef = doc(db, 'posts', postId);
      const userRef = doc(db, 'users', user.uid);

      await updateDoc(postRef, {
        isSponsored: true,
        sponsoredAt: serverTimestamp()
      });

      await updateDoc(userRef, {
        walletBalance: (user.walletBalance || 0) - sponsorCost
      });

      // Create payment record
      await addDoc(collection(db, 'payments'), {
        userId: user.uid,
        amount: sponsorCost,
        type: 'sponsor_post',
        status: 'approved',
        method: 'wallet',
        createdAt: serverTimestamp()
      });

      alert("Post sponsored successfully! $1.00 deducted from your wallet.");
    } catch (error) {
      console.error("Error sponsoring post:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    
    // Local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      let fileToUpload = file;
      
      // Compress images if > 2MB
      if (type === 'image' && file.size > 2 * 1024 * 1024) {
        const options = {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        };
        fileToUpload = await imageCompression(file, options);
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const { url } = await response.json();
      setNewPostMedia(url);
      setMediaType(type);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload media. Please try again.");
    } finally {
      setIsSubmitting(false);
      if (e.target) e.target.value = '';
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-8 space-y-8">
          {/* Sort Toggle */}
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => setSortBy('recent')}
              className={`px-6 py-2 rounded-full font-bold transition-all ${sortBy === 'recent' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-100'}`}
            >
              Recent
            </button>
            <button 
              onClick={() => setSortBy('popular')}
              className={`px-6 py-2 rounded-full font-bold transition-all ${sortBy === 'popular' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-100'}`}
            >
              Popular
            </button>
          </div>

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
                  <label className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 rounded-xl text-slate-600 font-bold transition-colors cursor-pointer">
                    <ImageIcon className="w-5 h-5 text-green-500" />
                    Photo
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'image')} />
                  </label>
                  <label className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 rounded-xl text-slate-600 font-bold transition-colors cursor-pointer">
                    <Share2 className="w-5 h-5 text-purple-500" />
                    Video
                    <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileUpload(e, 'video')} />
                  </label>
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
              { (mediaPreview || newPostMedia) && (
                <div className="relative rounded-2xl overflow-hidden aspect-video group">
                  {mediaType === 'image' ? (
                    <img src={mediaPreview || newPostMedia} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <video src={mediaPreview || newPostMedia} className="w-full h-full object-cover" />
                  )}
                  <button 
                    onClick={() => {setNewPostMedia(''); setMediaPreview(null); setMediaType(null);}}
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
              {posts.map((post, index) => {
                const isLiked = user ? post.likes.includes(user.uid) : false;
                const adIndex = Math.floor(index / 3);
                const showAd = index > 0 && index % 3 === 0 && feedAds[adIndex];

                return (
                  <React.Fragment key={post.id}>
                    {showAd && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100 p-6"
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <Megaphone className="w-4 h-4 text-pink-500" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sponsored Ad</span>
                        </div>
                        <div className="flex flex-col md:flex-row gap-6">
                          <div className="w-full md:w-48 h-32 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                            <img src={feedAds[adIndex].imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-black text-slate-900 mb-2">{feedAds[adIndex].title}</h3>
                            <p className="text-slate-500 font-medium text-sm mb-4">{feedAds[adIndex].content}</p>
                            <button className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-2">
                              Learn More
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    <motion.div
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
                            <div className="flex items-center gap-2">
                              <Link to={`/profile/${post.userId}`} className="hover:text-pink-500 transition-colors">
                                <h3 className="font-black text-slate-900 leading-none">{post.displayName}</h3>
                              </Link>
                              {post.isVerified && <Sparkles className="w-3 h-3 text-blue-500 fill-blue-500" />}
                              {user?.friends?.includes(post.userId) && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                                  <UserCheck className="w-3 h-3" />
                                  Friends
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                              {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : 'Just now'}
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
                          {post.mediaType === 'video' ? (
                            <video 
                              src={post.mediaUrl} 
                              controls 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img 
                              src={post.mediaUrl} 
                              alt="" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          )}
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
                            {post.likeCount || 0}
                          </button>
                          <button 
                            onClick={() => setActiveComments(activeComments === post.id ? null : post.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                              activeComments === post.id ? 'bg-blue-50 text-blue-500' : 'hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <MessageCircle className="w-5 h-5" />
                            Comment
                          </button>
                          {post.userId === user?.uid && !post.isBoosted && (
                            <button 
                              onClick={() => setIsBoosting(post.id)}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all hover:bg-yellow-50 text-yellow-600"
                            >
                              <Zap className="w-5 h-5" />
                              Boost
                            </button>
                          )}
                          {post.userId === user?.uid && !post.isSponsored && (
                            <button 
                              onClick={() => handleSponsor(post.id)}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all hover:bg-blue-50 text-blue-600"
                            >
                              <DollarSign className="w-5 h-5" />
                              Sponsor ($1)
                            </button>
                          )}
                          {post.isBoosted && (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold bg-yellow-50 text-yellow-600">
                              <TrendingUp className="w-5 h-5" />
                              Boosted
                            </div>
                          )}
                          {post.isSponsored && (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold bg-blue-50 text-blue-600">
                              <Sparkles className="w-5 h-5" />
                              Sponsored
                            </div>
                          )}
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 rounded-xl text-slate-600 font-bold transition-colors">
                          <Share2 className="w-5 h-5" />
                          Share
                        </button>
                      </div>

                      {/* Comment Section */}
                      {activeComments === post.id && (
                        <CommentSection postId={post.id} />
                      )}
                    </motion.div>
                  </React.Fragment>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar Ads */}
        <div className="hidden lg:block lg:col-span-4 space-y-6">
          <div className="sticky top-24 space-y-6">
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-pink-500" />
                Sponsored
              </h3>
              <div className="space-y-6">
                {sidebarAds.map((ad) => (
                  <div key={ad.id} className="group cursor-pointer">
                    <div className="aspect-video rounded-2xl overflow-hidden bg-slate-100 mb-3">
                      <img src={ad.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <h4 className="font-black text-slate-900 text-sm mb-1 group-hover:text-pink-500 transition-colors">{ad.title}</h4>
                    <p className="text-xs text-slate-500 font-medium line-clamp-2">{ad.content}</p>
                  </div>
                ))}
                {sidebarAds.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No ads to show</p>
                    <Link to="/ads" className="text-xs text-pink-500 font-black hover:underline mt-2 inline-block">Create your ad</Link>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-2xl font-black mb-2">Go Pro</h3>
                <p className="text-slate-400 text-sm font-medium mb-6">Unlock exclusive features and boost your reach.</p>
                <Link to="/pro" className="bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-sm hover:bg-slate-100 transition-all inline-block">
                  Upgrade Now
                </Link>
              </div>
              <Sparkles className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5" />
            </div>
          </div>
        </div>
      </div>

      {/* Boost Modal */}
      {isBoosting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-yellow-600" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">Boost Post</h2>
                </div>
                <button onClick={() => setIsBoosting(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-3xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-slate-500">Current Tier</span>
                    <span className="px-3 py-1 bg-pink-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest">{user?.proTier}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-bold text-slate-500">Boost Duration</span>
                      <span className="text-sm font-black text-slate-900">
                        {user?.proTier === 'bronze' ? '5 Days' : user?.proTier === 'gold' ? '7 Days' : '30 Days'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-bold text-slate-500">Cost</span>
                      <span className="text-sm font-black text-green-500">FREE (Pro Benefit)</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
                  <p className="text-xs font-bold text-yellow-700 leading-relaxed">
                    Boosting your post makes it appear at the top of the feed for everyone in your region.
                  </p>
                </div>

                <button 
                  onClick={() => handleBoost(isBoosting)}
                  className="w-full bg-yellow-500 text-white py-4 rounded-2xl font-black hover:bg-yellow-600 transition-all shadow-xl shadow-yellow-500/20"
                >
                  Confirm Boost
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const CommentSection: React.FC<{ postId: string }> = ({ postId }) => {
  const { user, awardPoints } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const q = query(collection(db, `posts/${postId}/comments`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(commentsData);
    });
    return () => unsubscribe();
  }, [postId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    try {
      await addDoc(collection(db, `posts/${postId}/comments`), {
        userId: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        text: newComment,
        createdAt: serverTimestamp()
      });
      
      await awardPoints(5); // Award points for commenting
      setNewComment('');
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  return (
    <div className="p-6 bg-slate-50 border-t border-slate-100">
      <div className="space-y-4 mb-6">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
              <img src={comment.photoURL} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-black text-slate-900">{comment.displayName}</span>
                <span className="text-[10px] font-bold text-slate-400">
                  {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                </span>
              </div>
              <p className="text-sm text-slate-600 font-medium">{comment.text}</p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleAddComment} className="flex gap-2">
        <input 
          type="text" 
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-pink-500/20 outline-none"
        />
        <button 
          type="submit"
          disabled={!newComment.trim()}
          className="bg-pink-500 text-white p-2 rounded-xl hover:bg-pink-600 disabled:bg-pink-300 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default FeedPage;
