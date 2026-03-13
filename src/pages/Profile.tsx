import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { User, MapPin, Briefcase, Ruler, Heart, Edit3, Camera, Check } from 'lucide-react';
import { cn } from '../lib/utils';

const Profile: React.FC = () => {
  const { id } = useParams();
  const { profile, user: authUser } = useAuth();
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editedData, setEditedData] = useState<Partial<UserProfile>>({});

  const isOwnProfile = !id || id === authUser?.uid;

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
    if (!authUser) return;
    try {
      await updateDoc(doc(db, 'users', authUser.uid), editedData);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full">Loading profile...</div>;
  if (!targetProfile) return <div className="text-center py-20">Profile not found</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        {/* Header / Photos */}
        <div className="relative h-96 bg-slate-100">
          <img 
            src={targetProfile.photos?.[0] || `https://picsum.photos/seed/${targetProfile.uid}/800/600`} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          {isOwnProfile && (
            <button className="absolute bottom-6 right-6 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg text-slate-700 hover:bg-white transition-all flex items-center gap-2 font-bold">
              <Camera className="w-5 h-5" />
              <span>Change Photo</span>
            </button>
          )}
        </div>

        <div className="p-8 md:p-12 relative">
          {/* Profile Info */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-12">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <h1 className="text-4xl font-extrabold text-slate-900">{targetProfile.name}, {targetProfile.age || 25}</h1>
                {isOwnProfile && (
                  <button 
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    className={cn(
                      "p-3 rounded-xl transition-all",
                      isEditing ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-400 hover:text-[#ff3366]"
                    )}
                  >
                    {isEditing ? <Check className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4 text-slate-500 font-medium">
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
            
            {!isOwnProfile && (
              <button className="bg-[#ff3366] text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-[#ff3366]/20 hover:bg-[#e62e5c] transition-all flex items-center gap-2">
                <Heart className="w-5 h-5 fill-current" />
                <span>Like Profile</span>
              </button>
            )}
          </div>

          <div className="grid md:grid-cols-[2fr_1fr] gap-12">
            <div className="space-y-10">
              {/* Bio */}
              <section>
                <h3 className="text-xl font-bold text-slate-900 mb-4">About Me</h3>
                {isEditing ? (
                  <textarea
                    value={editedData.bio || ''}
                    onChange={(e) => setEditedData({...editedData, bio: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10 focus:border-[#ff3366] h-32 resize-none"
                  />
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
                  {(targetProfile.interests || ['Travel', 'Music', 'Cooking', 'Art']).map(interest => (
                    <span key={interest} className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-bold text-sm border border-slate-100">
                      {interest}
                    </span>
                  ))}
                  {isOwnProfile && (
                    <button className="px-4 py-2 bg-[#ff3366]/5 text-[#ff3366] rounded-xl font-bold text-sm border border-[#ff3366]/10 hover:bg-[#ff3366]/10 transition-all">
                      + Add More
                    </button>
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
                    <span className="font-bold text-slate-900">{targetProfile.gender || 'Not set'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                      <Ruler className="w-4 h-4" />
                      <span>Height</span>
                    </div>
                    <span className="font-bold text-slate-900">{targetProfile.height ? `${targetProfile.height}cm` : 'Not set'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                      <Heart className="w-4 h-4" />
                      <span>Preference</span>
                    </div>
                    <span className="font-bold text-slate-900 text-right">{targetProfile.relationshipPreference || 'Not set'}</span>
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
