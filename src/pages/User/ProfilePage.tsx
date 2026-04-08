import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'motion/react';
import { User, MapPin, Calendar, Heart, Sparkles, Save, ArrowLeft, Zap, Camera, Image as ImageIcon, UserPlus, UserMinus, MessageCircle, UserCheck } from 'lucide-react';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, serverTimestamp, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import imageCompression from 'browser-image-compression';

const COUNTRIES_CITIES: Record<string, string[]> = {
  'Zimbabwe': ['Harare', 'Bulawayo', 'Chitungwiza', 'Mutare', 'Epworth', 'Gweru', 'Kwekwe', 'Kadoma', 'Masvingo', 'Chinhoyi'],
  'South Africa': ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein', 'East London', 'Sandton', 'Midrand', 'Randburg'],
  'Nigeria': ['Lagos', 'Kano', 'Ibadan', 'Benin City', 'Port Harcourt', 'Jos', 'Ilorin', 'Abuja', 'Kaduna', 'Enugu'],
  'Kenya': ['Nairobi', 'Mombasa', 'Nakuru', 'Kisumu', 'Eldoret', 'Kehancha', 'Ruiru', 'Kikuyu', 'Kangundo-Tala', 'Malindi'],
  'Ghana': ['Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Atsiaman', 'Tema', 'Teshi', 'Cape Coast', 'Sekondi', 'Obuasi']
};

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [targetUser, setTargetUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState<'photo' | 'cover' | null>(null);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'friends'>('none');
  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);
  const [previews, setPreviews] = useState<{ photo?: string, cover?: string }>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(
    location.state?.incomplete ? { type: 'warning', text: 'Please fill in your Name and Surname to continue using the app.' } : null
  );

  const isOwnProfile = !userId || userId === user?.uid;

  useEffect(() => {
    if (isOwnProfile) {
      setTargetUser(user);
      setLoading(false);
    } else {
      const fetchTargetUser = async () => {
        try {
          const docRef = doc(db, 'users', userId!);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setTargetUser({ uid: docSnap.id, ...docSnap.data() });
          } else {
            setMessage({ type: 'error', text: 'User not found' });
          }
        } catch (error) {
          console.error("Error fetching user:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchTargetUser();
    }
  }, [userId, user, isOwnProfile]);

  useEffect(() => {
    if (!user || isOwnProfile || !userId) return;

    // Check friend status
    const q = query(
      collection(db, 'friendRequests'),
      where('fromId', 'in', [user.uid, userId]),
      where('toId', 'in', [user.uid, userId])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        if (user.friends?.includes(userId)) {
          setFriendStatus('friends');
        } else {
          setFriendStatus('none');
        }
      } else {
        const request = snapshot.docs[0].data();
        if (request.status === 'accepted') {
          setFriendStatus('friends');
        } else {
          setFriendStatus('pending');
        }
      }
    });

    return () => unsubscribe();
  }, [user, userId, isOwnProfile]);

  const handleAddFriend = async () => {
    if (!user || !userId) return;
    try {
      await addDoc(collection(db, 'friendRequests'), {
        fromId: user.uid,
        toId: userId,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Add notification
      await addDoc(collection(db, 'notifications'), {
        userId: userId,
        type: 'friend_request',
        fromId: user.uid,
        fromName: user.displayName || user.email,
        text: `${user.displayName || user.email} sent you a friend request.`,
        link: `/profile/${user.uid}`,
        read: false,
        createdAt: serverTimestamp()
      });

      setMessage({ type: 'success', text: 'Friend request sent!' });
    } catch (error) {
      console.error("Error adding friend:", error);
    }
  };

  const handleFollow = async () => {
    if (!user || !userId) return;
    try {
      const myRef = doc(db, 'users', user.uid);
      const targetRef = doc(db, 'users', userId);

      await updateDoc(myRef, {
        following: arrayUnion(userId)
      });
      await updateDoc(targetRef, {
        followers: arrayUnion(user.uid)
      });

      setMessage({ type: 'success', text: `Following ${targetUser?.displayName}` });
    } catch (error) {
      console.error("Error following:", error);
    }
  };

  const handleMessage = async () => {
    if (!user || !userId) return;
    try {
      // Check if conversation exists
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', user.uid)
      );
      const snapshot = await getDocs(q);
      let existingConv = snapshot.docs.find(doc => doc.data().participants.includes(userId));

      if (existingConv) {
        navigate('/chat');
      } else {
        const newConv = await addDoc(collection(db, 'conversations'), {
          participants: [user.uid, userId],
          lastMessage: '',
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        navigate('/chat');
      }
    } catch (error) {
      console.error("Error messaging:", error);
    }
  };

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
    age: user?.age || 18,
    country: user?.location?.split(', ')[1] || '',
    city: user?.location?.split(', ')[0] || '',
    gender: user?.gender || '',
    lookingFor: user?.lookingFor || '',
    interests: user?.interests?.join(', ') || '',
    isDatingActive: user?.isDatingActive || false,
    phoneNumber: user?.phoneNumber || ''
  });

  useEffect(() => {
    if (targetUser && !hasInitialized.current) {
      setFormData({
        firstName: targetUser.firstName || '',
        lastName: targetUser.lastName || '',
        bio: targetUser.bio || '',
        age: targetUser.age || 18,
        country: targetUser.location?.split(', ')[1] || '',
        city: targetUser.location?.split(', ')[0] || '',
        gender: targetUser.gender || '',
        lookingFor: targetUser.lookingFor || '',
        interests: targetUser.interests?.join(', ') || '',
        isDatingActive: targetUser.isDatingActive || false,
        phoneNumber: targetUser.phoneNumber || ''
      });
      if (isOwnProfile) hasInitialized.current = true;
    }
  }, [targetUser, isOwnProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    if (!formData.firstName || !formData.lastName) {
      setMessage({ type: 'error', text: 'Name and Surname are required.' });
      setIsSaving(false);
      return;
    }

    if (formData.isDatingActive && (!formData.age || !formData.gender || !formData.country || !formData.city)) {
      setMessage({ type: 'error', text: 'Age, Gender, and Location are required for dating.' });
      setIsSaving(false);
      return;
    }

    try {
      await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        displayName: `${formData.firstName} ${formData.lastName}`,
        bio: formData.bio,
        age: Number(formData.age),
        location: formData.city && formData.country ? `${formData.city}, ${formData.country}` : '',
        gender: formData.gender,
        lookingFor: formData.lookingFor,
        interests: formData.interests.split(',').map(i => i.trim()).filter(i => i !== ''),
        isDatingActive: formData.isDatingActive,
        phoneNumber: formData.phoneNumber
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(type);
    setMessage(null);

    // Create local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews(prev => ({ ...prev, [type]: reader.result as string }));
    };
    reader.readAsDataURL(file);

    try {
      // 1. Compression if > 2MB (or always for optimization)
      let fileToUpload = file;
      if (file.size > 2 * 1024 * 1024) {
        const options = {
          maxSizeMB: 1.5, // Target less than 2MB
          maxWidthOrHeight: 1920,
          useWebWorker: true
        };
        fileToUpload = await imageCompression(file, options);
      }

      // 2. Upload to server
      const uploadData = new FormData();
      uploadData.append('file', fileToUpload);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData
      });

      if (!response.ok) throw new Error('Upload failed');

      const { url } = await response.json();

      // 3. Update profile
      await updateProfile({
        [type === 'photo' ? 'photoURL' : 'coverURL']: url
      });

      setMessage({ type: 'success', text: `${type === 'photo' ? 'Profile' : 'Cover'} photo updated!` });
      setPreviews(prev => {
        const next = { ...prev };
        delete next[type];
        return next;
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      setMessage({ type: 'error', text: error.message || 'Failed to upload photo' });
      setPreviews(prev => {
        const next = { ...prev };
        delete next[type];
        return next;
      });
    } finally {
      setIsUploading(null);
      if (e.target) e.target.value = '';
    }
  };

  const getTierColor = (tier?: string) => {
    switch(tier) {
      case 'bronze': return 'bg-orange-500';
      case 'gold': return 'bg-yellow-500';
      case 'platinum': return 'bg-slate-300';
      default: return 'bg-slate-500';
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-pink-500 transition-colors font-bold">
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>
          <div className="flex items-center gap-4">
            {isOwnProfile && (
              <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-black text-slate-900">{user?.points || 0} Points</span>
              </div>
            )}
            {isOwnProfile ? (
              !isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="bg-pink-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-pink-600 transition-all shadow-lg shadow-pink-500/20"
                >
                  Edit Profile
                </button>
              ) : (
                <button 
                  onClick={() => setIsEditing(false)}
                  className="bg-slate-100 text-slate-600 px-6 py-2 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
              )
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleMessage}
                  className="bg-white text-slate-600 p-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all shadow-sm"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleFollow}
                  className="bg-white text-slate-600 px-4 py-2 rounded-xl border border-slate-100 font-bold hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                >
                  {user?.following?.includes(userId!) ? <UserCheck className="w-4 h-4 text-green-500" /> : <UserPlus className="w-4 h-4" />}
                  {user?.following?.includes(userId!) ? 'Following' : 'Follow'}
                </button>
                <button 
                  onClick={handleAddFriend}
                  disabled={friendStatus !== 'none'}
                  className={`px-6 py-2 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 ${
                    friendStatus === 'friends' 
                      ? 'bg-green-500 text-white shadow-green-500/20' 
                      : friendStatus === 'pending'
                        ? 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed'
                        : 'bg-pink-500 text-white shadow-pink-500/20 hover:bg-pink-600'
                  }`}
                >
                  {friendStatus === 'friends' ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {friendStatus === 'friends' ? 'Friends' : friendStatus === 'pending' ? 'Request Sent' : 'Add Friend'}
                </button>
              </div>
            )}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
        >
          <div className="p-8 md:p-12">
            {message && (
              <div className={`mb-8 p-4 rounded-2xl font-bold text-sm ${
                message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 
                message.type === 'warning' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                'bg-red-50 text-red-600 border border-red-100'
              }`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Cover Photo Section */}
              <div className="relative h-48 md:h-64 bg-slate-100 rounded-[2rem] overflow-hidden group">
                {(previews.cover || targetUser?.coverURL) ? (
                  <img src={previews.cover || targetUser?.coverURL} alt="Cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
                {isEditing && (
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={!!isUploading}
                      className="bg-white/90 hover:bg-white text-slate-900 px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all"
                    >
                      {isUploading === 'cover' ? (
                        <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                      Change Cover
                    </button>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={coverInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e, 'cover')}
                />
              </div>

              {/* Profile Header */}
              <div className="flex flex-col md:flex-row items-center gap-8 pb-8 border-b border-slate-100 -mt-20 relative z-10 px-8">
                <div className="relative group">
                  <div className="w-40 h-40 bg-pink-50 rounded-[2.5rem] flex items-center justify-center overflow-hidden border-8 border-white shadow-xl relative">
                    {(previews.photo || targetUser?.photoURL) ? (
                      <img src={previews.photo || targetUser?.photoURL} alt={targetUser?.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-16 h-16 text-pink-300" />
                    )}
                    
                    {isEditing && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => profileInputRef.current?.click()}
                          disabled={!!isUploading}
                          className="text-white p-3 rounded-full hover:bg-white/20 transition-all"
                        >
                          {isUploading === 'photo' ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Camera className="w-6 h-6" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={profileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, 'photo')}
                  />
                  {targetUser?.isVerified && (
                    <div className="absolute bottom-2 right-2 w-10 h-10 bg-blue-500 rounded-xl shadow-md border-4 border-white flex items-center justify-center text-white">
                      <Sparkles className="w-5 h-5 fill-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center md:text-left pt-16 md:pt-0">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                    <h2 className="text-2xl font-black text-slate-900">
                      {isOwnProfile ? (formData.firstName || formData.lastName ? `${formData.firstName} ${formData.lastName}` : 'Set your name') : targetUser?.displayName}
                    </h2>
                    {targetUser?.proTier && targetUser.proTier !== 'none' && (
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest ${getTierColor(targetUser.proTier)}`}>
                        {targetUser.proTier}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 font-medium">{targetUser?.email}</p>
                  
                  <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-6">
                    <div className="text-center md:text-left">
                      <p className="text-lg font-black text-slate-900">{targetUser?.followers?.length || 0}</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Followers</p>
                    </div>
                    <div className="text-center md:text-left">
                      <p className="text-lg font-black text-slate-900">{targetUser?.following?.length || 0}</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Following</p>
                    </div>
                    <div className="text-center md:text-left">
                      <p className="text-lg font-black text-slate-900">{targetUser?.friends?.length || 0}</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Friends</p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-3">
                    <label className={`flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-600 rounded-xl transition-all ${isEditing ? 'cursor-pointer hover:bg-pink-100' : 'opacity-70'}`}>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        disabled={!isEditing}
                        checked={formData.isDatingActive}
                        onChange={(e) => setFormData({...formData, isDatingActive: e.target.checked})}
                      />
                      <Heart className={`w-4 h-4 ${formData.isDatingActive ? 'fill-pink-600' : ''}`} />
                      <span className="text-sm font-bold">{formData.isDatingActive ? 'Dating Active' : 'Activate Dating'}</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">First Name</label>
                  <input 
                    type="text"
                    required
                    disabled={!isEditing}
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium disabled:opacity-70"
                    placeholder="First Name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Surname</label>
                  <input 
                    type="text"
                    required
                    disabled={!isEditing}
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium disabled:opacity-70"
                    placeholder="Surname"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Country</label>
                  <select 
                    value={formData.country}
                    disabled={!isEditing}
                    onChange={(e) => setFormData({...formData, country: e.target.value, city: ''})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium appearance-none disabled:opacity-70"
                  >
                    <option value="">Select Country</option>
                    {Object.keys(COUNTRIES_CITIES).map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">City</label>
                  <select 
                    value={formData.city}
                    disabled={!formData.country || !isEditing}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium appearance-none disabled:opacity-50"
                  >
                    <option value="">Select City</option>
                    {formData.country && COUNTRIES_CITIES[formData.country].map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">WhatsApp Number</label>
                  <input 
                    type="text"
                    disabled={!isEditing}
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium disabled:opacity-70"
                    placeholder="+263..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Age</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="number"
                      disabled={!isEditing}
                      value={formData.age}
                      onChange={(e) => setFormData({...formData, age: Number(e.target.value)})}
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium disabled:opacity-70"
                      min="18"
                      max="100"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Gender</label>
                  <select 
                    value={formData.gender}
                    disabled={!isEditing}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium appearance-none disabled:opacity-70"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Interested In</label>
                  <select 
                    value={formData.lookingFor}
                    disabled={!isEditing}
                    onChange={(e) => setFormData({...formData, lookingFor: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium appearance-none disabled:opacity-70"
                  >
                    <option value="">Select Preference</option>
                    <option value="male">Men</option>
                    <option value="female">Women</option>
                    <option value="everyone">Everyone</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Bio</label>
                <textarea 
                  value={formData.bio}
                  disabled={!isEditing}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  rows={4}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium resize-none disabled:opacity-70"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Interests (comma separated)</label>
                <input 
                  type="text"
                  disabled={!isEditing}
                  value={formData.interests}
                  onChange={(e) => setFormData({...formData, interests: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium disabled:opacity-70"
                  placeholder="Hiking, Cooking, Travel..."
                />
              </div>

              {/* Pro Upgrade Section */}
              <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                  <h3 className="text-2xl font-black mb-6 flex items-center gap-2">
                    <Zap className="w-6 h-6 text-pink-500 fill-pink-500" />
                    Upgrade to Pro
                  </h3>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {[
                      { tier: 'bronze', price: '9.99', color: 'bg-orange-500' },
                      { tier: 'gold', price: '19.99', color: 'bg-yellow-500' },
                      { tier: 'platinum', price: '29.99', color: 'bg-slate-300 text-slate-900' },
                    ].map((plan) => (
                      <button
                        key={plan.tier}
                        type="button"
                        disabled={!isEditing}
                        onClick={() => updateProfile({ proTier: plan.tier as any })}
                        className={`p-6 rounded-3xl border border-white/10 hover:border-white/30 transition-all text-center group ${user?.proTier === plan.tier ? 'ring-2 ring-pink-500 bg-white/5' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <div className={`w-10 h-10 ${plan.color} rounded-xl mx-auto mb-4 flex items-center justify-center font-black text-xs uppercase`}>
                          {plan.tier[0]}
                        </div>
                        <div className="font-black uppercase tracking-widest text-[10px] mb-1">{plan.tier}</div>
                        <div className="text-xl font-black">${plan.price}</div>
                        <div className="text-[10px] font-bold opacity-60 mt-2 group-hover:opacity-100 transition-opacity">
                          {user?.proTier === plan.tier ? 'Current Plan' : 'Select Plan'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300 text-white font-bold py-4 rounded-2xl shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    {isSaving ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save Profile Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

