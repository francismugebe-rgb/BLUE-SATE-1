import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase';

export const feedService = {
  async createPost(userId: string, userName: string, text: string, imageUrl?: string) {
    const postsRef = collection(db, 'posts');
    await addDoc(postsRef, {
      authorId: userId,
      authorName: userName,
      text,
      imageUrl,
      createdAt: serverTimestamp(),
      likes: [],
      comments: []
    });
  },

  listenToFeed(callback: (posts: any[]) => void) {
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(posts);
    });
  },

  async toggleLike(postId: string, userId: string, isLiked: boolean) {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      likes: isLiked ? arrayRemove(userId) : arrayUnion(userId)
    });
  }
};
