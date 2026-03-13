import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, doc, getDoc, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Message, UserProfile } from '../types';
import { Send, Image as ImageIcon, ChevronLeft, MoreVertical, Smile, MessageCircle } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

const Chat: React.FC = () => {
  const { id: chatId } = useParams();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [chats, setChats] = useState<{id: string, otherUser: UserProfile}[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Initialize Socket.io
  useEffect(() => {
    socketRef.current = io();
    
    socketRef.current.on('receive_message', (data: Message) => {
      if (data.chatId === chatId) {
        setMessages(prev => [...prev, data]);
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [chatId]);

  // Fetch all chats for the user
  useEffect(() => {
    if (!profile) return;
    
    const fetchChats = async () => {
      const matches = profile.matches || [];
      const chatList = await Promise.all(matches.map(async (matchId) => {
        const userDoc = await getDoc(doc(db, 'users', matchId));
        const otherUserData = userDoc.data() as UserProfile;
        const id = [profile.uid, matchId].sort().join('_');
        return { id, otherUser: otherUserData };
      }));
      setChats(chatList);
    };

    fetchChats();
  }, [profile]);

  // Fetch messages for current chat
  useEffect(() => {
    if (!chatId || !profile) return;

    const otherUserId = chatId.split('_').find(uid => uid !== profile.uid);
    if (otherUserId) {
      getDoc(doc(db, 'users', otherUserId)).then(snap => {
        if (snap.exists()) setOtherUser(snap.data() as UserProfile);
      });
    }

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
    });

    socketRef.current?.emit('join_chat', chatId);

    return () => unsubscribe();
  }, [chatId, profile]);

  // Scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !chatId || !newMessage.trim() || !otherUser) return;

    const messageData = {
      chatId,
      senderId: profile.uid,
      receiverId: otherUser.uid,
      text: newMessage,
      read: false,
      createdAt: new Date().toISOString()
    };

    try {
      // Save to Firestore
      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      
      // Emit via Socket.io
      socketRef.current?.emit('send_message', messageData);
      
      setNewMessage('');
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  if (!chatId) {
    return (
      <div className="flex h-[calc(100vh-120px)] bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="w-full md:w-80 border-r border-slate-100 flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-2xl font-bold text-slate-900">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {chats.map(chat => (
              <button
                key={chat.id}
                onClick={() => navigate(`/chat/${chat.id}`)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all text-left group"
              >
                <img src={chat.otherUser.photos?.[0] || `https://picsum.photos/seed/${chat.otherUser.uid}/100/100`} className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 truncate group-hover:text-[#ff3366] transition-colors">{chat.otherUser.name}</h4>
                  <p className="text-sm text-slate-400 truncate">Tap to start chatting</p>
                </div>
              </button>
            ))}
            {chats.length === 0 && (
              <div className="text-center py-10">
                <p className="text-slate-400 font-medium">No matches yet!</p>
                <button onClick={() => navigate('/discover')} className="text-[#ff3366] font-bold text-sm mt-2">Go Discover</button>
              </div>
            )}
          </div>
        </div>
        <div className="hidden md:flex flex-1 items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Select a chat</h3>
            <p className="text-slate-400">Choose a match to start a conversation</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex-col">
      {/* Chat Header */}
      <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/chat')} className="md:hidden p-2 hover:bg-slate-50 rounded-xl">
            <ChevronLeft className="w-6 h-6 text-slate-600" />
          </button>
          <img src={otherUser?.photos?.[0] || `https://picsum.photos/seed/${otherUser?.uid}/100/100`} className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
          <div>
            <h4 className="font-bold text-slate-900">{otherUser?.name}</h4>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Online</span>
            </div>
          </div>
        </div>
        <button className="p-2 hover:bg-slate-50 rounded-xl text-slate-400">
          <MoreVertical className="w-6 h-6" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === profile?.uid;
          return (
            <div key={idx} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] p-4 rounded-2xl shadow-sm",
                isMe ? "bg-[#ff3366] text-white rounded-tr-none" : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
              )}>
                <p className="text-sm md:text-base leading-relaxed">{msg.text}</p>
                <p className={cn("text-[10px] mt-1 font-bold uppercase tracking-wider opacity-60", isMe ? "text-right" : "text-left")}>
                  {format(new Date(msg.createdAt), 'HH:mm')}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 md:p-6 border-t border-slate-100 flex items-center gap-4">
        <button type="button" className="p-2 text-slate-400 hover:text-[#ff3366] transition-colors">
          <ImageIcon className="w-6 h-6" />
        </button>
        <button type="button" className="p-2 text-slate-400 hover:text-[#ff3366] transition-colors">
          <Smile className="w-6 h-6" />
        </button>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl py-3 px-6 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10 focus:border-[#ff3366] transition-all"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="w-12 h-12 bg-[#ff3366] text-white rounded-xl flex items-center justify-center shadow-lg shadow-[#ff3366]/20 hover:bg-[#e62e5c] transition-all disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default Chat;
