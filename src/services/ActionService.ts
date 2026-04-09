import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp, 
  runTransaction,
  arrayUnion,
  arrayRemove,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export type ActionName = 
  | 'SEND_FRIEND_REQUEST'
  | 'ACCEPT_FRIEND_REQUEST'
  | 'BLOCK_USER'
  | 'LIKE_PROFILE'
  | 'MATCH_USER'
  | 'UNMATCH_USER'
  | 'SEND_MESSAGE'
  | 'READ_MESSAGE'
  | 'MAKE_PAYMENT'
  | 'SUBSCRIBE_USER'
  | 'CREATE_POST'
  | 'LIKE_POST'
  | 'UPLOAD_REEL'
  | 'CREATE_NOTIFICATION'
  | 'BAN_USER';

export interface ActionResponse {
  status: boolean;
  action: ActionName;
  message?: string;
  error?: string;
  data?: any;
}

export class ActionService {
  /**
   * Core Execution Pipeline
   */
  private static async execute<T>(
    name: ActionName,
    params: any,
    logic: (params: any, userId: string) => Promise<T>
  ): Promise<ActionResponse> {
    try {
      // 1. Authentication Check
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { status: false, action: name, error: 'Authentication required' };
      }

      // 2. Audit Logging
      await addDoc(collection(db, 'auditLogs'), {
        action: name,
        userId: currentUser.uid,
        params,
        timestamp: serverTimestamp()
      });

      // 3. Execute Business Logic & Database Transaction
      const result = await logic(params, currentUser.uid);

      // 4. Success Response
      return {
        status: true,
        action: name,
        message: 'completed',
        data: result
      };
    } catch (error: any) {
      console.error(`[ACTION ERROR] ${name}:`, error);
      return {
        status: false,
        action: name,
        error: error.message || 'Action failed'
      };
    }
  }

  // --- FRIEND ACTION COMMANDS ---

  static async sendFriendRequest(receiverId: string): Promise<ActionResponse> {
    return this.execute('SEND_FRIEND_REQUEST', { receiverId }, async (params, senderId) => {
      const { receiverId } = params;

      // Validation
      if (senderId === receiverId) throw new Error('Cannot add self');

      const receiverDoc = await getDoc(doc(db, 'users', receiverId));
      if (!receiverDoc.exists()) throw new Error('User does not exist');

      // Duplicate Check
      const q = query(
        collection(db, 'friendRequests'),
        where('fromId', '==', senderId),
        where('toId', '==', receiverId),
        where('status', '==', 'pending')
      );
      const existing = await getDocs(q);
      if (!existing.empty) throw new Error('Request already pending');

      // Process & Database Transaction
      const requestData = {
        fromId: senderId,
        toId: receiverId,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'friendRequests'), requestData);

      // Notification
      await addDoc(collection(db, 'notifications'), {
        userId: receiverId,
        type: 'friend_request',
        fromId: senderId,
        text: 'Sent you a friend request',
        read: false,
        createdAt: serverTimestamp()
      });

      return { requestId: docRef.id };
    });
  }

  static async acceptFriendRequest(requestId: string): Promise<ActionResponse> {
    return this.execute('ACCEPT_FRIEND_REQUEST', { requestId }, async (params, userId) => {
      const { requestId } = params;

      return await runTransaction(db, async (transaction) => {
        const requestRef = doc(db, 'friendRequests', requestId);
        const requestDoc = await transaction.get(requestRef);

        if (!requestDoc.exists()) throw new Error('Request exists');
        const data = requestDoc.data();
        if (data.toId !== userId) throw new Error('User owns request');
        if (data.status !== 'pending') throw new Error('Request pending');

        // Update Request
        transaction.update(requestRef, { status: 'accepted', updatedAt: serverTimestamp() });

        // Create Friendship (Update both users)
        const senderRef = doc(db, 'users', data.fromId);
        const receiverRef = doc(db, 'users', data.toId);

        transaction.update(senderRef, { friends: arrayUnion(data.toId) });
        transaction.update(receiverRef, { friends: arrayUnion(data.fromId) });

        // Notification
        const notificationRef = doc(collection(db, 'notifications'));
        transaction.set(notificationRef, {
          userId: data.fromId,
          type: 'friend_request_accepted',
          fromId: userId,
          text: 'Accepted your friend request',
          read: false,
          createdAt: serverTimestamp()
        });

        return { friendshipCreated: true };
      });
    });
  }

  static async blockUser(targetId: string): Promise<ActionResponse> {
    return this.execute('BLOCK_USER', { targetId }, async (params, userId) => {
      const { targetId } = params;

      const targetDoc = await getDoc(doc(db, 'users', targetId));
      if (!targetDoc.exists()) throw new Error('Target exists');

      await addDoc(collection(db, 'blocks'), {
        userId,
        targetId,
        createdAt: serverTimestamp()
      });

      return { blocked: true };
    });
  }

  // --- DATING ACTION COMMANDS ---

  static async likeProfile(targetId: string): Promise<ActionResponse> {
    return this.execute('LIKE_PROFILE', { targetId }, async (params, userId) => {
      const { targetId } = params;

      if (userId === targetId) throw new Error('Cannot like self');

      // Check mutual like
      const mutualQuery = query(
        collection(db, 'likes'),
        where('userId', '==', targetId),
        where('targetId', '==', userId)
      );
      const mutualSnap = await getDocs(mutualQuery);
      const isMutual = !mutualSnap.empty;

      await addDoc(collection(db, 'likes'), {
        userId,
        targetId,
        createdAt: serverTimestamp()
      });

      if (isMutual) {
        // Create Match
        await addDoc(collection(db, 'matches'), {
          participants: [userId, targetId],
          createdAt: serverTimestamp()
        });

        // Notifications
        const notify = async (uid: string, otherId: string) => {
          await addDoc(collection(db, 'notifications'), {
            userId: uid,
            type: 'match',
            fromId: otherId,
            text: 'You have a new match!',
            read: false,
            createdAt: serverTimestamp()
          });
        };
        await notify(userId, targetId);
        await notify(targetId, userId);

        return { matched: true };
      }

      return { liked: true };
    });
  }

  static async matchUser(targetId: string): Promise<ActionResponse> {
    return this.execute('MATCH_USER', { targetId }, async (params, userId) => {
      const { targetId } = params;

      return await runTransaction(db, async (transaction) => {
        const matchQuery = query(
          collection(db, 'matches'),
          where('participants', 'array-contains', userId)
        );
        const matchSnap = await getDocs(matchQuery);
        const existingMatch = matchSnap.docs.find(doc => doc.data().participants.includes(targetId));

        if (existingMatch) throw new Error('Already matched');

        const matchRef = doc(collection(db, 'matches'));
        transaction.set(matchRef, {
          participants: [userId, targetId],
          createdAt: serverTimestamp()
        });

        // Notifications
        const notify = (uid: string, otherId: string) => {
          const notifRef = doc(collection(db, 'notifications'));
          transaction.set(notifRef, {
            userId: uid,
            type: 'match',
            fromId: otherId,
            text: 'You have a new match!',
            read: false,
            createdAt: serverTimestamp()
          });
        };
        notify(userId, targetId);
        notify(targetId, userId);

        return { matchId: matchRef.id };
      });
    });
  }

  static async unmatchUser(matchId: string): Promise<ActionResponse> {
    return this.execute('UNMATCH_USER', { matchId }, async (params, userId) => {
      const { matchId } = params;
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);

      if (!matchDoc.exists()) throw new Error('Match exists');
      if (!matchDoc.data().participants.includes(userId)) throw new Error('User belongs to match');

      await deleteDoc(matchRef);
      return { removed: true };
    });
  }

  // --- CHAT ACTION COMMANDS ---

  static async sendMessage(conversationId: string, text: string): Promise<ActionResponse> {
    return this.execute('SEND_MESSAGE', { conversationId, text }, async (params, userId) => {
      const { conversationId, text } = params;
      if (!text.trim()) throw new Error('Message not empty');

      const convRef = doc(db, 'conversations', conversationId);
      const convDoc = await getDoc(convRef);
      if (!convDoc.exists()) throw new Error('Conversation exists');
      const convData = convDoc.data();
      if (!convData.participants.includes(userId)) throw new Error('User in conversation');

      const messageData = {
        senderId: userId,
        text,
        read: false,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, `conversations/${conversationId}/messages`), messageData);
      
      // Update last message in conversation
      await updateDoc(convRef, {
        lastMessage: text,
        updatedAt: serverTimestamp()
      });

      // Notification
      const otherId = convData.participants.find((id: string) => id !== userId);
      if (otherId) {
        await addDoc(collection(db, 'notifications'), {
          userId: otherId,
          type: 'new_message',
          fromId: userId,
          text: 'Sent you a message',
          read: false,
          createdAt: serverTimestamp()
        });
      }

      return { messageId: docRef.id };
    });
  }

  static async readMessage(messageId: string): Promise<ActionResponse> {
    return this.execute('READ_MESSAGE', { messageId }, async (params, userId) => {
      const { messageId } = params;
      const msgRef = doc(db, 'messages', messageId);
      const msgDoc = await getDoc(msgRef);

      if (!msgDoc.exists()) throw new Error('Message exists');
      // In a real app, check if userId is the receiver
      
      await updateDoc(msgRef, { read: true });
      return { read: true };
    });
  }

  // --- PAYMENT ACTION COMMANDS ---

  static async makePayment(amount: number, method: string): Promise<ActionResponse> {
    return this.execute('MAKE_PAYMENT', { amount, method }, async (params, userId) => {
      const { amount, method } = params;
      if (amount <= 0) throw new Error('Amount valid');

      const transactionData = {
        userId,
        amount,
        method,
        status: 'completed',
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'payments'), transactionData);
      
      // Update wallet
      const userRef = doc(db, 'users', userId);
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const currentBalance = userDoc.data()?.walletBalance || 0;
        transaction.update(userRef, { walletBalance: currentBalance + amount });
      });

      return { transactionId: docRef.id };
    });
  }

  static async subscribeUser(creatorId: string): Promise<ActionResponse> {
    return this.execute('SUBSCRIBE_USER', { creatorId }, async (params, userId) => {
      const { creatorId } = params;
      const creatorDoc = await getDoc(doc(db, 'users', creatorId));
      if (!creatorDoc.exists()) throw new Error('Creator exists');

      await addDoc(collection(db, 'subscriptions'), {
        userId,
        creatorId,
        status: 'active',
        createdAt: serverTimestamp()
      });

      return { subscribed: true };
    });
  }

  // --- CONTENT ACTION COMMANDS ---

  static async createPost(text: string, mediaUrl?: string, mediaType?: string): Promise<ActionResponse> {
    return this.execute('CREATE_POST', { text, mediaUrl, mediaType }, async (params, userId) => {
      const { text, mediaUrl, mediaType } = params;
      if (!text.trim() && !mediaUrl) throw new Error('Content rules');

      const postData = {
        userId,
        text,
        mediaUrl,
        mediaType,
        likeCount: 0,
        commentCount: 0,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'posts'), postData);
      return { postId: docRef.id };
    });
  }

  static async likePost(postId: string): Promise<ActionResponse> {
    return this.execute('LIKE_POST', { postId }, async (params, userId) => {
      const { postId } = params;
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      if (!postDoc.exists()) throw new Error('Post exists');
      const postData = postDoc.data();

      await runTransaction(db, async (transaction) => {
        const postSnap = await transaction.get(postRef);
        const currentLikes = postSnap.data()?.likeCount || 0;
        
        transaction.update(postRef, { 
          likes: arrayUnion(userId),
          likeCount: currentLikes + 1 
        });

        // Notification
        if (postData.userId !== userId) {
          const notificationRef = doc(collection(db, 'notifications'));
          transaction.set(notificationRef, {
            userId: postData.userId,
            type: 'like',
            fromId: userId,
            text: 'Liked your post',
            read: false,
            createdAt: serverTimestamp()
          });
        }
      });

      return { liked: true };
    });
  }

  // --- REELS ACTION COMMANDS ---

  static async uploadReel(videoUrl: string): Promise<ActionResponse> {
    return this.execute('UPLOAD_REEL', { videoUrl }, async (params, userId) => {
      const { videoUrl } = params;
      
      const reelData = {
        userId,
        videoUrl,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'reels'), reelData);
      return { reelId: docRef.id };
    });
  }

  // --- NOTIFICATION ACTION COMMANDS ---

  static async createNotification(targetUserId: string, type: string, text: string): Promise<ActionResponse> {
    return this.execute('CREATE_NOTIFICATION', { targetUserId, type, text }, async (params) => {
      const { targetUserId, type, text } = params;
      
      const docRef = await addDoc(collection(db, 'notifications'), {
        userId: targetUserId,
        type,
        text,
        read: false,
        createdAt: serverTimestamp()
      });

      return { notificationId: docRef.id };
    });
  }

  // --- ADMIN ACTION COMMANDS ---

  static async banUser(targetUserId: string): Promise<ActionResponse> {
    return this.execute('BAN_USER', { targetUserId }, async (params, adminId) => {
      const { targetUserId } = params;

      // Permission Check
      const adminDoc = await getDoc(doc(db, 'users', adminId));
      if (adminDoc.data()?.role !== 'admin') throw new Error('Admin rights');

      await updateDoc(doc(db, 'users', targetUserId), {
        status: 'banned',
        bannedAt: serverTimestamp(),
        bannedBy: adminId
      });

      return { banned: true };
    });
  }
}
