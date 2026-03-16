import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, arrayUnion, arrayRemove, where, increment, getDocs, limit as firestoreLimit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Post, UserProfile, Page, Group } from '../types';
import { Heart, MessageCircle, Share2, Image as ImageIcon, Send, MoreHorizontal, X, BadgeCheck, Video, Megaphone, Info, DollarSign, Flag, ExternalLink, Smile, Users, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import { fileToBase64, validateFile } from '../lib/utils';
import { accumulatePoints } from '../services/pointService';

const EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

const Feed: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [matches, setMatches] = useState<UserProfile[]>([]);
  const [suggestedPages, setSuggestedPages] = useState<Page[]>([]);
  const [suggestedGroups, setSuggestedGroups] = useState<Group[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<{tag: string, count: number}[]>([]);
  const [feedType, setFeedType] = useState<'global' | 'following'>('global');
  const [newPost, setNewPost] = useState('');
  const [postImage, setPostImage] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [siteSettings, setSiteSettings] = useState({
    pointValue: 0.01,
    announcement: '',
    adHtml: ''
  });

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        setSiteSettings(snap.data() as any);
      }
    });
    return () => unsubSettings();
  }, []);

  useEffect(() => {
    const postsRef = collection(db, 'posts');
    let q = query(postsRef, orderBy('createdAt', 'desc'));

    if (feedType === 'following' && profile?.following?.length) {
      q = query(postsRef, where('userId', 'in', profile.following), orderBy('createdAt', 'desc'));
    } else if (feedType === 'following') {
      setPosts([]);
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      const sortedPosts = [...postsData].sort((a, b) => {
        const aVerified = a.isVerified ? 1 : 0;
        const bVerified = b.isVerified ? 1 : 0;
        if (aVerified !== bVerified) return bVerified - aVerified;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setPosts(sortedPosts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });
    return () => unsubscribe();
  }, [feedType, profile?.following]);
  
  useEffect(() => {
    if (!profile) return;

    // Suggested Users
    const fetchSuggestions = async () => {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, firestoreLimit(5));
      const snap = await getDocs(q);
      const allUsers = snap.docs.map(d => d.data() as UserProfile);
      
      setSuggestedUsers(allUsers.filter(u => u.uid !== profile.uid && !profile.following?.includes(u.uid)));

      // Matches (Complete profiles + Gender preference)
      const potentialMatches = allUsers.filter(u => {
        if (u.uid === profile.uid) return false;
        const isComplete = u.name && u.photos?.length && u.bio && u.city && u.country;
        const genderMatch = !profile.interestedIn || profile.interestedIn === 'Both' || u.gender === profile.interestedIn;
        return isComplete && genderMatch;
      });
      setMatches(potentialMatches.slice(0, 3));

      // Suggested Pages
      const pagesRef = collection(db, 'pages');
      const pq = query(pagesRef, firestoreLimit(3));
      const psnap = await getDocs(pq);
      setSuggestedPages(psnap.docs.map(d => ({ id: d.id, ...d.data() } as Page)));

      // Suggested Groups
      const groupsRef = collection(db, 'groups');
      const gq = query(groupsRef, firestoreLimit(3));
      const gsnap = await getDocs(gq);
      setSuggestedGroups(gsnap.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
    };

    fetchSuggestions();
  }, [profile]);

  useEffect(() => {
    // Extract hashtags from posts
    const tags: { [key: string]: number } = {};
    posts.forEach(post => {
      const matches = post.content.match(/#\w+/g);
      if (matches) {
        matches.forEach(tag => {
          tags[tag] = (tags[tag] || 0) + 1;
        });
      }
    });
    const sortedTags = Object.entries(tags)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag: tag.replace('#', ''), count }));
    setTrendingHashtags(sortedTags);
  }, [posts]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newPost.trim()) return;
    setIsPosting(true);

    // Simple link detection
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = newPost.match(urlRegex);
    let linkPreview = null;
    if (urls && urls.length > 0) {
      linkPreview = { url: urls[0] };
    }

    try {
      await addDoc(collection(db, 'posts'), {
        userId: profile.uid,
        authorName: profile.name,
        authorPhoto: profile.photos?.[0] || '',
        isVerified: profile.isVerified || false,
        content: newPost,
        image: postImage || null,
        linkPreview,
        likes: [],
        comments: [],
        views: 0,
        createdAt: new Date().toISOString()
      });
      
      await accumulatePoints(profile.uid, 'POST');
      
      setNewPost('');
      setPostImage('');
    } catch (err) {
      console.error("Error creating post:", err);
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: string, emoji: string = '❤️') => {
    if (!profile) return;
    const postRef = doc(db, 'posts', postId);
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const existingLike = post.likes.find(l => l.userId === profile.uid);
    
    try {
      if (existingLike) {
        if (existingLike.emoji === emoji) {
          await updateDoc(postRef, { likes: arrayRemove(existingLike) });
        } else {
          await updateDoc(postRef, { likes: arrayRemove(existingLike) });
          await updateDoc(postRef, { likes: arrayUnion({ userId: profile.uid, emoji }) });
        }
      } else {
        await updateDoc(postRef, { likes: arrayUnion({ userId: profile.uid, emoji }) });
        await accumulatePoints(profile.uid, 'LIKE');
        
        // Notify author
        const post = posts.find(p => p.id === postId);
        if (post && post.userId !== profile.uid) {
          await addDoc(collection(db, 'notifications'), {
            receiverId: post.userId,
            senderId: profile.uid,
            senderName: profile.name,
            type: 'like',
            targetId: postId,
            read: false,
            createdAt: new Date().toISOString()
          });
        }
      }
      setShowEmojiPicker(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleComment = async (postId: string) => {
    if (!profile || !commentText[postId]?.trim()) return;
    const postRef = doc(db, 'posts', postId);
    const newComment = {
      userId: profile.uid,
      userName: profile.name,
      comment: commentText[postId],
      createdAt: new Date().toISOString()
    };

    try {
      await updateDoc(postRef, {
        comments: arrayUnion(newComment)
      });
      await accumulatePoints(profile.uid, 'COMMENT');
      
      // Notify author
      const post = posts.find(p => p.id === postId);
      if (post && post.userId !== profile.uid) {
        await addDoc(collection(db, 'notifications'), {
          receiverId: post.userId,
          senderId: profile.uid,
          senderName: profile.name,
          type: 'comment',
          targetId: postId,
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      setCommentText(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleReport = async (targetId: string, targetType: 'post' | 'user') => {
    if (!profile) return;
    const reason = prompt("Why are you reporting this?");
    if (!reason) return;

    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: profile.uid,
        targetId,
        targetType,
        reason,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      alert("Thank you for reporting. Our admins will review it.");
    } catch (err) {
      console.error("Error reporting:", err);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!profile || profile.uid === targetUserId) return;
    const isFollowing = profile.following?.includes(targetUserId);
    const myRef = doc(db, 'users', profile.uid);
    const theirRef = doc(db, 'users', targetUserId);

    try {
      if (isFollowing) {
        await updateDoc(myRef, { following: arrayRemove(targetUserId) });
        await updateDoc(theirRef, { followers: arrayRemove(profile.uid) });
      } else {
        await updateDoc(myRef, { following: arrayUnion(targetUserId) });
        await updateDoc(theirRef, { followers: arrayUnion(profile.uid) });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, 'image');
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setPostImage(base64);
    } catch (err) {
      alert("Failed to process image");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 max-w-6xl mx-auto">
      <div className="space-y-8">
        {/* Announcement */}
        {siteSettings.announcement && (
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
            <Megaphone className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-blue-900">Announcement</p>
              <p className="text-sm text-blue-700 leading-relaxed">{siteSettings.announcement}</p>
            </div>
          </div>
        )}

        {/* Feed Tabs */}
      <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl w-fit mx-auto">
        <button 
          onClick={() => setFeedType('global')}
          className={cn(
            "px-6 py-2 rounded-xl font-bold text-sm transition-all",
            feedType === 'global' ? "bg-white text-[#ff3366] shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Global
        </button>
        <button 
          onClick={() => setFeedType('following')}
          className={cn(
            "px-6 py-2 rounded-xl font-bold text-sm transition-all",
            feedType === 'following' ? "bg-white text-[#ff3366] shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Following
        </button>
      </div>
      {/* Create Post */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
        <div className="flex gap-4">
          <img src={profile?.photos?.[0] || `https://picsum.photos/seed/${profile?.uid}/100/100`} className="w-12 h-12 rounded-2xl object-cover" referrerPolicy="no-referrer" />
          <form onSubmit={handleCreatePost} className="flex-1 space-y-4">
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCreatePost(e as any);
                }
              }}
              placeholder="What's on your mind?"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10 focus:border-[#ff3366] transition-all resize-none h-24"
            />
            {postImage && (
              <div className="relative">
                <img src={postImage} className="w-full h-40 object-cover rounded-2xl" />
                <button 
                  type="button"
                  onClick={() => setPostImage('')}
                  className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-slate-500 hover:text-[#ff3366] transition-colors font-medium cursor-pointer">
                  <ImageIcon className="w-5 h-5" />
                  <span>Photo</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
                <button 
                  type="button" 
                  onClick={() => {
                    const url = prompt("Enter image URL:");
                    if (url) setPostImage(url);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  URL
                </button>
              </div>
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
                  <Link to={`/profile/${post.userId}`} className="flex gap-3">
                    <img src={post.authorPhoto || `https://picsum.photos/seed/${post.userId}/100/100`} className="w-12 h-12 rounded-2xl object-cover" referrerPolicy="no-referrer" />
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <h4 className="font-bold text-slate-900 hover:text-[#ff3366] transition-colors">{post.authorName}</h4>
                          {post.isVerified && <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500" />}
                        </div>
                      {profile?.uid !== post.userId && (
                        <button 
                          onClick={() => handleFollow(post.userId)}
                          className="text-xs font-bold text-[#ff3366] hover:underline"
                        >
                          {profile?.following?.includes(post.userId) ? 'Following' : '+ Follow'}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-medium">
                      {formatDistanceToNow(new Date(post.createdAt))} ago
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleReport(post.id, 'post')} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Flag className="w-4 h-4" />
                  </button>
                  <button className="text-slate-400 hover:text-slate-600">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <p className="text-slate-700 leading-relaxed mb-4 whitespace-pre-wrap">
                {post.content}
              </p>

              {post.linkPreview && (
                <a 
                  href={post.linkPreview.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-all mb-4"
                >
                  <div className="flex items-center gap-2 text-[#ff3366] font-bold text-sm mb-1">
                    <ExternalLink className="w-4 h-4" />
                    <span>Link Preview</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{post.linkPreview.url}</p>
                </a>
              )}
              
              {post.image && (
                <img src={post.image} className="w-full rounded-2xl mb-4 object-cover max-h-96" referrerPolicy="no-referrer" />
              )}
              
              <div className="flex items-center gap-6 pt-4 border-t border-slate-50 relative">
                <div className="relative">
                  <button 
                    onMouseEnter={() => setShowEmojiPicker(post.id)}
                    onClick={() => handleLike(post.id)}
                    className={cn(
                      "flex items-center gap-2 transition-colors font-bold text-sm",
                      post.likes.some(l => l.userId === profile?.uid) ? "text-[#ff3366]" : "text-slate-400 hover:text-[#ff3366]"
                    )}
                  >
                    <Heart className={cn("w-5 h-5", post.likes.some(l => l.userId === profile?.uid) && "fill-current")} />
                    <span>{post.likes.length}</span>
                  </button>
                  
                  {showEmojiPicker === post.id && (
                    <div 
                      className="absolute bottom-full left-0 mb-2 bg-white shadow-xl border border-slate-100 rounded-full p-2 flex gap-2 z-10 animate-in fade-in slide-in-from-bottom-2"
                      onMouseLeave={() => setShowEmojiPicker(null)}
                    >
                      {EMOJIS.map(emoji => (
                        <button 
                          key={emoji} 
                          onClick={() => handleLike(post.id, emoji)}
                          className="hover:scale-125 transition-transform p-1"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button className="flex items-center gap-2 text-slate-400 hover:text-[#6c5ce7] transition-colors font-bold text-sm">
                  <MessageCircle className="w-5 h-5" />
                  <span>{post.comments.length}</span>
                </button>
                <button className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors font-bold text-sm">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>

              {/* Likes Summary */}
              {post.likes.length > 0 && (
                <div className="mt-2 flex items-center gap-1">
                  <div className="flex -space-x-1">
                    {Array.from(new Set(post.likes.map(l => l.emoji))).slice(0, 3).map((emoji, i) => (
                      <span key={i} className="text-xs">{emoji}</span>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {post.likes.length} reactions
                  </span>
                </div>
              )}

              {/* Comments Section */}
              <div className="mt-6 space-y-4">
                {post.comments.map((comment, idx) => (
                  <div key={idx} className="flex gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex-shrink-0" />
                    <div className="bg-slate-50 rounded-2xl p-3 flex-1">
                      <span className="font-bold text-slate-900 mr-2">{comment.userName}</span>
                      <span className="text-slate-600">{comment.comment}</span>
                    </div>
                  </div>
                ))}
                
                <div className="flex gap-3 items-center pt-2">
                  <img src={profile?.photos?.[0] || ''} className="w-8 h-8 rounded-lg object-cover" />
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={commentText[post.id] || ''}
                      onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                      placeholder="Write a comment..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10 focus:border-[#ff3366] text-sm"
                    />
                    <button 
                      onClick={() => handleComment(post.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#ff3366]"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    {/* Sidebar */}
      <div className="hidden lg:block space-y-6">
        {/* Points Info */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-yellow-600" />
            </div>
            <h3 className="font-black text-slate-900">Your Earnings</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500 font-bold">Total Points</span>
              <span className="text-lg font-black text-slate-900">{profile?.points || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500 font-bold">Point Value</span>
              <span className="text-sm font-black text-emerald-600">${siteSettings.pointValue} / pt</span>
            </div>
            <div className="pt-2 border-t border-slate-50 flex justify-between items-center">
              <span className="text-sm text-slate-900 font-black">Est. Value</span>
              <span className="text-xl font-black text-[#ff3366]">
                ${((profile?.points || 0) * siteSettings.pointValue).toFixed(2)}
              </span>
            </div>
          </div>
          <button 
            onClick={() => navigate('/wallet')}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
          >
            Redeem Points
          </button>
        </div>

        {/* Matches */}
        {matches.length > 0 && (
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-xs font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
              <Heart className="w-4 h-4 fill-current" />
              Your Matches
            </h3>
            <div className="space-y-4">
              {matches.map(user => (
                <div key={user.uid} className="flex items-center justify-between">
                  <Link to={`/profile/${user.uid}`} className="flex items-center gap-3">
                    <img src={user.photos?.[0] || `https://picsum.photos/seed/${user.uid}/100/100`} className="w-10 h-10 rounded-xl object-cover" referrerPolicy="no-referrer" />
                    <div>
                      <p className="text-sm font-bold text-slate-900 truncate w-24">{user.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{user.city}, {user.country}</p>
                    </div>
                  </Link>
                  <button 
                    onClick={() => handleFollow(user.uid)}
                    className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Friends */}
        {suggestedUsers.length > 0 && (
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Suggested Friends</h3>
            <div className="space-y-4">
              {suggestedUsers.map(user => (
                <div key={user.uid} className="flex items-center justify-between">
                  <Link to={`/profile/${user.uid}`} className="flex items-center gap-3">
                    <img src={user.photos?.[0] || `https://picsum.photos/seed/${user.uid}/100/100`} className="w-10 h-10 rounded-xl object-cover" referrerPolicy="no-referrer" />
                    <div>
                      <p className="text-sm font-bold text-slate-900 truncate w-24">{user.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{user.level}</p>
                    </div>
                  </Link>
                  <button 
                    onClick={() => handleFollow(user.uid)}
                    className="p-2 bg-slate-50 text-[#ff3366] rounded-xl hover:bg-[#ff3366] hover:text-white transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Pages */}
        {suggestedPages.length > 0 && (
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Suggested Pages</h3>
            <div className="space-y-4">
              {suggestedPages.map(page => (
                <div key={page.id} className="flex items-center justify-between">
                  <Link to={`/pages/${page.id}`} className="flex items-center gap-3">
                    <img src={page.avatarUrl || `https://picsum.photos/seed/${page.id}/100/100`} className="w-10 h-10 rounded-xl object-cover" referrerPolicy="no-referrer" />
                    <div>
                      <p className="text-sm font-bold text-slate-900 truncate w-24">{page.title}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{page.category}</p>
                    </div>
                  </Link>
                  <button className="p-2 bg-slate-50 text-[#ff3366] rounded-xl hover:bg-[#ff3366] hover:text-white transition-all">
                    <Heart className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Groups */}
        {suggestedGroups.length > 0 && (
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Suggested Groups</h3>
            <div className="space-y-4">
              {suggestedGroups.map(group => (
                <div key={group.id} className="flex items-center justify-between">
                  <Link to={`/groups/${group.id}`} className="flex items-center gap-3">
                    <img src={group.coverPhoto || `https://picsum.photos/seed/${group.id}/100/100`} className="w-10 h-10 rounded-xl object-cover" referrerPolicy="no-referrer" />
                    <div>
                      <p className="text-sm font-bold text-slate-900 truncate w-24">{group.title}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{group.privacy}</p>
                    </div>
                  </Link>
                  <button className="p-2 bg-slate-50 text-[#ff3366] rounded-xl hover:bg-[#ff3366] hover:text-white transition-all">
                    <Users className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trending Hashtags */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Trending Now</h3>
          <div className="space-y-4">
            {trendingHashtags.map(item => (
              <div key={item.tag} className="group cursor-pointer">
                <p className="text-sm font-bold text-slate-900 group-hover:text-[#ff3366] transition-colors">#{item.tag}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">{item.count} posts</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ad Section */}
        {siteSettings.adHtml && (
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Sponsored</h3>
              <Info className="w-3 h-3 text-slate-300" />
            </div>
            <div 
              className="ad-container overflow-hidden rounded-xl"
              dangerouslySetInnerHTML={{ __html: siteSettings.adHtml }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;
