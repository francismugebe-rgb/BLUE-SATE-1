import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { Heart, X, MapPin, Info, Sparkles, MessageCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import LoadingScreen from '../../components/LoadingScreen';

interface DatingProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  age: number;
  bio: string;
  location: string;
  gender: string;
  lookingFor: string;
  interests: string[];
  isDatingActive: boolean;
  isVerified?: boolean;
  proTier?: 'none' | 'bronze' | 'gold' | 'platinum';
  phoneNumber?: string;
}

const DatingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<DatingProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [match, setMatch] = useState<DatingProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchProfiles = async () => {
      try {
        const q = query(
          collection(db, 'users'), 
          where('isDatingActive', '==', true),
          where('uid', '!=', user.uid)
        );
        const snapshot = await getDocs(q);
        const profilesData = snapshot.docs.map(doc => doc.data() as DatingProfile);
        setProfiles(profilesData);
      } catch (error) {
        console.error("Error fetching profiles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [user]);

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!user || currentIndex >= profiles.length) return;

    const targetProfile = profiles[currentIndex];
    
    if (direction === 'right') {
      try {
        const myRef = doc(db, 'users', user.uid);
        await updateDoc(myRef, {
          likedUsers: arrayUnion(targetProfile.uid)
        });

        const targetRef = doc(db, 'users', targetProfile.uid);
        const targetSnap = await getDoc(targetRef);
        const targetData = targetSnap.data();
        
        if (targetData?.likedUsers?.includes(user.uid)) {
          setMatch(targetProfile);
          await addDoc(collection(db, 'conversations'), {
            participants: [user.uid, targetProfile.uid],
            lastMessage: "You matched! Say hello.",
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp()
          });
        }
      } catch (error) {
        console.error("Error swiping:", error);
      }
    }

    setCurrentIndex(prev => prev + 1);
  };

  const handleWhatsAppChat = (phoneNumber?: string) => {
    if (phoneNumber) {
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanNumber}`, '_blank');
    } else {
      alert("This user hasn't provided a WhatsApp number yet.");
    }
  };

  if (loading) return <LoadingScreen />;

  if (!user?.isDatingActive || !user?.age || !user?.gender || !user?.location) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[3rem] p-12 text-center shadow-xl border border-slate-100">
          <div className="w-20 h-20 bg-pink-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
            <Heart className="w-10 h-10 text-pink-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4">Complete Dating Profile</h2>
          <p className="text-slate-500 font-medium mb-8">
            To start matching, you need to provide your age, gender, and location in your profile.
          </p>
          <Link 
            to="/profile" 
            className="block w-full bg-pink-500 text-white py-4 rounded-2xl font-bold hover:bg-pink-600 transition-all shadow-lg shadow-pink-500/20"
          >
            Go to Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4 overflow-hidden">
      <div className="max-w-md mx-auto relative h-[70vh]">
        <AnimatePresence>
          {currentIndex < profiles.length ? (
            profiles.slice(currentIndex, currentIndex + 2).reverse().map((profile, i) => (
              <SwipeCard 
                key={profile.uid}
                profile={profile}
                onSwipe={handleSwipe}
                isTop={i === 1 || profiles.length - currentIndex === 1}
              />
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">No more profiles</h3>
              <p className="text-slate-500 font-medium">Check back later for new matches in your area!</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Match Modal */}
      <AnimatePresence>
        {match && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-sm w-full text-center"
            >
              <div className="relative mb-12 flex justify-center">
                <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden -mr-4 relative z-10 shadow-2xl">
                  <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden -ml-4 shadow-2xl">
                  <img src={match.photoURL} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-pink-500 p-4 rounded-full shadow-xl z-20">
                  <Heart className="w-8 h-8 text-white fill-white" />
                </div>
              </div>
              
              <h2 className="text-5xl font-black text-white mb-4">It's a Match!</h2>
              <p className="text-white/80 text-lg font-medium mb-12">
                You and {match.displayName} have liked each other.
              </p>

              <div className="space-y-4">
                <button 
                  onClick={() => handleWhatsAppChat(match.phoneNumber)}
                  className="w-full bg-green-500 text-white py-5 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 hover:bg-green-600 transition-all shadow-xl shadow-green-500/20"
                >
                  <MessageCircle className="w-6 h-6" />
                  Chat on WhatsApp
                </button>
                <button 
                  onClick={() => navigate('/chat')}
                  className="w-full bg-white text-slate-900 py-5 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-all"
                >
                  <Sparkles className="w-6 h-6" />
                  In-App Chat
                </button>
                <button 
                  onClick={() => setMatch(null)}
                  className="w-full bg-transparent text-white/60 py-4 rounded-2xl font-bold hover:text-white transition-all"
                >
                  Keep Swiping
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SwipeCard: React.FC<{ profile: DatingProfile, onSwipe: (dir: 'left' | 'right') => void, isTop: boolean }> = ({ profile, onSwipe, isTop }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const likeOpacity = useTransform(x, [50, 150], [0, 1]);
  const nopeOpacity = useTransform(x, [-50, -150], [0, 1]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) {
      onSwipe('right');
    } else if (info.offset.x < -100) {
      onSwipe('left');
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

  return (
    <motion.div
      style={{ x, rotate, opacity, zIndex: isTop ? 10 : 0 }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-slate-100 cursor-grab active:cursor-grabbing"
    >
      <img 
        src={profile.photoURL} 
        alt={profile.displayName} 
        className="w-full h-full object-cover pointer-events-none"
        referrerPolicy="no-referrer"
      />
      
      {/* Swipe Indicators */}
      <motion.div style={{ opacity: likeOpacity }} className="absolute top-10 left-10 border-4 border-green-500 text-green-500 px-4 py-2 rounded-xl font-black text-4xl rotate-[-20deg] uppercase">
        LIKE
      </motion.div>
      <motion.div style={{ opacity: nopeOpacity }} className="absolute top-10 right-10 border-4 border-red-500 text-red-500 px-4 py-2 rounded-xl font-black text-4xl rotate-[20deg] uppercase">
        NOPE
      </motion.div>

      {/* Pro Badge */}
      {profile.proTier && profile.proTier !== 'none' && (
        <div className={`absolute top-6 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest shadow-lg ${getTierColor(profile.proTier)}`}>
          {profile.proTier} member
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
      
      <div className="absolute bottom-0 left-0 right-0 p-8 text-white pointer-events-none">
        <div className="flex items-end gap-3 mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-4xl font-black">{profile.displayName}, {profile.age}</h2>
            {profile.isVerified && <Sparkles className="w-6 h-6 text-blue-400 fill-blue-400" />}
          </div>
          <div className="bg-green-500 w-3 h-3 rounded-full mb-2" />
        </div>
        <div className="flex items-center gap-2 text-white/80 font-bold mb-4">
          <MapPin className="w-4 h-4" />
          {profile.location}
        </div>
        <p className="text-white/90 font-medium line-clamp-2 mb-6">
          {profile.bio}
        </p>
        <div className="flex flex-wrap gap-2">
          {profile.interests.slice(0, 3).map((interest, i) => (
            <span key={i} className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              {interest}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default DatingPage;
