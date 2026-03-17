import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { Heart, MessageCircle, User, MapPin, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Matches: React.FC = () => {
  const { profile } = useAuth();
  const [matches, setMatches] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile) return;
    
    const fetchMatches = async () => {
      setLoading(true);
      try {
        const matchIds = profile.matches || [];
        const matchData = await Promise.all(matchIds.map(async (id) => {
          const snap = await getDoc(doc(db, 'users', id));
          return { uid: snap.id, ...snap.data() } as UserProfile;
        }));
        setMatches(matchData);
      } catch (err) {
        console.error("Error fetching matches:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [profile]);

  if (loading) return <div className="flex items-center justify-center h-full">Loading matches...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-[#ff3366]/10 rounded-2xl flex items-center justify-center">
          <Heart className="text-[#ff3366] w-6 h-6 fill-current" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">Your Matches</h2>
          <p className="text-[var(--text-secondary)] font-medium">You have {matches.length} mutual connections</p>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-[2.5rem] p-12 text-center border border-[var(--border-color)] shadow-sm transition-colors duration-300">
          <div className="w-20 h-20 bg-[var(--bg-input)] rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-[var(--text-secondary)] opacity-20" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">No matches yet</h3>
          <p className="text-[var(--text-secondary)] mb-8 max-w-xs mx-auto">Keep swiping to find people you connect with!</p>
          <button 
            onClick={() => navigate('/discover')}
            className="bg-[#ff3366] text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-[#ff3366]/20 hover:bg-[#e62e5c] transition-all"
          >
            Start Discovering
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match) => (
            <div key={match.uid} className="bg-[var(--bg-card)] rounded-[2rem] shadow-sm border border-[var(--border-color)] overflow-hidden group hover:shadow-md transition-all duration-300">
              <div className="relative aspect-[4/5]">
                <img 
                  src={match.photos?.[0] || `https://picsum.photos/seed/${match.uid}/400/500`} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h4 className="text-xl font-bold">{match.name}, {match.age || 25}</h4>
                  <div className="flex items-center gap-1 text-white/80 text-xs font-medium">
                    <MapPin className="w-3 h-3" />
                    <span>{match.location || 'Nearby'}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 flex gap-2">
                <button 
                  onClick={() => navigate(`/chat/${[profile?.uid, match.uid].sort().join('_')}`)}
                  className="flex-1 bg-[#ff3366] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#e62e5c] transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Message</span>
                </button>
                <button 
                  onClick={() => navigate(`/profile/${match.uid}`)}
                  className="w-12 bg-[var(--bg-input)] text-[var(--text-secondary)] rounded-xl flex items-center justify-center hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] transition-all border border-[var(--border-color)]"
                >
                  <User className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Matches;
