import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useDispatch } from 'react-redux';
import { setUser } from '../store/slices/authSlice';
import { motion } from 'framer-motion';
import { Camera, Heart, Sparkles } from 'lucide-react';

interface ProfileSetupProps {
  user: any;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ user }) => {
  const dispatch = useDispatch();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: user.displayName || '',
    age: '',
    gender: '',
    bio: '',
    interests: [] as string[],
    photoURL: user.photoURL || ''
  });

  const interestsList = ['Travel', 'Music', 'Art', 'Tech', 'Cooking', 'Fitness', 'Gaming', 'Movies', 'Nature', 'Photography'];

  const handleToggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleSubmit = async () => {
    const profileData = {
      ...formData,
      uid: user.uid,
      email: user.email,
      createdAt: new Date().toISOString(),
      verificationStatus: 'pending',
      swipes: []
    };

    await setDoc(doc(db, 'users', user.uid), profileData);
    dispatch(setUser({ ...user, ...profileData }));
  };

  return (
    <div className="min-h-screen bg-blue-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full glass rounded-[2.5rem] p-8 space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-sky-500 rounded-xl flex items-center justify-center">
              <Sparkles className="text-white w-6 h-6" />
            </div>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Create Profile</h2>
          <p className="text-blue-400">Step {step} of 3</p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-sky-500/30 group-hover:border-sky-500 transition-colors">
                  <img src={formData.photoURL || `https://picsum.photos/seed/${user.uid}/200/200`} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-sky-500 rounded-full text-white shadow-lg">
                  <Camera className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Full Name"
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus:outline-none focus:border-sky-500/50"
              />
              <input 
                type="number" 
                placeholder="Age"
                value={formData.age}
                onChange={e => setFormData({ ...formData, age: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus:outline-none focus:border-sky-500/50"
              />
              <select 
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus:outline-none focus:border-sky-500/50 appearance-none"
              >
                <option value="" disabled>Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button 
              onClick={() => setStep(2)}
              className="w-full py-4 bg-sky-500 text-white rounded-2xl font-bold hover:bg-sky-600 transition-colors"
            >
              Next Step
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h3 className="font-bold text-lg">Pick your interests</h3>
            <div className="flex flex-wrap gap-2">
              {interestsList.map(interest => (
                <button
                  key={interest}
                  onClick={() => handleToggleInterest(interest)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    formData.interests.includes(interest)
                      ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                      : 'bg-white/5 text-blue-400 hover:bg-white/10'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="flex-1 py-4 glass rounded-2xl font-bold">Back</button>
              <button onClick={() => setStep(3)} className="flex-1 py-4 bg-sky-500 text-white rounded-2xl font-bold">Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h3 className="font-bold text-lg">Tell us about yourself</h3>
            <textarea 
              placeholder="Write a short bio..."
              value={formData.bio}
              onChange={e => setFormData({ ...formData, bio: e.target.value })}
              className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus:outline-none focus:border-sky-500/50 resize-none"
            />
            <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="flex-1 py-4 glass rounded-2xl font-bold">Back</button>
              <button onClick={handleSubmit} className="flex-1 py-4 bg-sky-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2">
                Complete <Heart className="w-5 h-5 fill-current" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
