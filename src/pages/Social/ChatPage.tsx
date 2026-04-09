import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ActionService } from '../../services/ActionService';
import { Send, Image as ImageIcon, MoreVertical, Phone, Video, Search, ArrowLeft, Check, CheckCheck, MessageCircle } from 'lucide-react';

interface Conversation {
  id: string;
  participants: string[];
  lastMessage: string;
  updatedAt: any;
  otherUser?: {
    displayName: string;
    photoURL: string;
    uid: string;
  };
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  mediaUrl?: string;
  createdAt: any;
  status: 'sent' | 'delivered' | 'read';
}

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const convs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Conversation[];

      // Fetch other participant data (User or Page)
      const convsWithData = await Promise.all(convs.map(async (conv) => {
        const otherId = conv.participants.find(id => id !== user.uid);
        if (otherId) {
          // Try fetching from users first
          const userDoc = await getDoc(doc(db, 'users', otherId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            return {
              ...conv,
              otherUser: {
                uid: otherId,
                displayName: userData.displayName || userData.email?.split('@')[0] || 'User',
                photoURL: userData.photoURL || `https://picsum.photos/seed/${otherId}/100/100`
              }
            };
          } else {
            // Try fetching from pages
            const pageDoc = await getDoc(doc(db, 'pages', otherId));
            if (pageDoc.exists()) {
              const pageData = pageDoc.data();
              return {
                ...conv,
                otherUser: {
                  uid: otherId,
                  displayName: pageData.name || 'Page',
                  photoURL: pageData.photoURL || `https://picsum.photos/seed/${otherId}/100/100`,
                  isPage: true
                }
              };
            }
          }
        }
        return conv;
      }));

      setConversations(convsWithData);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!activeConv || !user) return;

    // Mark messages as read when opening conversation
    ActionService.markMessagesAsRead(activeConv.id);

    const q = query(
      collection(db, `conversations/${activeConv.id}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [activeConv, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeConv || !newMessage.trim()) return;

    const text = newMessage;
    setNewMessage('');

    try {
      const response = await ActionService.sendMessage(activeConv.id, text);
      if (!response.status) {
        alert(response.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] md:h-screen bg-slate-50 pt-16 md:pt-20 flex overflow-hidden pb-16 md:pb-0">
      {/* Sidebar */}
      <div className={`w-full md:w-96 bg-white border-r border-slate-100 flex flex-col ${activeConv ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-slate-50">
          <h2 className="text-2xl font-black text-slate-900 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search chats..."
              className="w-full pl-12 pr-6 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-pink-500/20 font-medium"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveConv(conv)}
              className={`w-full p-6 flex items-center gap-4 hover:bg-slate-50 transition-colors border-b border-slate-50 ${activeConv?.id === conv.id ? 'bg-pink-50/50' : ''}`}
            >
              <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                <img src={conv.otherUser?.photoURL || `https://picsum.photos/seed/${conv.id}/100/100`} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-slate-900">{conv.otherUser?.displayName || 'User'}</h3>
                  <span className="text-xs font-bold text-slate-400">
                    {conv.updatedAt?.toDate ? conv.updatedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <p className="text-sm text-slate-500 font-medium line-clamp-1">{conv.lastMessage}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`flex-1 bg-slate-50 flex flex-col ${!activeConv ? 'hidden md:flex' : 'flex'} relative`}>
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div className="bg-white p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveConv(null)} className="md:hidden text-slate-600">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden">
                  <img src={activeConv.otherUser?.photoURL || `https://picsum.photos/seed/${activeConv.id}/100/100`} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{activeConv.otherUser?.displayName || 'User'}</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-slate-400">
                <button className="hover:text-pink-500 transition-colors"><Phone className="w-5 h-5" /></button>
                <button className="hover:text-pink-500 transition-colors"><Video className="w-5 h-5" /></button>
                <button className="hover:text-pink-500 transition-colors"><MoreVertical className="w-5 h-5" /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-20 md:pb-6">
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.uid;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-4 rounded-3xl font-medium shadow-sm ${
                      isMe ? 'bg-pink-500 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none'
                    }`}>
                      <p>{msg.text}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-white/70' : 'text-slate-400'}`}>
                        <span className="text-[10px] font-bold">
                          {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                        </span>
                        {isMe && (
                          <div className="flex items-center">
                            {msg.status === 'read' ? (
                              <CheckCheck className="w-3 h-3 text-green-300" />
                            ) : msg.status === 'delivered' ? (
                              <CheckCheck className="w-3 h-3" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-white border-t border-slate-100 md:relative">
              <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                <button type="button" className="text-slate-400 hover:text-pink-500 transition-colors">
                  <ImageIcon className="w-6 h-6" />
                </button>
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-pink-500/20 font-medium"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-14 h-14 bg-pink-500 text-white rounded-2xl flex items-center justify-center hover:bg-pink-600 disabled:bg-pink-300 transition-all shadow-lg shadow-pink-500/20"
                >
                  <Send className="w-6 h-6" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-xl border border-slate-100 mb-8">
              <MessageCircle className="w-12 h-12 text-pink-500" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4">Your Conversations</h2>
            <p className="text-slate-500 font-medium max-w-xs">
              Select a chat from the sidebar to start messaging your matches.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
