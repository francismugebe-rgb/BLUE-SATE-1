import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, addDoc, collection, query, where, getDocs, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserProfile, Post, Reel } from '../types';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { User, MapPin, Briefcase, Ruler, Heart, Edit3, Camera, Check, UserPlus, UserMinus, ShieldCheck, BadgeCheck, Star, Trophy, Image as ImageIcon, Video, Grid, Users as UsersIcon, Info, Play, Globe, CreditCard, Zap, Search, MessageCircle, Hand, Sun, Moon, Loader2, Share2, Send, ExternalLink, MessageSquare, X } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { INTERESTS_LIST, RELATIONSHIP_STATUS_LIST, COUNTRIES, GENDERS } from '../constants';
import { cn, fileToBase64, validateFile } from '../lib/utils';
import { createTransaction, accumulatePoints } from '../services/pointService';
import { formatDistanceToNow } from 'date-fns';
import { TransactionType } from '../types';

const EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

const Profile: React.FC = () => {
  const { id } = useParams();
  const { profile, user: authUser, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { openChat } = useChat();
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editedData, setEditedData] = useState<Partial<UserProfile>>({});
  const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'friends' | 'photos' | 'reels'>('posts');
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userReels, setUserReels] = useState<Reel[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [matchingUsers, setMatchingUsers] = useState<UserProfile[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [postMedia, setPostMedia] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  const isOwnProfile = !id || id === authUser?.uid;
  const canEdit = isOwnProfile || isAdmin;

  useEffect(() => {
    if (!targetProfile?.uid) return;

    // Fetch user posts
    const postsQuery = query(collection(db, 'posts'), where('userId', '==', targetProfile.uid), orderBy('createdAt', 'desc'));
    const unsubPosts = onSnapshot(postsQuery, (snap) => {
      setUserPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    // Fetch user reels
    const reelsQuery = query(collection(db, 'reels'), where('userId', '==', targetProfile.uid), orderBy('createdAt', 'desc'));
    const unsubReels = onSnapshot(reelsQuery, (snap) => {
      setUserReels(snap.docs.map(d => ({ id: d.id, ...d.data() } as Reel)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reels');
    });

    // Fetch friends (followers for now)
    const fetchFriends = async () => {
      if (!targetProfile.followers?.length) {
        setFriends([]);
        setFriendCount(0);
        return;
      }
      const friendsQuery = query(collection(db, 'users'), where('uid', 'in', targetProfile.followers.slice(0, 10)));
      const snap = await getDocs(friendsQuery);
      setFriends(snap.docs.map(d => d.data() as UserProfile));
      setFriendCount(targetProfile.followers.length);
    };
    fetchFriends();

    return () => {
      unsubPosts();
      unsubReels();
    };
  }, [targetProfile?.uid, targetProfile?.followers]);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      if (isOwnProfile) {
        setTargetProfile(profile);
        setEditedData(profile || {});
      } else if (id) {
        const snap = await getDoc(doc(db, 'users', id));
        if (snap.exists()) setTargetProfile(snap.data() as UserProfile);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [id, profile, isOwnProfile]);

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const handlePostFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      setPostMedia(file);
      setMediaType('image');
      setMediaPreview(URL.createObjectURL(file));
    } else if (file.type.startsWith('video/')) {
      setPostMedia(file);
      setMediaType('video');
      setMediaPreview(URL.createObjectURL(file));
    } else {
      alert('Please select an image or video file.');
    }
  };

  const handleCreatePost = async () => {
    if (!profile || (!newPostContent.trim() && !postMedia)) return;
    setIsPosting(true);
    setUploadProgress(0);

    try {
      let mediaUrl = null;
      let isReel = false;

      if (postMedia) {
        const fileName = `${Date.now()}_${postMedia.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const storageRef = ref(storage, `posts/${profile.uid}/${fileName}`);
        
        const uploadTask = uploadBytesResumable(storageRef, postMedia);
        
        const uploadPromise = new Promise<string>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              console.error("Upload failed:", error);
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });

        mediaUrl = await uploadPromise;
        setUploadProgress(100);

        if (mediaType === 'video') {
          const duration = await getVideoDuration(postMedia);
          if (duration < 30) {
            isReel = true;
          }
        }
      }

      if (isReel && mediaUrl) {
        await addDoc(collection(db, 'reels'), {
          userId: profile.uid,
          authorName: profile.name,
          authorPhoto: profile.photos?.[0] || '',
          videoUrl: mediaUrl,
          caption: newPostContent,
          likes: [],
          comments: [],
          views: 0,
          createdAt: new Date().toISOString()
        });
        alert('Short video added to Reels!');
      } else {
        await addDoc(collection(db, 'posts'), {
          userId: profile.uid,
          authorName: profile.name,
          authorPhoto: profile.photos?.[0] || '',
          isVerified: profile.isVerified || false,
          content: newPostContent,
          image: mediaType === 'image' ? mediaUrl : null,
          video: mediaType === 'video' ? mediaUrl : null,
          likes: [],
          comments: [],
          views: 0,
          createdAt: new Date().toISOString()
        });
        alert('Post shared successfully!');
      }

      setNewPostContent('');
      setPostMedia(null);
      setMediaType(null);
      setMediaPreview(null);
      setUploadProgress(null);
      await accumulatePoints(profile.uid, 'POST');
    } catch (err) {
      console.error("Error creating post:", err);
      alert('Failed to create post.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleSave = async () => {
    if (!authUser || !targetProfile) return;
    try {
      await updateDoc(doc(db, 'users', targetProfile.uid), editedData);
      setIsEditing(false);
      setUploadSuccess(null);
      alert('Profile saved successfully!');
      if (!isOwnProfile) {
        // If admin edited, refresh target profile
        const snap = await getDoc(doc(db, 'users', targetProfile.uid));
        if (snap.exists()) setTargetProfile(snap.data() as UserProfile);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetProfile.uid}`);
    }
  };

  const handleFollow = async () => {
    if (!profile || !targetProfile || isOwnProfile) return;
    
    const isFollowing = profile.following?.includes(targetProfile.uid);
    const myRef = doc(db, 'users', profile.uid);
    const theirRef = doc(db, 'users', targetProfile.uid);

    try {
      if (isFollowing) {
        await updateDoc(myRef, {
          following: profile.following?.filter(id => id !== targetProfile.uid)
        });
        await updateDoc(theirRef, {
          followers: targetProfile.followers?.filter(id => id !== profile.uid)
        });
        setTargetProfile(prev => prev ? { ...prev, followers: prev.followers?.filter(id => id !== profile.uid) } : null);
      } else {
        await updateDoc(myRef, {
          following: arrayUnion(targetProfile.uid)
        });
        await updateDoc(theirRef, {
          followers: arrayUnion(profile.uid)
        });
        setTargetProfile(prev => prev ? { ...prev, followers: [...(prev.followers || []), profile.uid] } : null);

        // Notify them
        await addDoc(collection(db, 'notifications'), {
          receiverId: targetProfile.uid,
          senderId: profile.uid,
          senderName: profile.name,
          type: 'follow',
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file || !targetProfile) return;

    if (!isEditing) {
      alert('Please click "Edit Profile" before changing photos.');
      return;
    }

    const validation = validateFile(file, 'image');
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setIsUploadingPhoto(true);
    setUploadSuccess(null);

    try {
      const base64 = await fileToBase64(file);
      
      if (type === 'profile') {
        setEditedData(prev => ({ 
          ...prev, 
          photos: [base64, ...(prev.photos?.slice(1) || targetProfile.photos?.slice(1) || [])] 
        }));
      } else {
        setEditedData(prev => ({ ...prev, coverPhoto: base64 }));
      }
      
      setUploadSuccess(`${type === 'profile' ? 'Profile' : 'Cover'} photo ready! Click Save to apply.`);
      setTimeout(() => setUploadSuccess(null), 3000);
    } catch (err) {
      alert('Failed to process image.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePhotoChange = async (type: 'profile' | 'cover') => {
    if (!canEdit || !targetProfile) return;
    const newPhoto = prompt(`Enter new ${type} photo URL:`);
    if (newPhoto) {
      try {
        const updateObj = type === 'profile' 
          ? { photos: [newPhoto, ...(targetProfile.photos?.slice(1) || [])] }
          : { coverPhoto: newPhoto };
        
        await updateDoc(doc(db, 'users', targetProfile.uid), updateObj);
        
        if (isOwnProfile) {
          // Profile will update via onSnapshot in AuthContext
        } else {
          setTargetProfile({ ...targetProfile, ...updateObj });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${targetProfile.uid}`);
      }
    }
  };

  const toggleInterest = (interest: string) => {
    const currentInterests = editedData.interests || targetProfile?.interests || [];
    const newInterests = currentInterests.includes(interest)
      ? currentInterests.filter(i => i !== interest)
      : [...currentInterests, interest];
    setEditedData({ ...editedData, interests: newInterests });
  };

  const handleUpgradeProfile = async () => {
    if (!profile) return;
    const cost = 500; // Example cost in points
    if (profile.points < cost) {
      alert(`You need ${cost} points to upgrade your profile. You have ${profile.points}.`);
      return;
    }

    if (confirm(`Upgrade to Premium for ${cost} points?`)) {
      try {
        await createTransaction(profile.uid, -cost, TransactionType.PAYMENT, 'Profile Upgrade to Premium');
        await updateDoc(doc(db, 'users', profile.uid), { isPremium: true });
        alert('Profile upgraded to Premium!');
      } catch (err) {
        alert('Failed to upgrade profile.');
      }
    }
  };

  const handleRequestVerification = async () => {
    if (!profile) return;
    const cost = 1000; // Example cost in points
    if (profile.points < cost) {
      alert(`You need ${cost} points for verification. You have ${profile.points}.`);
      return;
    }

    if (confirm(`Request verification for ${cost} points?`)) {
      try {
        await createTransaction(profile.uid, -cost, TransactionType.PAYMENT, 'Verification Request');
        await updateDoc(doc(db, 'users', profile.uid), { isVerifiedPending: true });
        alert('Verification request submitted!');
      } catch (err) {
        alert('Failed to submit request.');
      }
    }
  };

  const handleWave = async () => {
    if (!profile || !targetProfile) return;
    try {
      const chatId = [profile.uid, targetProfile.uid].sort().join('_');
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        chatId,
        senderId: profile.uid,
        receiverId: targetProfile.uid,
        text: '👋 Waved at you!',
        read: false,
        createdAt: new Date().toISOString()
      });
      openChat(targetProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'wave');
    }
  };
  const handleMatch = async () => {
    if (!profile) return;
    setIsMatching(true);
    try {
      // Strict Male/Female matching
      let targetGender = '';
      if (profile.gender === 'Male') {
        targetGender = 'Female';
      } else if (profile.gender === 'Female') {
        targetGender = 'Male';
      } else {
        alert("Matching is currently optimized for Male and Female users. Please update your gender in settings.");
        setIsMatching(false);
        return;
      }

      const q = query(
        collection(db, 'users'),
        where('gender', '==', targetGender),
        limit(50)
      );
      const snap = await getDocs(q);
      const matches = snap.docs
        .map(d => d.data() as UserProfile)
        .filter(u => u.uid !== profile.uid)
        .filter(u => u.name && u.photos?.length && u.bio && u.city && u.country); // Profile completeness check
      
      if (matches.length === 0) {
        alert("No match available at the moment. Please try again later!");
        setMatchingUsers([]);
      } else {
        setMatchingUsers(matches.slice(0, 10));
        setActiveTab('friends'); 
        alert(`Found ${matches.length} potential matches with complete profiles!`);
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while searching for matches.");
    } finally {
      setIsMatching(false);
    }
  };

  const handleLike = async (postId: string, emoji: string = '❤️') => {
    if (!profile) return;
    const postRef = doc(db, 'posts', postId);
    const post = userPosts.find(p => p.id === postId);
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
        
        if (post.userId !== profile.uid) {
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
      
      const post = userPosts.find(p => p.id === postId);
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

  if (loading) return <div className="flex items-center justify-center h-full">Loading profile...</div>;
  if (!targetProfile) return <div className="text-center py-20">Profile not found</div>;

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="bg-[var(--bg-card)] shadow-sm border-b border-[var(--border-color)] -mt-8 mb-8 transition-colors duration-300 overflow-hidden rounded-b-[3rem]">
        {/* Header / Photos */}
        <div className="relative">
          {/* Cover Photo */}
          <div className="h-[250px] md:h-[350px] bg-[var(--bg-input)] relative">
            <img 
              src={editedData.coverPhoto || targetProfile.coverPhoto || `https://picsum.photos/seed/${targetProfile.uid}-cover/1200/400`} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {isEditing && (
              <label className="absolute bottom-6 right-6 bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-white hover:bg-white/30 transition-all flex items-center gap-2 font-bold cursor-pointer border border-white/30 shadow-lg">
                <Camera className="w-4 h-4" />
                <span className="text-sm">Change Cover</span>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'cover')} className="hidden" />
              </label>
            )}
          </div>

          {/* Profile Info Section - Arranged to avoid overlap */}
          <div className="px-4 md:px-8 -mt-20 md:-mt-24 relative z-10">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
              {/* Profile Photo */}
              <div className="relative">
                <div className="relative">
                  <img 
                    src={(editedData.photos?.[0]) || targetProfile.photos?.[0] || `https://picsum.photos/seed/${targetProfile.uid}/400/400`} 
                    className="w-40 h-40 md:w-48 md:h-48 rounded-[2.5rem] object-cover border-4 border-[var(--bg-card)] shadow-2xl bg-[var(--bg-card)]"
                    referrerPolicy="no-referrer"
                  />
                  {isEditing && (
                    <label className="absolute -bottom-2 -right-2 bg-[#ff3366] p-3 rounded-2xl text-white hover:scale-110 transition-all cursor-pointer shadow-xl border-2 border-[var(--bg-card)]">
                      <Camera className="w-5 h-5" />
                      <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'profile')} className="hidden" />
                    </label>
                  )}
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-black/40 rounded-[2.5rem] flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left pb-4">
                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                  <h1 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] md:text-white drop-shadow-sm flex items-center gap-2 justify-center md:justify-start">
                    {targetProfile.name}
                    {targetProfile.isVerified && (
                      <BadgeCheck className="w-6 h-6 md:w-8 md:h-8 text-[#00a2ff] fill-white" />
                    )}
                  </h1>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
                  <p className="text-[var(--text-secondary)] md:text-white/90 font-bold drop-shadow-sm">{friendCount} followers</p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[var(--text-primary)] md:text-white text-xs font-bold border border-[var(--border-color)] md:border-white/20">
                      <Trophy className="w-3 h-3 text-yellow-400" />
                      <span>{targetProfile.level}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[var(--text-primary)] md:text-white text-xs font-bold border border-[var(--border-color)] md:border-white/20">
                      <Star className="w-3 h-3 text-yellow-400" />
                      <span>{targetProfile.points} Points</span>
                    </div>
                  </div>
                </div>

                {uploadSuccess && (
                  <div className="mt-2 text-emerald-500 font-bold text-sm animate-bounce">
                    {uploadSuccess}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pb-4 flex flex-wrap gap-2 justify-center md:justify-start">
                {canEdit && (
                  <>
                    <button 
                      onClick={() => {
                        if (isEditing) {
                          handleSave();
                        } else {
                          setEditedData(targetProfile || {});
                          setIsEditing(true);
                        }
                      }}
                      disabled={isUploadingPhoto}
                      className={cn(
                        "px-3 py-2 md:px-6 md:py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg text-xs md:text-base",
                        isEditing ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-input)] border border-[var(--border-color)]"
                      )}
                    >
                      {isEditing ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : <Edit3 className="w-4 h-4 md:w-5 md:h-5" />}
                      <span>{isEditing ? 'Save' : 'Edit Profile'}</span>
                    </button>
                    
                    {isOwnProfile && !profile?.isPremium && (
                      <button onClick={handleUpgradeProfile} className="bg-amber-500 text-white px-3 py-2 md:px-6 md:py-3 rounded-2xl font-bold hover:bg-amber-600 transition-all flex items-center gap-2 shadow-lg text-xs md:text-base">
                        <Zap className="w-4 h-4 md:w-5 md:h-5" />
                        <span>Upgrade</span>
                      </button>
                    )}
                    
                    {isOwnProfile && !profile?.isVerified && !profile?.isVerifiedPending && (
                      <button onClick={handleRequestVerification} className="bg-[#00a2ff] text-white px-3 py-2 md:px-6 md:py-3 rounded-2xl font-bold hover:bg-[#0088d6] transition-all flex items-center gap-2 shadow-lg text-xs md:text-base">
                        <ShieldCheck className="w-4 h-4 md:w-5 md:h-5" />
                        <span>Verify</span>
                      </button>
                    )}
                    
                    {isOwnProfile && (
                      <button onClick={handleMatch} disabled={isMatching} className="bg-rose-500 text-white px-3 py-2 md:px-6 md:py-3 rounded-2xl font-bold hover:bg-rose-600 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 text-xs md:text-base">
                        <Search className="w-4 h-4 md:w-5 md:h-5" />
                        <span>{isMatching ? 'Matching...' : 'Find Matches'}</span>
                      </button>
                    )}
                  </>
                )}
                {!isOwnProfile && (
                  <>
                    <button 
                      onClick={handleFollow}
                      className={cn(
                        "px-3 py-2 md:px-6 md:py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg text-xs md:text-base",
                        profile?.following?.includes(targetProfile.uid) 
                          ? "bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)]" 
                          : "bg-[#1877f2] text-white hover:bg-[#166fe5]"
                      )}
                    >
                      {profile?.following?.includes(targetProfile.uid) ? <UserMinus className="w-4 h-4 md:w-5 md:h-5" /> : <UserPlus className="w-4 h-4 md:w-5 md:h-5" />}
                      <span>{profile?.following?.includes(targetProfile.uid) ? 'Unfollow' : 'Follow'}</span>
                    </button>
                    <button 
                      onClick={() => openChat(targetProfile)}
                      className="bg-[#ff3366] text-white px-3 py-2 md:px-6 md:py-3 rounded-2xl font-bold hover:bg-[#e62e5c] transition-all flex items-center gap-2 shadow-lg shadow-[#ff3366]/20 text-xs md:text-base"
                    >
                      <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                      <span>Message</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 md:px-8 mt-6">
          <div className="flex border-t border-[var(--border-color)]">
            {(['posts', 'about', 'friends', 'photos', 'reels'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-5 font-bold text-sm capitalize transition-all relative",
                  activeTab === tab ? "text-[#ff3366]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-input)]"
                )}
              >
                {tab}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ff3366]" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 px-4 md:px-0">
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Intro */}
          <div className="bg-[var(--bg-card)] p-4 rounded-xl shadow-sm border border-[var(--border-color)] space-y-4 transition-colors duration-300">
            <h3 className="text-xl font-black text-[var(--text-primary)]">Intro</h3>
            {isEditing ? (
              <textarea
                value={editedData.bio || ''}
                onChange={(e) => setEditedData({...editedData, bio: e.target.value})}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl p-3 text-sm focus:outline-none h-24 resize-none"
                placeholder="Describe who you are"
              />
            ) : (
              <p className="text-center text-[var(--text-primary)] font-medium opacity-90">{targetProfile.bio || 'No bio yet'}</p>
            )}
            
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                  <MapPin className="w-5 h-5 opacity-70" />
                  <span className="text-sm">Lives in <span className="font-bold text-[var(--text-primary)]">{targetProfile.city}, {targetProfile.country}</span></span>
                </div>
                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                  <Globe className="w-5 h-5 opacity-70" />
                  <span className="text-sm">Nationality: <span className="font-bold text-[var(--text-primary)]">{targetProfile.nationality || 'Not specified'}</span></span>
                </div>
                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                  <Globe className="w-5 h-5 opacity-70" />
                  <span className="text-sm">From <span className="font-bold text-[var(--text-primary)]">{targetProfile.country || 'Unknown'}</span></span>
                </div>
                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                  <Briefcase className="w-5 h-5 opacity-70" />
                  <span className="text-sm">Works as <span className="font-bold text-[var(--text-primary)]">{targetProfile.occupation || 'Professional'}</span></span>
                </div>
                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                  <Heart className="w-5 h-5 opacity-70" />
                  <span className="text-sm"><span className="font-bold text-[var(--text-primary)]">{targetProfile.relationshipStatus || 'Single'}</span></span>
                </div>
                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                  <User className="w-5 h-5 opacity-70" />
                  <span className="text-sm"><span className="font-bold text-[var(--text-primary)]">{targetProfile.gender}</span> interested in <span className="font-bold text-[var(--text-primary)]">{targetProfile.interestedIn}</span></span>
                </div>
                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                  <Star className="w-5 h-5 opacity-70" />
                  <span className="text-sm"><span className="font-bold text-[var(--text-primary)]">{targetProfile.points}</span> Points earned</span>
                </div>
              </div>

              {isEditing && (
                <div className="pt-4 border-t border-[var(--border-color)] space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Nationality" value={editedData.nationality || ''} onChange={e => setEditedData({...editedData, nationality: e.target.value})} className="bg-[var(--bg-input)] text-[var(--text-primary)] p-2 rounded-lg text-xs border border-[var(--border-color)]" />
                    <select value={editedData.country || ''} onChange={e => setEditedData({...editedData, country: e.target.value})} className="bg-[var(--bg-input)] text-[var(--text-primary)] p-2 rounded-lg text-xs border border-[var(--border-color)]">
                      <option value="">Select Country</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="City" value={editedData.city || ''} onChange={e => setEditedData({...editedData, city: e.target.value})} className="bg-[var(--bg-input)] text-[var(--text-primary)] p-2 rounded-lg text-xs border border-[var(--border-color)]" />
                    <select value={editedData.gender || ''} onChange={e => setEditedData({...editedData, gender: e.target.value})} className="bg-[var(--bg-input)] text-[var(--text-primary)] p-2 rounded-lg text-xs border border-[var(--border-color)]">
                      <option value="">Gender</option>
                      {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={editedData.interestedIn || ''} onChange={e => setEditedData({...editedData, interestedIn: e.target.value})} className="bg-[var(--bg-input)] text-[var(--text-primary)] p-2 rounded-lg text-xs border border-[var(--border-color)]">
                      <option value="">Interested In</option>
                      {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <select value={editedData.relationshipStatus || ''} onChange={e => setEditedData({...editedData, relationshipStatus: e.target.value})} className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] p-2 rounded-lg text-xs border border-[var(--border-color)]">
                      {RELATIONSHIP_STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <input type="text" placeholder="Occupation" value={editedData.occupation || ''} onChange={e => setEditedData({...editedData, occupation: e.target.value})} className="bg-[var(--bg-input)] text-[var(--text-primary)] p-2 rounded-lg text-xs border border-[var(--border-color)]" />
                  </div>
                </div>
              )}
          </div>

          {/* Photos Preview */}
          <div className="bg-[var(--bg-card)] p-4 rounded-xl shadow-sm border border-[var(--border-color)] space-y-4 transition-colors duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-[var(--text-primary)]">Photos</h3>
              <button onClick={() => setActiveTab('photos')} className="text-[#1877f2] text-sm font-bold hover:underline">See all photos</button>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
              {(userPosts.filter(p => p.image).slice(0, 9)).map((p, i) => (
                <img key={i} src={p.image!} className="aspect-square object-cover w-full hover:opacity-90 cursor-pointer border border-[var(--border-color)]" />
              ))}
              {userPosts.filter(p => p.image).length === 0 && <p className="col-span-3 text-center py-8 text-[var(--text-secondary)] text-sm italic">No photos yet</p>}
            </div>
          </div>

          {/* Friends Preview */}
          <div className="bg-[var(--bg-card)] p-4 rounded-xl shadow-sm border border-[var(--border-color)] space-y-4 transition-colors duration-300">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-[var(--text-primary)]">Friends</h3>
                <p className="text-[var(--text-secondary)] text-sm font-bold">{friendCount} friends</p>
              </div>
              <button onClick={() => setActiveTab('friends')} className="text-[#1877f2] text-sm font-bold hover:underline">See all friends</button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {friends.map((friend, i) => (
                <div key={i} className="space-y-1">
                  <img src={friend.photos?.[0] || `https://picsum.photos/seed/${friend.uid}/100/100`} className="aspect-square object-cover w-full rounded-lg shadow-sm border border-[var(--border-color)]" />
                  <p className="text-[11px] font-bold text-[var(--text-primary)] truncate">{friend.name}</p>
                </div>
              ))}
              {friends.length === 0 && <p className="col-span-3 text-center py-8 text-[var(--text-secondary)] text-sm italic">No friends yet</p>}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">
          {activeTab === 'posts' && (
            <div className="space-y-6">
              {isOwnProfile && (
                <div className="bg-[var(--bg-card)] p-4 rounded-xl shadow-sm border border-[var(--border-color)] space-y-4 transition-colors duration-300">
                  <div className="flex gap-3">
                    <img src={profile?.photos?.[0]} className="w-10 h-10 rounded-full object-cover border border-[var(--border-color)]" />
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder={`What's on your mind, ${profile?.name}?`}
                      className="flex-1 bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl p-3 text-sm focus:outline-none h-20 resize-none"
                    />
                  </div>
                  
                  {mediaPreview && (
                    <div className="relative rounded-xl overflow-hidden border border-[var(--border-color)]">
                      {mediaType === 'image' ? (
                        <img src={mediaPreview} className="w-full max-h-60 object-cover" />
                      ) : (
                        <video src={mediaPreview} className="w-full max-h-60 object-cover" controls />
                      )}
                      <button 
                        onClick={() => { setPostMedia(null); setMediaPreview(null); setMediaType(null); }}
                        className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {uploadProgress !== null && (
                    <div className="w-full bg-[var(--bg-input)] h-1 rounded-full overflow-hidden">
                      <div className="bg-[#ff3366] h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-[var(--border-color)]">
                    <div className="flex gap-2">
                      <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--bg-input)] cursor-pointer text-[var(--text-secondary)] transition-colors">
                        <ImageIcon className="w-5 h-5 text-green-500" />
                        <span className="text-xs font-bold">Photo/Video</span>
                        <input type="file" accept="image/*,video/*" onChange={handlePostFileChange} className="hidden" />
                      </label>
                    </div>
                    <button
                      onClick={handleCreatePost}
                      disabled={isPosting || (!newPostContent.trim() && !postMedia)}
                      className="bg-[#ff3366] text-white px-6 py-1.5 rounded-lg font-bold hover:bg-[#e62e5c] transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>Post</span>
                    </button>
                  </div>
                </div>
              )}
              {userPosts.map(post => (
                <div key={post.id} className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden transition-colors duration-300">
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <img src={post.authorPhoto || `https://picsum.photos/seed/${post.userId}/100/100`} className="w-10 h-10 rounded-full object-cover border border-[var(--border-color)]" referrerPolicy="no-referrer" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-[var(--text-primary)]">{post.authorName}</p>
                          {post.isVerified && <BadgeCheck className="w-3 h-3 text-blue-500 fill-blue-500" />}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {formatDistanceToNow(new Date(post.createdAt))} ago
                        </p>
                      </div>
                    </div>
                    <p className="text-[var(--text-primary)] mb-4 opacity-90 whitespace-pre-wrap">{post.content}</p>
                    {post.image && <img src={post.image} className="w-full rounded-lg border border-[var(--border-color)] mb-4" referrerPolicy="no-referrer" />}
                    {post.video && (
                      <div className="w-full rounded-lg border border-[var(--border-color)] mb-4 overflow-hidden bg-black">
                        <video src={post.video} className="w-full max-h-[500px]" controls />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-6 pt-4 border-t border-[var(--border-color)] relative">
                      <div className="relative">
                        <button 
                          onMouseEnter={() => setShowEmojiPicker(post.id)}
                          onClick={() => handleLike(post.id)}
                          className={cn(
                            "flex items-center gap-2 transition-colors font-bold text-sm",
                            post.likes.some(l => l.userId === profile?.uid) ? "text-[#ff3366]" : "text-[var(--text-secondary)] hover:text-[#ff3366]"
                          )}
                        >
                          <Heart className={cn("w-4 h-4", post.likes.some(l => l.userId === profile?.uid) && "fill-current")} />
                          <span>{post.likes.length}</span>
                        </button>
                        
                        {showEmojiPicker === post.id && (
                          <div 
                            className="absolute bottom-full left-0 mb-2 bg-[var(--bg-card)] shadow-xl border border-[var(--border-color)] rounded-full p-2 flex gap-2 z-10 animate-in fade-in slide-in-from-bottom-2"
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

                      <button className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[#6c5ce7] transition-colors font-bold text-sm">
                        <MessageCircle className="w-4 h-4" />
                        <span>{post.comments.length}</span>
                      </button>

                      {profile?.uid !== post.userId && (
                        <button 
                          onClick={() => openChat(targetProfile!)}
                          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[#1877f2] transition-colors font-bold text-sm"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}

                      <button 
                        onClick={() => {
                          const url = `${window.location.origin}/profile/${post.userId}#post-${post.id}`;
                          navigator.clipboard.writeText(url);
                          alert("Post link copied to clipboard!");
                        }}
                        className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-bold text-sm"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Comments Section */}
                    <div className="mt-4 space-y-3">
                      {post.comments.slice(0, 3).map((comment, idx) => (
                        <div key={idx} className="flex gap-2 text-xs">
                          <div className="bg-[var(--bg-input)] rounded-xl p-2 flex-1">
                            <span className="font-bold text-[var(--text-primary)] mr-2">{comment.userName}</span>
                            <span className="text-[var(--text-secondary)]">{comment.comment}</span>
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex gap-2 items-center pt-2">
                        <img src={profile?.photos?.[0] || ''} className="w-6 h-6 rounded-lg object-cover border border-[var(--border-color)]" />
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={commentText[post.id] || ''}
                            onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                            placeholder="Write a comment..."
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg py-1.5 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10 focus:border-[#ff3366] text-xs placeholder:text-[var(--text-secondary)]"
                          />
                          <button 
                            onClick={() => handleComment(post.id)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#ff3366]"
                          >
                            <Send className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {userPosts.length === 0 && (
                <div className="bg-[var(--bg-card)] p-12 rounded-xl border border-dashed border-[var(--border-color)] text-center transition-colors duration-300">
                  <p className="text-[var(--text-secondary)] font-bold">No posts to show yet.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="bg-[var(--bg-card)] p-8 rounded-xl shadow-sm border border-[var(--border-color)] space-y-8 transition-colors duration-300">
              <h3 className="text-2xl font-black text-[var(--text-primary)]">About</h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h4 className="font-bold text-[var(--text-secondary)] uppercase text-xs tracking-widest">Overview</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-[var(--text-secondary)] opacity-70" />
                      <span className="text-[var(--text-secondary)]">Lives in <span className="font-bold text-[var(--text-primary)]">{targetProfile.location || 'Not specified'}</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-5 h-5 text-[var(--text-secondary)] opacity-70" />
                      <span className="text-[var(--text-secondary)]">Works as <span className="font-bold text-[var(--text-primary)]">{targetProfile.occupation || 'Professional'}</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Heart className="w-5 h-5 text-[var(--text-secondary)] opacity-70" />
                      <span className="text-[var(--text-secondary)]">Relationship: <span className="font-bold text-[var(--text-primary)]">{targetProfile.relationshipStatus || 'Single'}</span></span>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <h4 className="font-bold text-[var(--text-secondary)] uppercase text-xs tracking-widest">Interests</h4>
                  <div className="flex flex-wrap gap-2">
                    {targetProfile.interests?.map(i => (
                      <span key={i} className="px-3 py-1 bg-[var(--bg-input)] rounded-full text-xs font-bold text-[var(--text-secondary)] border border-[var(--border-color)]">{i}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'friends' && (
            <div className="bg-[var(--bg-card)] p-8 rounded-xl shadow-sm border border-[var(--border-color)] transition-colors duration-300">
              <h3 className="text-2xl font-black text-[var(--text-primary)] mb-6">{matchingUsers.length > 0 ? 'Matches' : 'Friends'}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(matchingUsers.length > 0 ? matchingUsers : friends).map((friend, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-input)] transition-all cursor-pointer">
                    <img src={friend.photos?.[0] || `https://picsum.photos/seed/${friend.uid}/100/100`} className="w-16 h-16 rounded-lg object-cover border border-[var(--border-color)]" />
                    <p className="font-bold text-[var(--text-primary)]">{friend.name}</p>
                  </div>
                ))}
              </div>
              {matchingUsers.length > 0 && (
                <button onClick={() => setMatchingUsers([])} className="mt-6 text-[var(--text-secondary)] text-sm font-bold hover:underline">Back to friends</button>
              )}
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="bg-[var(--bg-card)] p-8 rounded-xl shadow-sm border border-[var(--border-color)] transition-colors duration-300">
              <h3 className="text-2xl font-black text-[var(--text-primary)] mb-6">Photos</h3>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {userPosts.filter(p => p.image).map((post, i) => (
                  <img key={i} src={post.image!} className="aspect-square object-cover w-full rounded-lg hover:opacity-90 cursor-pointer border border-[var(--border-color)]" />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reels' && (
            <div className="bg-[var(--bg-card)] p-8 rounded-xl shadow-sm border border-[var(--border-color)] transition-colors duration-300">
              <h3 className="text-2xl font-black text-[var(--text-primary)] mb-6">Reels</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {userReels.map((reel, i) => (
                  <div key={i} className="relative aspect-[9/16] rounded-xl overflow-hidden group cursor-pointer border border-[var(--border-color)]">
                    <video src={reel.videoUrl} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-center justify-center">
                      <Play className="w-10 h-10 text-white fill-current opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
