import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, Info, MapPin, Star } from 'lucide-react';

const Discover: React.FC = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!profile) return;
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        // In a real app, we'd filter by distance and preferences
        // For now, just get all users except current and those already swiped
        const q = query(usersRef, where('uid', '!=', profile.uid));
        const querySnapshot = await getDocs(q);
        
        const swipedIds = [...(profile.likes || []), ...(profile.dislikes || [])];
        const filteredUsers = querySnapshot.docs
          .map(doc => doc.data() as UserProfile)
          .filter(u => !swipedIds.includes(u.uid));
        
        setUsers(filteredUsers);
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [profile]);

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!profile || users.length === 0) return;
    
    const targetUser = users[currentIndex];
    const userRef = doc(db, 'users', profile.uid);

    if (direction === 'right') {
      await updateDoc(userRef, {
        likes: arrayUnion(targetUser.uid)
      });

      // Check for match
      if (targetUser.likes?.includes(profile.uid)) {
        // It's a match!
        await updateDoc(userRef, { matches: arrayUnion(targetUser.uid) });
        await updateDoc(doc(db, 'users', targetUser.uid), { matches: arrayUnion(profile.uid) });
        
        // Create notification
        await addDoc(collection(db, 'notifications'), {
          receiverId: targetUser.uid,
          senderId: profile.uid,
          senderName: profile.name,
          type: 'match',
          read: false,
          createdAt: new Date().toISOString()
        });
        
        alert(`It's a match with ${targetUser.name}!`);
      }
    } else {
      await updateDoc(userRef, {
        dislikes: arrayUnion(targetUser.uid)
      });
    }

    setCurrentIndex(prev => prev + 1);
  };

  if (loading) return <div className="flex items-center justify-center h-full">Loading profiles...</div>;

  if (currentIndex >= users.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <Star className="w-12 h-12 text-slate-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">No more profiles!</h2>
        <p className="text-slate-500 max-w-xs">Check back later or try changing your preferences to find more people nearby.</p>
      </div>
    );
  }

  const currentUser = users[currentIndex];

  return (
    <div className="max-w-md mx-auto h-full flex flex-col">
      <div className="flex-1 relative mt-4">
        <AnimatePresence mode='wait'>
          <motion.div
            key={currentUser.uid}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="absolute inset-0 bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
          >
            <img 
              src={currentUser.photos?.[0] || `https://picsum.photos/seed/${currentUser.uid}/600/800`} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <h2 className="text-4xl font-bold">{currentUser.name}, {currentUser.age || 25}</h2>
                  <div className="flex items-center gap-1 text-white/80 mt-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium">{currentUser.location || 'Nearby'}</span>
                  </div>
                </div>
                <button className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-all">
                  <Info className="w-6 h-6" />
                </button>
              </div>
              
              <p className="text-white/90 line-clamp-2 mb-6">
                {currentUser.bio || "No bio provided yet."}
              </p>
              
              <div className="flex gap-2 flex-wrap">
                {currentUser.interests?.slice(0, 3).map(interest => (
                  <span key={interest} className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-6 py-8">
        <button 
          onClick={() => handleSwipe('left')}
          className="w-16 h-16 bg-white rounded-full shadow-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:scale-110 transition-all border border-slate-100"
        >
          <X className="w-8 h-8" />
        </button>
        <button 
          onClick={() => handleSwipe('right')}
          className="w-20 h-20 bg-[#ff3366] rounded-full shadow-2xl shadow-[#ff3366]/40 flex items-center justify-center text-white hover:scale-110 transition-all"
        >
          <Heart className="w-10 h-10 fill-current" />
        </button>
      </div>
    </div>
  );
};

export default Discover;
