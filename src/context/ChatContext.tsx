import React, { createContext, useContext, useState, useCallback } from 'react';
import { UserProfile } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

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
    
    // Ensure chat document exists
    try {
      await setDoc(doc(db, 'chats', chatId), {
        participants: [currentUserId, otherUser.uid],
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error("Error creating chat document:", err);
    }

    setActiveChatId(chatId);
    setActiveOtherUser(otherUser);
    setIsOverlayOpen(true);
  }, [currentUserId]);

  const closeChat = useCallback(() => {
    setIsOverlayOpen(false);
    // We keep the activeChatId so it's ready if reopened, but we could clear it
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
