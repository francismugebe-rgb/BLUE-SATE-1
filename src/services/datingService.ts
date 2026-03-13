import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  setDoc, 
  doc, 
  serverTimestamp, 
  getDoc,
  updateDoc,
  arrayUnion,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';

export const datingService = {
  async getPotentialMatches(userId: string, gender: string) {
    // Basic discovery logic: find users of opposite gender
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef, 
      where('gender', '!=', gender),
      limit(20)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(user => user.id !== userId);
  },

  async swipe(swiperId: string, targetId: string, direction: 'right' | 'left') {
    const swipeRef = doc(db, 'users', swiperId);
    await updateDoc(swipeRef, {
      swipes: arrayUnion({
        targetId,
        direction,
        at: new Date().toISOString()
      })
    });

    if (direction === 'right') {
      // Check for mutual match
      const targetDoc = await getDoc(doc(db, 'users', targetId));
      const targetData = targetDoc.data();
      
      if (targetData?.swipes?.some((s: any) => s.targetId === swiperId && s.direction === 'right')) {
        // It's a match!
        const matchData = {
          users: [swiperId, targetId],
          createdAt: serverTimestamp(),
          lastMessageAt: null,
          compatibilityScore: Math.floor(Math.random() * 30) + 70
        };
        const matchRef = await addDoc(collection(db, 'matches'), matchData);
        return { matched: true, matchId: matchRef.id };
      }
    }
    return { matched: false };
  },

  async getMatches(userId: string) {
    const matchesRef = collection(db, 'matches');
    const q = query(matchesRef, where('users', 'array-contains', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};
