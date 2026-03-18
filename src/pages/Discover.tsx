import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, Info, MapPin, Star, MessageCircle, Sparkles } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { socialApi } from '../api';

const Discover: React.FC = () => {
  const { profile } = useAuth();
  const { openChat } = useChat();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMatchModal, setShowMatchModal] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!profile) return;
      setLoading(true);
      try {
        const targetGender = profile.gender === 'Male' ? 'Female' : (profile.gender === 'Female' ? 'Male' : '');
        const response = await fetch(`/api/users/match?gender=${targetGender}`);
        if (response.ok) {
          const data = await response.json();
          // Filter out already swiped (this should ideally be done on the backend)
          const swipedIds = [...(profile.likes || []), ...(profile.dislikes || [])];
          setUsers(data.filter((u: UserProfile) => !swipedIds.includes(u.uid)));
        }
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

    try {
      const response = await fetch(`/api/users/${targetUser.uid}/swipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ direction })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.isMatch) {
          setShowMatchModal(targetUser);
        }
      }
    } catch (err) {
      console.error("Error swiping:", err);
    }

    setCurrentIndex(prev => prev + 1);
  };

  if (loading) return <div className="flex items-center justify-center h-full text-[var(--text-primary)]">Loading profiles...</div>;

  if (currentIndex >= users.length && !showMatchModal) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="w-24 h-24 bg-[var(--bg-input)] rounded-full flex items-center justify-center mb-6">
          <Star className="w-12 h-12 text-[var(--text-secondary)]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">No more profiles!</h2>
        <p className="text-[var(--text-secondary)] max-w-xs">Check back later or try changing your preferences to find more people nearby.</p>
      </div>
    );
  }

  const currentUser = users[currentIndex];

  return (
    <div className="max-w-md mx-auto h-full flex flex-col relative">
      <AnimatePresence>
        {showMatchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, y: 100 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[var(--bg-card)] rounded-[3rem] p-10 text-center max-w-sm w-full relative overflow-hidden border border-[var(--border-color)]"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#ff3366] to-purple-600"></div>
              <Sparkles className="w-16 h-16 text-[#ff3366] mx-auto mb-6 animate-pulse" />
              <h2 className="text-4xl font-black text-[var(--text-primary)] mb-2 italic">It's a Match!</h2>
              <p className="text-[var(--text-secondary)] mb-8 font-medium">You and {showMatchModal.name} liked each other.</p>
              
              <div className="flex justify-center gap-4 mb-10">
                <div className="relative">
                  <img src={profile?.photos?.[0] || 'https://picsum.photos/seed/me/100/100'} className="w-24 h-24 rounded-full border-4 border-[var(--bg-card)] shadow-xl object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="relative -ml-6">
                  <img src={showMatchModal.photos?.[0] || 'https://picsum.photos/seed/them/100/100'} className="w-24 h-24 rounded-full border-4 border-[var(--bg-card)] shadow-xl object-cover" referrerPolicy="no-referrer" />
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => {
                    openChat(showMatchModal);
                    setShowMatchModal(null);
                  }}
                  className="w-full bg-[#ff3366] text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-[#ff3366]/30 hover:bg-[#e62e5c] transition-all flex items-center justify-center gap-3"
                >
                  <MessageCircle className="w-6 h-6" />
                  Send a Message
                </button>
                <button
                  onClick={() => setShowMatchModal(null)}
                  className="w-full py-4 text-[var(--text-secondary)] font-bold hover:text-[var(--text-primary)] transition-colors"
                >
                  Keep Discovering
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 relative mt-4">
        <AnimatePresence mode='wait'>
          <motion.div
            key={currentUser.uid}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="absolute inset-0 bg-[var(--bg-card)] rounded-[2.5rem] shadow-2xl overflow-hidden border border-[var(--border-color)]"
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
          className="w-16 h-16 bg-[var(--bg-card)] rounded-full shadow-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-red-500 hover:scale-110 transition-all border border-[var(--border-color)]"
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
