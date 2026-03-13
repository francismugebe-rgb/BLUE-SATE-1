import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';

export const chatService = {
  async sendMessage(matchId: string, senderId: string, receiverId: string, text: string) {
    const messagesRef = collection(db, 'matches', matchId, 'messages');
    await addDoc(messagesRef, {
      matchId,
      senderId,
      receiverId,
      text,
      createdAt: serverTimestamp(),
      seen: false
    });

    // Update last message timestamp in match document
    const matchRef = doc(db, 'matches', matchId);
    await updateDoc(matchRef, {
      lastMessageAt: serverTimestamp()
    });
  },

  listenToMessages(matchId: string, callback: (messages: any[]) => void) {
    const messagesRef = collection(db, 'matches', matchId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(messages);
    });
  }
};
