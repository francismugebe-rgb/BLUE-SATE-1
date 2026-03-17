import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, addDoc, collection, query, where, getDocs, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserProfile, Post, Reel } from '../types';
import { User, MapPin, Briefcase, Ruler, Heart, Edit3, Camera, Check, UserPlus, UserMinus, ShieldCheck, BadgeCheck, Star, Trophy, Image as ImageIcon, Video, Grid, Users as UsersIcon, Info, Play, Globe, CreditCard, Zap, Search, MessageCircle, Hand, Sun, Moon } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { INTERESTS_LIST, RELATIONSHIP_STATUS_LIST, COUNTRIES, GENDERS } from '../constants';
import { cn, fileToBase64, validateFile } from '../lib/utils';
import { createTransaction } from '../services/pointService';
import { TransactionType } from '../types';

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

  const handleSave = async () => {
    if (!authUser || !targetProfile) return;
    try {
      await updateDoc(doc(db, 'users', targetProfile.uid), editedData);
      setIsEditing(false);
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

    const validation = validateFile(file, 'image');
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      const updateObj = type === 'profile' 
        ? { photos: [base64, ...(targetProfile.photos?.slice(1) || [])] }
        : { coverPhoto: base64 };
      
      await updateDoc(doc(db, 'users', targetProfile.uid), updateObj);
      
      if (isOwnProfile) {
        // Profile will update via onSnapshot in AuthContext
      } else {
        setTargetProfile({ ...targetProfile, ...updateObj });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetProfile.uid}`);
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

  if (loading) return <div className="flex items-center justify-center h-full">Loading profile...</div>;
  if (!targetProfile) return <div className="text-center py-20">Profile not found</div>;

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="bg-[var(--bg-card)] shadow-sm border-b border-[var(--border-color)] -mt-8 mb-8 transition-colors duration-300">
        {/* Header / Photos */}
        <div className="relative h-[350px] md:h-[450px] bg-[var(--bg-input)]">
          {/* Cover Photo */}
          <div className="absolute inset-0">
            <img 
              src={targetProfile.coverPhoto || `https://picsum.photos/seed/${targetProfile.uid}-cover/1200/400`} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>

          {canEdit && (
            <label className="absolute bottom-4 right-4 bg-[var(--bg-card)] px-4 py-2 rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-all flex items-center gap-2 font-bold cursor-pointer shadow-md border border-[var(--border-color)]">
              <Camera className="w-4 h-4" />
              <span className="text-sm">Edit Cover Photo</span>
              <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'cover')} className="hidden" />
            </label>
          )}

          {/* Profile Photo Area */}
          <div className="absolute -bottom-4 left-4 md:left-8 flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 w-full px-4">
            <div className="relative group">
              <img 
                src={targetProfile.photos?.[0] || `https://picsum.photos/seed/${targetProfile.uid}/400/400`} 
                className="w-40 h-40 md:w-44 md:h-44 rounded-full object-cover border-4 border-[var(--bg-card)] shadow-lg bg-[var(--bg-card)]"
                referrerPolicy="no-referrer"
              />
              {canEdit && (
                <label className="absolute bottom-2 right-2 bg-[var(--bg-input)] p-2 rounded-full text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all cursor-pointer shadow-md border border-[var(--border-color)]">
                  <Camera className="w-5 h-5" />
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'profile')} className="hidden" />
                </label>
              )}
            </div>
            
            <div className="mb-6 text-center md:text-left flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-black text-white drop-shadow-md flex items-center gap-2 justify-center md:justify-start">
                  {targetProfile.name}
                  {targetProfile.isVerified && (
                    <BadgeCheck className="w-6 h-6 md:w-8 md:h-8 text-[#00a2ff] fill-white" />
                  )}
                </h1>
              </div>
              <p className="text-white/90 font-bold mt-1 drop-shadow-sm">{friendCount} followers</p>
              <div className="flex items-center gap-2 mt-3 justify-center md:justify-start">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-white text-xs font-bold border border-white/20">
                  <Trophy className="w-3 h-3 text-yellow-400" />
                  <span>{targetProfile.level}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-white text-xs font-bold border border-white/20">
                  <Star className="w-3 h-3 text-yellow-400" />
                  <span>{targetProfile.points} Points</span>
                </div>
              </div>
            </div>

            <div className="mb-6 flex flex-wrap gap-2 justify-center md:justify-start">
              {canEdit && (
                <>
                  <button 
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    className={cn(
                      "px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 shadow-sm",
                      isEditing ? "bg-emerald-500 text-white" : "bg-[var(--bg-input)] text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-[var(--border-color)]"
                    )}
                  >
                    {isEditing ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                    <span>{isEditing ? 'Save' : 'Edit Profile'}</span>
                  </button>
                  {isOwnProfile && !profile?.isPremium && (
                    <button onClick={handleUpgradeProfile} className="bg-amber-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-amber-600 transition-all flex items-center gap-2 shadow-sm">
                      <Zap className="w-4 h-4" />
                      <span>Upgrade</span>
                    </button>
                  )}
                  {isOwnProfile && !profile?.isVerified && !profile?.isVerifiedPending && (
                    <button onClick={handleRequestVerification} className="bg-[#00a2ff] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#0088d6] transition-all flex items-center gap-2 shadow-sm">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify</span>
                    </button>
                  )}
                  {isOwnProfile && (
                    <button onClick={handleMatch} disabled={isMatching} className="bg-rose-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-rose-600 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50">
                      <Search className="w-4 h-4" />
                      <span>{isMatching ? 'Matching...' : 'Find Matches'}</span>
                    </button>
                  )}
                  {isOwnProfile && (
                    <button 
                      onClick={toggleTheme}
                      className="bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)] px-4 py-2 rounded-lg font-bold hover:bg-[var(--bg-input)] transition-all flex items-center gap-2 shadow-sm"
                    >
                      {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                      <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                    </button>
                  )}
                </>
              )}
              {!isOwnProfile && (
                <>
                  <button 
                    onClick={handleFollow}
                    className={cn(
                      "px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 shadow-sm",
                      profile?.following?.includes(targetProfile.uid) 
                        ? "bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)]" 
                        : "bg-[#1877f2] text-white hover:bg-[#166fe5]"
                    )}
                  >
                    {profile?.following?.includes(targetProfile.uid) ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    <span>{profile?.following?.includes(targetProfile.uid) ? 'Unfollow' : 'Follow'}</span>
                  </button>
                  <button 
                    onClick={() => openChat(targetProfile)}
                    className="bg-[#ff3366] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#e62e5c] transition-all flex items-center gap-2 shadow-sm shadow-[#ff3366]/20"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Message</span>
                  </button>
                  <button 
                    onClick={handleWave}
                    className="bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)] px-4 py-2 rounded-lg font-bold hover:bg-[var(--bg-input)] transition-all flex items-center gap-2 shadow-sm"
                  >
                    <Hand className="w-4 h-4 text-amber-500" />
                    <span>Wave</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 md:px-8 mt-4">
          <div className="flex border-t border-[var(--border-color)]">
            {(['posts', 'about', 'friends', 'photos', 'reels'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-4 font-bold text-sm capitalize transition-all relative",
                  activeTab === tab ? "text-[#1877f2]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-input)]"
                )}
              >
                {tab}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#1877f2]" />}
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
                <div className="bg-[var(--bg-card)] p-4 rounded-xl shadow-sm border border-[var(--border-color)] flex gap-3 transition-colors duration-300">
                  <img src={profile?.photos?.[0]} className="w-10 h-10 rounded-full object-cover border border-[var(--border-color)]" />
                  <button 
                    onClick={() => setActiveTab('posts')} // Or trigger post modal
                    className="flex-1 bg-[var(--bg-input)] hover:bg-[var(--bg-card)] rounded-full px-4 text-left text-[var(--text-secondary)] font-medium transition-colors"
                  >
                    What's on your mind, {profile?.name}?
                  </button>
                </div>
              )}
              {userPosts.map(post => (
                <div key={post.id} className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden transition-colors duration-300">
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <img src={post.authorPhoto} className="w-10 h-10 rounded-full object-cover border border-[var(--border-color)]" />
                      <div>
                        <p className="font-bold text-[var(--text-primary)]">{post.authorName}</p>
                        <p className="text-xs text-[var(--text-secondary)]">Just now</p>
                      </div>
                    </div>
                    <p className="text-[var(--text-primary)] mb-4 opacity-90">{post.content}</p>
                    {post.image && <img src={post.image} className="w-full rounded-lg border border-[var(--border-color)]" />}
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
