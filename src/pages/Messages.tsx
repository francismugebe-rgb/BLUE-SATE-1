import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc, getDocs, limit, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Chat, Message, UserProfile } from '../types';
import { Send, Image as ImageIcon, Search, MoreVertical, Check, CheckCheck, MessageCircle } from 'lucide-react';
import { cn, formatTime } from '../lib/utils';

const Messages: React.FC = () => {
  const { profile, user: authUser } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatUsers, setChatUsers] = useState<Record<string, UserProfile>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authUser) return;

    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', authUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsub = onSnapshot(chatsQuery, async (snap) => {
      const chatList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Chat));
      setChats(chatList);
      
      // Fetch user info for all participants
      const uids = new Set<string>();
      chatList.forEach(c => c.participants.forEach(p => uids.add(p)));
      
      const newUsers: Record<string, UserProfile> = { ...chatUsers };
      const missingUids = Array.from(uids).filter(uid => !newUsers[uid]);
      
      if (missingUids.length > 0) {
        // Fetch in batches of 10
        for (let i = 0; i < missingUids.length; i += 10) {
          const batch = missingUids.slice(i, i + 10);
          const q = query(collection(db, 'users'), where('uid', 'in', batch));
          const userSnap = await getDocs(q);
          userSnap.docs.forEach(d => {
            const u = d.data() as UserProfile;
            newUsers[u.uid] = u;
          });
        }
        setChatUsers(newUsers);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [authUser]);

  useEffect(() => {
    if (!activeChat) return;

    const messagesQuery = query(
      collection(db, `chats/${activeChat.id}/messages`),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsub = onSnapshot(messagesQuery, (snap) => {
      const msgList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      setMessages(msgList);
      
      // Mark as read
      msgList.forEach(m => {
        if (m.receiverId === authUser?.uid && !m.read) {
          updateDoc(doc(db, `chats/${activeChat.id}/messages`, m.id), { read: true });
        }
      });
    });

    return () => unsub();
  }, [activeChat, authUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !activeChat || !newMessage.trim()) return;

    const receiverId = activeChat.participants.find(p => p !== authUser.uid);
    if (!receiverId) return;

    const msgData = {
      chatId: activeChat.id,
      senderId: authUser.uid,
      receiverId,
      text: newMessage,
      read: false,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, `chats/${activeChat.id}/messages`), msgData);
      await updateDoc(doc(db, 'chats', activeChat.id), {
        lastMessage: newMessage,
        lastMessageAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setNewMessage('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'messages');
    }
  };

  const getOtherParticipant = (chat: Chat) => {
    const otherId = chat.participants.find(p => p !== authUser?.uid);
    return otherId ? chatUsers[otherId] : null;
  };

  if (loading) return <div className="p-8">Loading messages...</div>;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-120px)] flex bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-[350px] border-r border-slate-100 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-2xl font-black text-slate-900 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search chats..." 
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3366]/20 transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => {
            const other = getOtherParticipant(chat);
            return (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={cn(
                  "w-full p-4 flex gap-3 hover:bg-slate-50 transition-all border-l-4",
                  activeChat?.id === chat.id ? "bg-slate-50 border-[#ff3366]" : "border-transparent"
                )}
              >
                <img src={other?.photos?.[0] || `https://picsum.photos/seed/${other?.uid}/100/100`} className="w-12 h-12 rounded-xl object-cover" />
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-bold text-slate-900 truncate">{other?.name || 'User'}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{chat.lastMessageAt ? formatTime(chat.lastMessageAt) : ''}</p>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{chat.lastMessage || 'No messages yet'}</p>
                </div>
              </button>
            );
          })}
          {chats.length === 0 && (
            <div className="p-8 text-center text-slate-400 italic text-sm">No conversations yet</div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50/30">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={getOtherParticipant(activeChat)?.photos?.[0]} className="w-10 h-10 rounded-xl object-cover" />
                <div>
                  <p className="font-bold text-slate-900">{getOtherParticipant(activeChat)?.name}</p>
                  <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Online</p>
                </div>
              </div>
              <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-all">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, i) => {
                const isMe = msg.senderId === authUser?.uid;
                return (
                  <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[70%] p-4 rounded-2xl text-sm shadow-sm",
                      isMe ? "bg-[#ff3366] text-white rounded-tr-none" : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
                    )}>
                      <p className="leading-relaxed">{msg.text}</p>
                      <div className={cn("flex items-center gap-1 mt-1 justify-end", isMe ? "text-white/60" : "text-slate-400")}>
                        <span className="text-[10px] font-bold uppercase">{formatTime(msg.createdAt)}</span>
                        {isMe && (msg.read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-3">
              <button type="button" className="p-3 text-slate-400 hover:bg-slate-50 rounded-xl transition-all">
                <ImageIcon className="w-5 h-5" />
              </button>
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..." 
                className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3366]/20 transition-all"
              />
              <button 
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-[#ff3366] text-white p-3 rounded-xl shadow-lg shadow-[#ff3366]/20 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center">
              <MessageCircle className="w-10 h-10 text-slate-300" />
            </div>
            <p className="font-bold">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
