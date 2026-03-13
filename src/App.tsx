import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from './store';
import { Heart, MessageCircle, User, Settings, LogOut, Search, Bell, X, Star, Zap, MessageSquare, Camera, Mic, Phone, Sparkles } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { auth, db } from './firebase';
import { signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { datingService } from './services/datingService';
import { chatService } from './services/chatService';
import { socketService } from './services/socketService';
import { setPotentialMatches, setMatches, setLoading as setDatingLoading } from './store/slices/datingSlice';
import { setActiveMatch, setMessages, addMessage } from './store/slices/chatSlice';

import { Feed } from './components/Feed';
import { ProfileSetup } from './components/ProfileSetup';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state: RootState) => state.auth);
  const { potentialMatches, matches, loading: datingLoading } = useSelector((state: RootState) => state.dating);
  const { activeMatch, messages } = useSelector((state: RootState) => state.chat);
  
  const [activeTab, setActiveTab] = useState('discover');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [chatMessage, setChatMessage] = useState('');

  // Swipe Animation Values
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

  useEffect(() => {
    if (user && user.gender) { // Only connect if profile is complete
      const socket = socketService.connect();
      
      const fetchData = async () => {
        dispatch(setDatingLoading(true));
        try {
          const potentials = await datingService.getPotentialMatches(user.uid, user.gender || 'other');
          dispatch(setPotentialMatches(potentials));
          
          const userMatches = await datingService.getMatches(user.uid);
          dispatch(setMatches(userMatches));
        } catch (error) {
          console.error("Error fetching data", error);
        }
        dispatch(setDatingLoading(false));
      };

      fetchData();

      socketService.on('receive-message', (msg) => {
        if (activeMatch && msg.matchId === activeMatch.id) {
          dispatch(addMessage(msg));
        }
      });

      return () => {
        socketService.disconnect();
      };
    }
  }, [user, dispatch]);

  useEffect(() => {
    if (activeMatch) {
      const unsubscribe = chatService.listenToMessages(activeMatch.id, (msgs) => {
        dispatch(setMessages(msgs));
      });
      return () => unsubscribe();
    }
  }, [activeMatch, dispatch]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const [compatibility, setCompatibility] = useState<{ score: number, reason: string } | null>(null);

  const handleSwipe = async (direction: 'right' | 'left') => {
    const target = potentialMatches[currentIndex];
    if (!target) return;

    const result = await datingService.swipe(user.uid, target.id, direction);
    if (result.matched) {
      alert("It's a Match!");
      // Refresh matches
      const userMatches = await datingService.getMatches(user.uid);
      dispatch(setMatches(userMatches));
    }
    
    setCurrentIndex(prev => prev + 1);
    x.set(0);
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !activeMatch) return;
    
    const receiverId = activeMatch.users.find((id: string) => id !== user.uid);
    await chatService.sendMessage(activeMatch.id, user.uid, receiverId, chatMessage);
    
    socketService.emit('send-message', {
      roomId: activeMatch.id,
      matchId: activeMatch.id,
      senderId: user.uid,
      text: chatMessage,
      createdAt: new Date().toISOString()
    });

    setChatMessage('');
  };

  if (loading) return null;

  if (!user) {
    return (
      <div className="min-h-screen bg-blue-950 flex flex-col items-center justify-center p-4 text-white">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full glass rounded-3xl p-8 text-center space-y-6"
        >
          <div className="w-20 h-20 bg-sky-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Heart className="text-white w-10 h-10 fill-current" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Bluesate</h1>
          <p className="text-blue-400 text-lg">
            Enterprise dating and social network. Connect, match, and grow.
          </p>
          <button 
            onClick={handleLogin}
            className="w-full py-4 bg-white text-blue-950 rounded-2xl font-semibold text-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-3"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
            Continue with Google
          </button>
          <p className="text-xs text-blue-500">
            By continuing, you agree to our Terms and Privacy Policy.
          </p>
        </motion.div>
      </div>
    );
  }

  if (!user.gender) {
    return <ProfileSetup user={user} />;
  }

  const currentCandidate = potentialMatches[currentIndex];

  useEffect(() => {
    if (currentCandidate && user) {
      const getCompatibility = async () => {
        const result = await geminiService.calculateCompatibility(user, currentCandidate);
        setCompatibility(result);
      };
      getCompatibility();
    } else {
      setCompatibility(null);
    }
  }, [currentCandidate, user]);

  return (
    <div className="min-h-screen bg-blue-950 text-blue-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
            <Heart className="text-white w-5 h-5 fill-current" />
          </div>
          <span className="font-bold text-xl tracking-tight">Bluesate</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/5 rounded-full transition-colors relative">
            <Bell className="w-6 h-6 text-blue-400" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-sky-500 rounded-full border-2 border-blue-950"></span>
          </button>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-sky-500/50">
            <img src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} alt="Profile" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'discover' && (
            <motion.div 
              key="discover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col p-4 max-w-lg mx-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Discover</h2>
                <button className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <Settings className="w-5 h-5 text-blue-400" />
                </button>
              </div>
              
              <div className="flex-1 relative perspective-1000">
                {currentCandidate ? (
                  <motion.div
                    style={{ x, rotate, opacity }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.x > 100) handleSwipe('right');
                      else if (info.offset.x < -100) handleSwipe('left');
                    }}
                    className="absolute inset-0 w-full h-full rounded-[2.5rem] overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing"
                  >
                    <img 
                      src={currentCandidate.photoURL || `https://picsum.photos/seed/${currentCandidate.id}/800/1200`} 
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      alt={currentCandidate.fullName}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-950 via-transparent to-transparent pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-8 space-y-2 pointer-events-none">
                      <div className="flex items-center gap-3">
                        <h3 className="text-3xl font-bold">{currentCandidate.fullName}, {currentCandidate.age}</h3>
                        {currentCandidate.verificationStatus === 'verified' && (
                          <div className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/30">
                            VERIFIED
                          </div>
                        )}
                      </div>
                      
                      {compatibility && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 bg-sky-500/20 border border-sky-500/30 rounded-xl px-3 py-2"
                        >
                          <Sparkles className="w-4 h-4 text-sky-500" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-sky-500 uppercase tracking-widest">AI Compatibility</span>
                              <span className="text-xs font-bold text-sky-500">{compatibility.score}%</span>
                            </div>
                            <p className="text-[10px] text-blue-300 leading-tight">{compatibility.reason}</p>
                          </div>
                        </motion.div>
                      )}

                      <p className="text-blue-300">{currentCandidate.bio || "No bio yet."}</p>
                      <div className="flex gap-2 pt-2">
                        {currentCandidate.interests?.slice(0, 3).map((interest: string) => (
                          <span key={interest} className="px-3 py-1 bg-white/10 rounded-full text-xs">{interest}</span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                      <Search className="w-10 h-10 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-bold">No more people nearby</h3>
                    <p className="text-blue-400">Try changing your filters or check back later!</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-4 py-6">
                <button 
                  onClick={() => handleSwipe('left')}
                  className="w-14 h-14 rounded-full glass flex items-center justify-center text-sky-500 hover:bg-sky-500/10 transition-all"
                >
                  <X className="w-7 h-7" />
                </button>
                <button className="w-14 h-14 rounded-full glass flex items-center justify-center text-amber-500 hover:bg-amber-500/10 transition-all">
                  <Star className="w-7 h-7 fill-current" />
                </button>
                <button 
                  onClick={() => handleSwipe('right')}
                  className="w-18 h-18 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 hover:scale-110 active:scale-95 transition-all"
                >
                  <Heart className="w-9 h-9 fill-current" />
                </button>
                <button className="w-14 h-14 rounded-full glass flex items-center justify-center text-violet-500 hover:bg-violet-500/10 transition-all">
                  <Zap className="w-7 h-7 fill-current" />
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'feed' && (
            <motion.div 
              key="feed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full overflow-y-auto"
            >
              <Feed user={user} />
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              {!activeMatch ? (
                <div className="p-4 space-y-6 flex-1 overflow-y-auto">
                  <h2 className="text-2xl font-bold">Matches</h2>
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {matches.map((match: any) => {
                      const otherUser = match.users.find((id: string) => id !== user.uid);
                      return (
                        <div key={match.id} className="flex-shrink-0 flex flex-col items-center gap-2">
                          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-sky-500 p-0.5">
                            <img src={`https://picsum.photos/seed/${otherUser}/100/100`} alt="Match" className="w-full h-full object-cover rounded-full" />
                          </div>
                          <span className="text-xs font-medium">Match</span>
                        </div>
                      );
                    })}
                  </div>

                  <h2 className="text-2xl font-bold pt-4">Messages</h2>
                  <div className="space-y-2">
                    {matches.map((match: any) => {
                      const otherUser = match.users.find((id: string) => id !== user.uid);
                      return (
                        <div 
                          key={match.id} 
                          onClick={() => dispatch(setActiveMatch(match))}
                          className="flex items-center gap-4 p-4 glass rounded-2xl hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/10">
                            <img src={`https://picsum.photos/seed/${otherUser}/100/100`} alt="Match" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <h4 className="font-bold">User {otherUser.slice(0, 5)}</h4>
                              <span className="text-xs text-blue-500">Just now</span>
                            </div>
                            <p className="text-sm text-blue-400 truncate">Tap to start chatting!</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col h-full bg-blue-950">
                  {/* Chat Header */}
                  <div className="p-4 glass border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => dispatch(setActiveMatch(null))} className="p-2 hover:bg-white/5 rounded-full">
                        <X className="w-6 h-6" />
                      </button>
                      <div className="w-10 h-10 rounded-full overflow-hidden">
                        <img src={`https://picsum.photos/seed/${activeMatch.users.find((id: string) => id !== user.uid)}/100/100`} alt="Match" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">User {activeMatch.users.find((id: string) => id !== user.uid).slice(0, 5)}</h4>
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Online</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={async () => {
                          const otherUser = activeMatch.users.find((id: string) => id !== user.uid);
                          const targetDoc = await getDoc(doc(db, 'users', otherUser));
                          const icebreaker = await geminiService.generateIcebreaker(user, { id: otherUser, ...targetDoc.data() });
                          setChatMessage(icebreaker);
                        }}
                        className="p-2 hover:bg-sky-500/10 rounded-full text-sky-500"
                        title="Generate AI Icebreaker"
                      >
                        <Sparkles className="w-5 h-5" />
                      </button>
                      <button className="p-2 hover:bg-white/5 rounded-full text-blue-400"><Phone className="w-5 h-5" /></button>
                      <button className="p-2 hover:bg-white/5 rounded-full text-blue-400"><Camera className="w-5 h-5" /></button>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg: any) => (
                      <div key={msg.id} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] p-3 rounded-2xl ${msg.senderId === user.uid ? 'bg-sky-500 text-white rounded-tr-none' : 'glass text-blue-50 rounded-tl-none'}`}>
                          <p className="text-sm">{msg.text}</p>
                          <span className="text-[10px] opacity-50 block mt-1">12:45 PM</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chat Input */}
                  <div className="p-4 glass border-t border-white/5 flex items-center gap-2">
                    <button className="p-2 text-blue-400 hover:text-white"><Mic className="w-6 h-6" /></button>
                    <input 
                      type="text" 
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-sky-500/50"
                    />
                    <button 
                      onClick={handleSendMessage}
                      className="p-2 bg-sky-500 rounded-full text-white shadow-lg shadow-sky-500/20"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-white/5 px-6 py-4 flex items-center justify-between">
        <button 
          onClick={() => setActiveTab('discover')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'discover' ? 'text-sky-500' : 'text-blue-500'}`}
        >
          <Heart className={`w-7 h-7 ${activeTab === 'discover' ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Discover</span>
        </button>
        <button 
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'feed' ? 'text-sky-500' : 'text-blue-500'}`}
        >
          <Zap className={`w-7 h-7 ${activeTab === 'feed' ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Feed</span>
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'chat' ? 'text-sky-500' : 'text-blue-500'}`}
        >
          <MessageCircle className={`w-7 h-7 ${activeTab === 'chat' ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Chat</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'profile' ? 'text-sky-500' : 'text-blue-500'}`}
        >
          <User className={`w-7 h-7 ${activeTab === 'profile' ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Profile</span>
        </button>
        <button 
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 text-blue-500 hover:text-white transition-colors"
        >
          <LogOut className="w-7 h-7" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Logout</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
