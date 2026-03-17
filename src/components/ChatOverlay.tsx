import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { Message, UserProfile } from '../types';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { io, Socket } from 'socket.io-client';
import { X, Send, Image as ImageIcon, Smile, Mic, Check, CheckCheck, MoreVertical, Phone, Video } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const ChatOverlay: React.FC = () => {
  const { activeChatId, activeOtherUser, isOverlayOpen, closeChat } = useChat();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserStatus, setOtherUserStatus] = useState<'online' | 'offline'>('offline');
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOverlayOpen || !activeChatId) return;

    socketRef.current = io();
    socketRef.current.emit('user_online', profile?.uid);
    socketRef.current.emit('join_chat', activeChatId);

    socketRef.current.on('receive_message', (data: Message) => {
      if (data.chatId === activeChatId) {
        setMessages(prev => [...prev, data]);
        if (data.senderId !== profile?.uid) {
          socketRef.current?.emit('message_seen', { chatId: activeChatId, messageId: data.id });
        }
      }
    });

    socketRef.current.on('user_typing', (data: { chatId: string, userId: string, isTyping: boolean }) => {
      if (data.chatId === activeChatId && data.userId !== profile?.uid) {
        setOtherUserTyping(data.isTyping);
      }
    });

    socketRef.current.on('user_status_change', (data: { userId: string, status: 'online' | 'offline' }) => {
      if (data.userId === activeOtherUser?.uid) {
        setOtherUserStatus(data.status);
      }
    });

    const q = query(
      collection(db, 'chats', activeChatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chats/${activeChatId}/messages`);
    });

    return () => {
      socketRef.current?.disconnect();
      unsubscribe();
    };
  }, [isOverlayOpen, activeChatId, profile, activeOtherUser]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherUserTyping]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      socketRef.current?.emit('typing', { chatId: activeChatId, userId: profile?.uid, isTyping: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current?.emit('typing', { chatId: activeChatId, userId: profile?.uid, isTyping: false });
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !activeChatId || !newMessage.trim() || !activeOtherUser) return;

    const messageData = {
      chatId: activeChatId,
      senderId: profile.uid,
      receiverId: activeOtherUser.uid,
      text: newMessage,
      read: false,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'chats', activeChatId, 'messages'), messageData);
      socketRef.current?.emit('send_message', messageData);
      setNewMessage('');
      setIsTyping(false);
      socketRef.current?.emit('typing', { chatId: activeChatId, userId: profile?.uid, isTyping: false });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `chats/${activeChatId}/messages`);
    }
  };

  return (
    <AnimatePresence>
      {isOverlayOpen && activeOtherUser && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  src={activeOtherUser.photos?.[0] || `https://picsum.photos/seed/${activeOtherUser.uid}/100/100`} 
                  className="w-10 h-10 rounded-full object-cover border-2 border-slate-50"
                  referrerPolicy="no-referrer"
                />
                {otherUserStatus === 'online' && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 leading-tight">{activeOtherUser.name}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {otherUserTyping ? 'typing...' : otherUserStatus}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                <Phone className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                <Video className="w-5 h-5" />
              </button>
              <button onClick={closeChat} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#efeae2] relative">
            {/* Background pattern like WhatsApp */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat"></div>
            
            <div className="relative z-10 space-y-3">
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === profile?.uid;
                return (
                  <div key={idx} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[85%] p-2.5 rounded-lg shadow-sm relative",
                      isMe ? "bg-[#dcf8c6] text-slate-800 rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none"
                    )}>
                      <p className="text-sm leading-relaxed pr-10">{msg.text}</p>
                      <div className="flex items-center gap-1 absolute bottom-1 right-2">
                        <span className="text-[9px] text-slate-400 font-medium">
                          {format(new Date(msg.createdAt), 'HH:mm')}
                        </span>
                        {isMe && (
                          <div className="flex items-center">
                            {msg.read ? (
                              <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {otherUserTyping && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </div>

          {/* Input */}
          <div className="p-3 bg-[#f0f2f5] border-t border-slate-100">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button type="button" className="p-2 text-slate-500 hover:text-slate-700 transition-colors">
                  <Smile className="w-6 h-6" />
                </button>
                <button type="button" className="p-2 text-slate-500 hover:text-slate-700 transition-colors">
                  <ImageIcon className="w-6 h-6" />
                </button>
              </div>
              <input
                type="text"
                value={newMessage}
                onChange={handleTyping}
                placeholder="Type a message"
                className="flex-1 bg-white border-none rounded-lg py-2.5 px-4 focus:outline-none shadow-sm text-sm"
              />
              {newMessage.trim() ? (
                <button
                  type="submit"
                  className="w-10 h-10 bg-[#00a884] text-white rounded-full flex items-center justify-center shadow-md hover:bg-[#008f70] transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="button"
                  className="w-10 h-10 bg-[#00a884] text-white rounded-full flex items-center justify-center shadow-md hover:bg-[#008f70] transition-all"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatOverlay;
