import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, addDoc, collection } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { User, MapPin, Briefcase, Ruler, Heart, Edit3, Camera, Check, UserPlus, UserMinus, ShieldCheck, BadgeCheck, Star, Trophy, Image as ImageIcon } from 'lucide-react';
import { INTERESTS_LIST, RELATIONSHIP_STATUS_LIST } from '../constants';
import { cn } from '../lib/utils';

const Profile: React.FC = () => {
  const { id } = useParams();
  const { profile, user: authUser, isAdmin } = useAuth();
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editedData, setEditedData] = useState<Partial<UserProfile>>({});

  const isOwnProfile = !id || id === authUser?.uid;
  const canEdit = isOwnProfile || isAdmin;

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
      } else {
        await updateDoc(myRef, {
          following: arrayUnion(targetProfile.uid)
        });
        await updateDoc(theirRef, {
          followers: arrayUnion(profile.uid)
        });

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

  if (loading) return <div className="flex items-center justify-center h-full">Loading profile...</div>;
  if (!targetProfile) return <div className="text-center py-20">Profile not found</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        {/* Header / Photos */}
        <div className="relative h-96 bg-slate-100">
          {/* Cover Photo */}
          <div className="absolute inset-0">
            <img 
              src={targetProfile.coverPhoto || `https://picsum.photos/seed/${targetProfile.uid}-cover/1200/400`} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>

          {canEdit && (
            <button 
              onClick={() => handlePhotoChange('cover')}
              className="absolute top-6 right-6 bg-white/20 backdrop-blur-md p-3 rounded-xl text-white hover:bg-white/40 transition-all flex items-center gap-2 font-bold border border-white/30"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="text-sm">Change Cover</span>
            </button>
          )}

          {/* Profile Photo */}
          <div className="absolute -bottom-16 left-12 flex items-end gap-6">
            <div className="relative group">
              <img 
                src={targetProfile.photos?.[0] || `https://picsum.photos/seed/${targetProfile.uid}/400/400`} 
                className="w-40 h-40 rounded-[2.5rem] object-cover border-8 border-white shadow-2xl"
                referrerPolicy="no-referrer"
              />
              {canEdit && (
                <button 
                  onClick={() => handlePhotoChange('profile')}
                  className="absolute inset-0 bg-black/40 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                >
                  <Camera className="w-8 h-8" />
                </button>
              )}
            </div>
            
            <div className="mb-4 pb-2">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black text-white drop-shadow-md">{targetProfile.name}, {targetProfile.age || 25}</h1>
                {targetProfile.isVerified && (
                  <BadgeCheck className="w-8 h-8 text-[#00a2ff] fill-white drop-shadow-md" />
                )}
              </div>
              <div className="flex items-center gap-4 mt-2">
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
          </div>
        </div>

        <div className="p-8 md:p-12 pt-24 relative">
          {/* Profile Info */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-12">
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-slate-500 font-bold">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{targetProfile.location || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4" />
                  <span>{targetProfile.occupation || 'Professional'}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              {canEdit && (
                <button 
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                  className={cn(
                    "px-6 py-4 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg",
                    isEditing ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-slate-900 text-white shadow-slate-900/20 hover:bg-slate-800"
                  )}
                >
                  {isEditing ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Save Changes</span>
                    </>
                  ) : (
                    <>
                      {isAdmin && !isOwnProfile && <ShieldCheck className="w-5 h-5 text-yellow-400" />}
                      <Edit3 className="w-5 h-5" />
                      <span>{isAdmin && !isOwnProfile ? 'Admin Edit' : 'Edit Profile'}</span>
                    </>
                  )}
                </button>
              )}
              
              {!isOwnProfile && (
                <>
                  <button 
                    onClick={handleFollow}
                    className={cn(
                      "px-8 py-4 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg",
                      profile?.following?.includes(targetProfile.uid) 
                        ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
                        : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20"
                    )}
                  >
                    {profile?.following?.includes(targetProfile.uid) ? (
                      <>
                        <UserMinus className="w-5 h-5" />
                        <span>Unfollow</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                  <button className="bg-[#ff3366] text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-[#ff3366]/20 hover:bg-[#e62e5c] transition-all flex items-center gap-2">
                    <Heart className="w-5 h-5 fill-current" />
                    <span>Like</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-[2fr_1fr] gap-12">
            <div className="space-y-10">
              {/* Bio */}
              <section>
                <h3 className="text-xl font-bold text-slate-900 mb-4">About Me</h3>
                {isEditing ? (
                  <div className="space-y-4">
                    <textarea
                      value={editedData.bio || ''}
                      onChange={(e) => setEditedData({...editedData, bio: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10 focus:border-[#ff3366] h-32 resize-none"
                      placeholder="Tell people about yourself..."
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Name</label>
                        <input
                          type="text"
                          value={editedData.name || ''}
                          onChange={(e) => setEditedData({...editedData, name: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10 focus:border-[#ff3366]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Age</label>
                        <input
                          type="number"
                          value={editedData.age || ''}
                          onChange={(e) => setEditedData({...editedData, age: parseInt(e.target.value)})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10 focus:border-[#ff3366]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Location</label>
                        <input
                          type="text"
                          value={editedData.location || ''}
                          onChange={(e) => setEditedData({...editedData, location: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10 focus:border-[#ff3366]"
                          placeholder="City, Country"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Occupation</label>
                        <input
                          type="text"
                          value={editedData.occupation || ''}
                          onChange={(e) => setEditedData({...editedData, occupation: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10 focus:border-[#ff3366]"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-600 leading-relaxed text-lg">
                    {targetProfile.bio || "No bio added yet. Tell people about yourself!"}
                  </p>
                )}
              </section>

              {/* Interests */}
              <section>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Interests</h3>
                <div className="flex flex-wrap gap-3">
                  {isEditing ? (
                    INTERESTS_LIST.map(interest => (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={cn(
                          "px-4 py-2 rounded-xl font-bold text-sm border transition-all",
                          (editedData.interests || targetProfile.interests || []).includes(interest)
                            ? "bg-[#ff3366] text-white border-[#ff3366]"
                            : "bg-slate-50 text-slate-600 border-slate-100 hover:border-[#ff3366]/30"
                        )}
                      >
                        {interest}
                      </button>
                    ))
                  ) : (
                    (targetProfile.interests || ['Travel', 'Music', 'Cooking', 'Art']).map(interest => (
                      <span key={interest} className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-bold text-sm border border-slate-100">
                        {interest}
                      </span>
                    ))
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-8">
              {/* Details Card */}
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-6">
                <h4 className="font-bold text-slate-900">Basic Info</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                      <User className="w-4 h-4" />
                      <span>Gender</span>
                    </div>
                    {isEditing ? (
                      <select
                        value={editedData.gender || ''}
                        onChange={(e) => setEditedData({...editedData, gender: e.target.value})}
                        className="bg-white border border-slate-200 rounded-lg p-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10"
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      <span className="font-bold text-slate-900">{targetProfile.gender || 'Not set'}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                      <Ruler className="w-4 h-4" />
                      <span>Height</span>
                    </div>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedData.height || ''}
                        onChange={(e) => setEditedData({...editedData, height: parseInt(e.target.value)})}
                        className="w-20 bg-white border border-slate-200 rounded-lg p-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10"
                        placeholder="cm"
                      />
                    ) : (
                      <span className="font-bold text-slate-900">{targetProfile.height ? `${targetProfile.height}cm` : 'Not set'}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                      <Heart className="w-4 h-4" />
                      <span>Status</span>
                    </div>
                    {isEditing ? (
                      <select
                        value={editedData.relationshipStatus || ''}
                        onChange={(e) => setEditedData({...editedData, relationshipStatus: e.target.value})}
                        className="bg-white border border-slate-200 rounded-lg p-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10"
                      >
                        <option value="">Select</option>
                        {RELATIONSHIP_STATUS_LIST.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-bold text-slate-900 text-right">{targetProfile.relationshipStatus || 'Not set'}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                      <Heart className="w-4 h-4" />
                      <span>Preference</span>
                    </div>
                    {isEditing ? (
                      <select
                        value={editedData.relationshipPreference || ''}
                        onChange={(e) => setEditedData({...editedData, relationshipPreference: e.target.value})}
                        className="bg-white border border-slate-200 rounded-lg p-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10"
                      >
                        <option value="">Select</option>
                        <option value="Men">Men</option>
                        <option value="Women">Women</option>
                        <option value="Everyone">Everyone</option>
                      </select>
                    ) : (
                      <span className="font-bold text-slate-900 text-right">{targetProfile.relationshipPreference || 'Not set'}</span>
                    )}
                    {isAdmin && (
                      <div className="pt-4 border-t border-slate-200 mt-4 space-y-4">
                        <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest">Admin Controls</h5>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-700">Verified Account</span>
                          <button 
                            onClick={() => setEditedData({ ...editedData, isVerified: !editedData.isVerified })}
                            className={cn(
                              "w-12 h-6 rounded-full transition-all relative",
                              (editedData.isVerified ?? targetProfile.isVerified) ? "bg-blue-500" : "bg-slate-300"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                              (editedData.isVerified ?? targetProfile.isVerified) ? "left-7" : "left-1"
                            )} />
                          </button>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700">User Level</label>
                          <select
                            value={editedData.level || targetProfile.level}
                            onChange={(e) => setEditedData({...editedData, level: e.target.value as any})}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2 text-sm font-bold"
                          >
                            <option value="Bronze">Bronze</option>
                            <option value="Gold">Gold</option>
                            <option value="Platinum">Platinum</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700">Points</label>
                          <input
                            type="number"
                            value={editedData.points ?? targetProfile.points}
                            onChange={(e) => setEditedData({...editedData, points: parseInt(e.target.value)})}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2 text-sm font-bold"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
