import React, { createContext, useContext, useState, useCallback } from 'react';
import { UserProfile } from '../types';

interface ChatContextType {
  activeChatId: string | null;
  activeOtherUser: UserProfile | null;
  isOverlayOpen: boolean;
  openChat: (otherUser: UserProfile) => Promise<void>;
  closeChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode, currentUserId?: string }> = ({ children, currentUserId }) => {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeOtherUser, setActiveOtherUser] = useState<UserProfile | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  const openChat = useCallback(async (otherUser: UserProfile) => {
    if (!currentUserId) return;
    const chatId = [currentUserId, otherUser.uid].sort().join('_');
    
    setActiveChatId(chatId);
    setActiveOtherUser(otherUser);
    setIsOverlayOpen(true);
  }, [currentUserId]);

  const closeChat = useCallback(() => {
    setIsOverlayOpen(false);
  }, []);

  return (
    <ChatContext.Provider value={{ activeChatId, activeOtherUser, isOverlayOpen, openChat, closeChat }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
