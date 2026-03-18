import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Chat, Message, UserProfile } from '../types';
import { Send, Image as ImageIcon, Search, MoreVertical, Check, CheckCheck, MessageCircle } from 'lucide-react';
import { cn, formatTime } from '../lib/utils';
import { socialApi } from '../api';
import { io, Socket } from 'socket.io-client';

const Messages: React.FC = () => {
  const { profile, user: authUser } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatUsers, setChatUsers] = useState<Record<string, UserProfile>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!authUser) return;

    socketRef.current = io();
    socketRef.current.emit('user_online', authUser.uid);

    const fetchChats = async () => {
      try {
        const chatList = await socialApi.getChats();
        setChats(chatList);
        
        // Fetch user info for all participants
        const uids = new Set<string>();
        chatList.forEach((c: Chat) => c.participants.forEach((p: string) => uids.add(p)));
        
        const newUsers: Record<string, UserProfile> = { ...chatUsers };
        const missingUids = Array.from(uids).filter(uid => !newUsers[uid]);
        
        if (missingUids.length > 0) {
          for (const uid of missingUids) {
            try {
              const u = await socialApi.getUserProfile(uid);
              newUsers[uid] = u;
            } catch (err) {
              console.error("Error fetching user profile:", err);
            }
          }
          setChatUsers(newUsers);
        }
      } catch (error) {
        console.error("Error fetching chats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();

    socketRef.current.on('receive_message', (data: Message) => {
      setMessages(prev => {
        if (data.chatId === activeChat?.id) {
          return [...prev, data];
        }
        return prev;
      });
      
      // Update last message in chats list
      setChats(prev => prev.map(c => 
        c.id === data.chatId 
          ? { ...c, lastMessage: data.text, lastMessageAt: data.createdAt }
          : c
      ));
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [authUser, activeChat?.id]);

  useEffect(() => {
    if (!activeChat) return;

    const fetchMessages = async () => {
      try {
        const msgList = await socialApi.getMessages(activeChat.id);
        setMessages(msgList);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();
    socketRef.current?.emit('join_chat', activeChat.id);
  }, [activeChat]);

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
      await socialApi.sendMessage({
        receiverId,
        text: newMessage
      });
      socketRef.current?.emit('send_message', msgData);
      setNewMessage('');
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const getOtherParticipant = (chat: Chat) => {
    const otherId = chat.participants.find(p => p !== authUser?.uid);
    return otherId ? chatUsers[otherId] : null;
  };

  if (loading) return <div className="p-8">Loading messages...</div>;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-120px)] flex bg-[var(--bg-card)] rounded-[2.5rem] shadow-sm border border-[var(--border-color)] overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <div className="w-[350px] border-r border-[var(--border-color)] flex flex-col">
        <div className="p-6 border-b border-[var(--border-color)]">
          <h2 className="text-2xl font-black text-[var(--text-primary)] mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input 
              type="text" 
              placeholder="Search chats..." 
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3366]/20 transition-all placeholder:text-[var(--text-secondary)]"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {chats.map(chat => {
            const other = getOtherParticipant(chat);
            return (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={cn(
                  "w-full p-4 flex gap-3 hover:bg-[var(--bg-input)] transition-all border-l-4",
                  activeChat?.id === chat.id ? "bg-[var(--bg-input)] border-[#ff3366]" : "border-transparent"
                )}
              >
                <img src={other?.photos?.[0] || `https://picsum.photos/seed/${other?.uid}/100/100`} className="w-12 h-12 rounded-xl object-cover border border-[var(--border-color)]" />
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-bold text-[var(--text-primary)] truncate">{other?.name || 'User'}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase">{chat.lastMessageAt ? formatTime(chat.lastMessageAt) : ''}</p>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] truncate">{chat.lastMessage || 'No messages yet'}</p>
                </div>
              </button>
            );
          })}
          {chats.length === 0 && (
            <div className="p-8 text-center text-[var(--text-secondary)] italic text-sm">No conversations yet</div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-[var(--bg-input)]/30">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-[var(--bg-card)] border-b border-[var(--border-color)] flex items-center justify-between transition-colors duration-300">
              <div className="flex items-center gap-3">
                <img src={getOtherParticipant(activeChat)?.photos?.[0]} className="w-10 h-10 rounded-xl object-cover border border-[var(--border-color)]" />
                <div>
                  <p className="font-bold text-[var(--text-primary)]">{getOtherParticipant(activeChat)?.name}</p>
                  <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Online</p>
                </div>
              </div>
              <button className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-input)] rounded-lg transition-all">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {messages.map((msg, i) => {
                const isMe = msg.senderId === authUser?.uid;
                return (
                  <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[70%] p-4 rounded-2xl text-sm shadow-sm",
                      isMe ? "bg-[#ff3366] text-white rounded-tr-none" : "bg-[var(--bg-card)] text-[var(--text-primary)] rounded-tl-none border border-[var(--border-color)]"
                    )}>
                      <p className="leading-relaxed">{msg.text}</p>
                      <div className={cn("flex items-center gap-1 mt-1 justify-end", isMe ? "text-white/60" : "text-[var(--text-secondary)]")}>
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
            <form onSubmit={handleSendMessage} className="p-4 bg-[var(--bg-card)] border-t border-[var(--border-color)] flex gap-3 transition-colors duration-300">
              <button type="button" className="p-3 text-[var(--text-secondary)] hover:bg-[var(--bg-input)] rounded-xl transition-all">
                <ImageIcon className="w-5 h-5" />
              </button>
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..." 
                className="flex-1 bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3366]/20 transition-all placeholder:text-[var(--text-secondary)]"
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
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-secondary)] space-y-4">
            <div className="w-20 h-20 bg-[var(--bg-input)] rounded-3xl flex items-center justify-center">
              <MessageCircle className="w-10 h-10 text-[var(--text-secondary)] opacity-20" />
            </div>
            <p className="font-bold">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
