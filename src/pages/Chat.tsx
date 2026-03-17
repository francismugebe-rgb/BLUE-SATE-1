import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
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
      try {
        const chatList = await Promise.all(matches.map(async (matchId) => {
          const userDoc = await getDoc(doc(db, 'users', matchId));
          const otherUserData = userDoc.data() as UserProfile;
          const id = [profile.uid, matchId].sort().join('_');
          return { id, otherUser: otherUserData };
        }));
        setChats(chatList);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'chats_list');
      }
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
      }).catch(err => handleFirestoreError(err, OperationType.GET, `users/${otherUserId}`));
    }

    const path = `chats/${chatId}/messages`;
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
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

    const path = `chats/${chatId}/messages`;
    try {
      // Save to Firestore
      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      
      // Emit via Socket.io
      socketRef.current?.emit('send_message', messageData);
      
      setNewMessage('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  if (!chatId) {
    return (
      <div className="flex h-[calc(100vh-120px)] bg-[var(--bg-card)] rounded-[2.5rem] shadow-sm border border-[var(--border-color)] overflow-hidden transition-colors duration-300">
        <div className="w-full md:w-80 border-r border-[var(--border-color)] flex flex-col">
          <div className="p-6 border-b border-[var(--border-color)]">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
            {chats.map(chat => (
              <button
                key={chat.id}
                onClick={() => navigate(`/chat/${chat.id}`)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-[var(--bg-input)] transition-all text-left group"
              >
                <img src={chat.otherUser.photos?.[0] || `https://picsum.photos/seed/${chat.otherUser.uid}/100/100`} className="w-12 h-12 rounded-xl object-cover border border-[var(--border-color)]" referrerPolicy="no-referrer" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[var(--text-primary)] truncate group-hover:text-[#ff3366] transition-colors">{chat.otherUser.name}</h4>
                  <p className="text-sm text-[var(--text-secondary)] truncate">Tap to start chatting</p>
                </div>
              </button>
            ))}
            {chats.length === 0 && (
              <div className="text-center py-10">
                <p className="text-[var(--text-secondary)] font-medium">No matches yet!</p>
                <button onClick={() => navigate('/discover')} className="text-[#ff3366] font-bold text-sm mt-2">Go Discover</button>
              </div>
            )}
          </div>
        </div>
        <div className="hidden md:flex flex-1 items-center justify-center bg-[var(--bg-input)]/30">
          <div className="text-center">
            <div className="w-20 h-20 bg-[var(--bg-card)] rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-[var(--border-color)]">
              <MessageCircle className="w-10 h-10 text-[var(--text-secondary)] opacity-20" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">Select a chat</h3>
            <p className="text-[var(--text-secondary)]">Choose a match to start a conversation</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-[var(--bg-card)] rounded-[2.5rem] shadow-sm border border-[var(--border-color)] overflow-hidden flex-col transition-colors duration-300">
      {/* Chat Header */}
      <div className="p-4 md:p-6 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-card)] transition-colors duration-300">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/chat')} className="md:hidden p-2 hover:bg-[var(--bg-input)] rounded-xl">
            <ChevronLeft className="w-6 h-6 text-[var(--text-primary)]" />
          </button>
          <img src={otherUser?.photos?.[0] || `https://picsum.photos/seed/${otherUser?.uid}/100/100`} className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover border border-[var(--border-color)]" referrerPolicy="no-referrer" />
          <div>
            <h4 className="font-bold text-[var(--text-primary)]">{otherUser?.name}</h4>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider">Online</span>
            </div>
          </div>
        </div>
        <button className="p-2 hover:bg-[var(--bg-input)] rounded-xl text-[var(--text-secondary)]">
          <MoreVertical className="w-6 h-6" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[var(--bg-input)]/30 no-scrollbar">
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === profile?.uid;
          return (
            <div key={idx} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] p-4 rounded-2xl shadow-sm",
                isMe ? "bg-[#ff3366] text-white rounded-tr-none" : "bg-[var(--bg-card)] text-[var(--text-primary)] rounded-tl-none border border-[var(--border-color)]"
              )}>
                <p className="text-sm md:text-base leading-relaxed">{msg.text}</p>
                <p className={cn("text-[10px] mt-1 font-bold uppercase tracking-wider opacity-60", isMe ? "text-right" : "text-left", isMe ? "text-white/60" : "text-[var(--text-secondary)]")}>
                  {format(new Date(msg.createdAt), 'HH:mm')}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 md:p-6 border-t border-[var(--border-color)] flex items-center gap-4 bg-[var(--bg-card)] transition-colors duration-300">
        <button type="button" className="p-2 text-[var(--text-secondary)] hover:text-[#ff3366] transition-colors">
          <ImageIcon className="w-6 h-6" />
        </button>
        <button type="button" className="p-2 text-[var(--text-secondary)] hover:text-[#ff3366] transition-colors">
          <Smile className="w-6 h-6" />
        </button>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-2xl py-3 px-6 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10 focus:border-[#ff3366] transition-all placeholder:text-[var(--text-secondary)]"
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
