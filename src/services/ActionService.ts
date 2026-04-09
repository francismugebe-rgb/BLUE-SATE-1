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
  | 'DECLINE_FRIEND_REQUEST'
  | 'CANCEL_FRIEND_REQUEST'
  | 'BLOCK_USER'
  | 'LIKE_PROFILE'
  | 'MATCH_USER'
  | 'UNMATCH_USER'
  | 'SEND_MESSAGE'
  | 'READ_MESSAGE'
  | 'READ_NOTIFICATION'
  | 'MAKE_PAYMENT'
  | 'SUBSCRIBE_USER'
  | 'CREATE_POST'
  | 'LIKE_POST'
  | 'UPLOAD_REEL'
  | 'CREATE_NOTIFICATION'
  | 'CREATE_AD'
  | 'APPROVE_AD'
  | 'DELETE_AD'
  | 'BAN_USER'
  | 'CREATE_PAGE'
  | 'FOLLOW_PAGE'
  | 'LIKE_PAGE'
  | 'CREATE_PAGE_POST'
  | 'SEND_PAGE_MESSAGE';

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

      // 2. Audit Logging - Filter out undefined values to prevent Firestore errors
      const sanitizedParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== undefined)
      );

      await addDoc(collection(db, 'auditLogs'), {
        action: name,
        userId: currentUser.uid,
        params: sanitizedParams,
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
      if (!receiverDoc.exists()) throw new Error('Receiver does not exist');

      // Check if already friends
      const senderDoc = await getDoc(doc(db, 'users', senderId));
      const senderData = senderDoc.data();
      if (senderData?.friends?.includes(receiverId)) throw new Error('Already friends');

      // Check if blocked
      const blockQuery = query(
        collection(db, 'blocks'),
        where('userId', '==', receiverId),
        where('targetId', '==', senderId)
      );
      const blockSnap = await getDocs(blockQuery);
      if (!blockSnap.empty) throw new Error('User has blocked you');

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
        actorId: senderId,
        type: 'friend_request',
        title: 'New Friend Request',
        message: 'You have a new friend request',
        referenceId: docRef.id,
        readStatus: false,
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

        if (!requestDoc.exists()) throw new Error('Request not found');
        const data = requestDoc.data();
        if (data.toId !== userId) throw new Error('Unauthorized');
        if (data.status !== 'pending') throw new Error('Request no longer pending');

        // Update Request
        transaction.update(requestRef, { status: 'accepted', updatedAt: serverTimestamp() });

        // Create Friendship (Update both users)
        const senderRef = doc(db, 'users', data.fromId);
        const receiverRef = doc(db, 'users', data.toId);

        transaction.update(senderRef, { friends: arrayUnion(data.toId) });
        transaction.update(receiverRef, { friends: arrayUnion(data.fromId) });

        // Notification to sender
        const notificationRef = doc(collection(db, 'notifications'));
        transaction.set(notificationRef, {
          userId: data.fromId,
          actorId: userId,
          type: 'friend_accept',
          title: 'Friend Request Accepted',
          message: 'Your friend request was accepted',
          referenceId: requestId,
          readStatus: false,
          createdAt: serverTimestamp()
        });

        return { friendshipCreated: true };
      });
    });
  }

  static async declineFriendRequest(requestId: string): Promise<ActionResponse> {
    return this.execute('DECLINE_FRIEND_REQUEST', { requestId }, async (params, userId) => {
      const { requestId } = params;
      const requestRef = doc(db, 'friendRequests', requestId);
      const requestDoc = await getDoc(requestRef);

      if (!requestDoc.exists()) throw new Error('Request not found');
      const data = requestDoc.data();
      if (data.toId !== userId) throw new Error('Unauthorized');
      if (data.status !== 'pending') throw new Error('Request no longer pending');

      await updateDoc(requestRef, { status: 'declined', updatedAt: serverTimestamp() });

      // Optional: Notify sender about decline? The spec says "Update status declined" and "EVENT: FRIEND_REQUEST_DECLINED"
      // Usually we don't notify about declines to avoid negative feelings, but we can if requested.
      
      return { declined: true };
    });
  }

  static async cancelFriendRequest(requestId: string): Promise<ActionResponse> {
    return this.execute('CANCEL_FRIEND_REQUEST', { requestId }, async (params, userId) => {
      const { requestId } = params;
      const requestRef = doc(db, 'friendRequests', requestId);
      const requestDoc = await getDoc(requestRef);

      if (!requestDoc.exists()) throw new Error('Request not found');
      const data = requestDoc.data();
      if (data.fromId !== userId) throw new Error('Unauthorized');
      if (data.status !== 'pending') throw new Error('Request no longer pending');

      await deleteDoc(requestRef);

      // Also delete the notification sent to the receiver
      const notifQuery = query(
        collection(db, 'notifications'),
        where('referenceId', '==', requestId),
        where('type', '==', 'friend_request')
      );
      const notifSnap = await getDocs(notifQuery);
      notifSnap.forEach(async (d) => {
        await deleteDoc(d.ref);
      });

      return { cancelled: true };
    });
  }

  static async readNotification(notificationId: string): Promise<ActionResponse> {
    return this.execute('READ_NOTIFICATION', { notificationId }, async (params, userId) => {
      const { notificationId } = params;
      const notifRef = doc(db, 'notifications', notificationId);
      const notifDoc = await getDoc(notifRef);

      if (!notifDoc.exists()) throw new Error('Notification not found');
      if (notifDoc.data().userId !== userId) throw new Error('Unauthorized');

      // Mark as read and potentially delete if "clear notification" means removal
      // The user said: "If notification is read please clear notification as well"
      // I'll delete it to "clear" it.
      await deleteDoc(notifRef);
      return { cleared: true };
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
            actorId: otherId,
            type: 'match',
            title: 'New Match!',
            message: 'You have a new match!',
            readStatus: false,
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
            actorId: otherId,
            type: 'match',
            title: 'New Match!',
            message: 'You have a new match!',
            readStatus: false,
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
        status: 'sent', // 'sent', 'delivered', 'read'
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
          actorId: userId,
          type: 'new_message',
          title: 'New Message',
          message: 'Sent you a message',
          referenceId: conversationId,
          readStatus: false,
          createdAt: serverTimestamp()
        });
      }

      return { messageId: docRef.id };
    });
  }

  static async markMessagesAsRead(conversationId: string): Promise<ActionResponse> {
    return this.execute('READ_MESSAGE', { conversationId }, async (params, userId) => {
      const { conversationId } = params;
      const q = query(
        collection(db, `conversations/${conversationId}/messages`),
        where('senderId', '!=', userId),
        where('status', '!=', 'read')
      );
      
      const snapshot = await getDocs(q);
      const batch = snapshot.docs.map(d => updateDoc(d.ref, { status: 'read' }));
      await Promise.all(batch);

      return { readCount: snapshot.size };
    });
  }

  // --- ADVERTISING ACTION COMMANDS ---

  static async createAd(data: { title: string, content: string, imageUrl: string, placement: 'feed' | 'sidebar', price: number, duration: number }): Promise<ActionResponse> {
    return this.execute('CREATE_AD', data, async (params, userId) => {
      const { title, content, imageUrl, placement, price, duration } = params;
      
      // Check balance
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      const balance = userDoc.data()?.walletBalance || 0;
      if (balance < price) throw new Error('Insufficient funds');

      const adData = {
        userId,
        title,
        content,
        imageUrl,
        placement,
        price,
        duration,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'ads'), adData);
      
      // Deduct funds immediately or on approval? Usually on creation for ads.
      await updateDoc(userRef, { walletBalance: balance - price });

      return { adId: docRef.id };
    });
  }

  static async approveAd(adId: string): Promise<ActionResponse> {
    return this.execute('APPROVE_AD', { adId }, async (params, adminId) => {
      const { adId } = params;
      const adminDoc = await getDoc(doc(db, 'users', adminId));
      if (adminDoc.data()?.role !== 'admin') throw new Error('Admin rights required');

      const adRef = doc(db, 'ads', adId);
      const adDoc = await getDoc(adRef);
      if (!adDoc.exists()) throw new Error('Ad not found');

      const durationDays = adDoc.data().duration;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      await updateDoc(adRef, { 
        status: 'approved', 
        approvedAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt)
      });

      return { approved: true };
    });
  }

  static async deleteAd(adId: string): Promise<ActionResponse> {
    return this.execute('DELETE_AD', { adId }, async (params, userId) => {
      const { adId } = params;
      const adRef = doc(db, 'ads', adId);
      const adDoc = await getDoc(adRef);
      if (!adDoc.exists()) throw new Error('Ad not found');

      const adminDoc = await getDoc(doc(db, 'users', userId));
      if (adDoc.data().userId !== userId && adminDoc.data()?.role !== 'admin') {
        throw new Error('Unauthorized');
      }

      await deleteDoc(adRef);
      return { deleted: true };
    });
  }

  // --- PAYMENT ACTION COMMANDS ---

  static async makePayment(amount: number, method: string, userName?: string): Promise<ActionResponse> {
    return this.execute('MAKE_PAYMENT', { amount, method, userName }, async (params, userId) => {
      const { amount, method, userName } = params;
      if (amount <= 0) throw new Error('Amount valid');

      const transactionData = {
        userId,
        userName: userName || 'Unknown User',
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

      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();

      const postData = {
        userId,
        displayName: userData?.displayName || 'Anonymous',
        photoURL: userData?.photoURL || '',
        isSuperAdmin: userData?.isSuperAdmin || false,
        isVerified: userData?.isVerified || false,
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
            actorId: userId,
            type: 'like',
            title: 'New Like',
            message: 'Liked your post',
            referenceId: postId,
            readStatus: false,
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

  static async createNotification(targetUserId: string, type: string, title: string, message: string, referenceId?: string): Promise<ActionResponse> {
    return this.execute('CREATE_NOTIFICATION', { targetUserId, type, title, message, referenceId }, async (params, actorId) => {
      const { targetUserId, type, title, message, referenceId } = params;
      
      const docRef = await addDoc(collection(db, 'notifications'), {
        userId: targetUserId,
        actorId,
        type,
        title,
        message,
        referenceId: referenceId || null,
        readStatus: false,
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

  // --- PAGE ACTION COMMANDS ---

  static async createPage(name: string, description: string, category: string): Promise<ActionResponse> {
    return this.execute('CREATE_PAGE', { name, description, category }, async (params, userId) => {
      const { name, description, category } = params;
      const pageData = {
        ownerId: userId,
        name,
        description,
        category,
        followers: [],
        likes: [],
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'pages'), pageData);
      return { pageId: docRef.id };
    });
  }

  static async followPage(pageId: string): Promise<ActionResponse> {
    return this.execute('FOLLOW_PAGE', { pageId }, async (params, userId) => {
      const { pageId } = params;
      const pageRef = doc(db, 'pages', pageId);
      await updateDoc(pageRef, {
        followers: arrayUnion(userId)
      });
      return { followed: true };
    });
  }

  static async likePage(pageId: string): Promise<ActionResponse> {
    return this.execute('LIKE_PAGE', { pageId }, async (params, userId) => {
      const { pageId } = params;
      const pageRef = doc(db, 'pages', pageId);
      await updateDoc(pageRef, {
        likes: arrayUnion(userId)
      });
      return { liked: true };
    });
  }

  static async createPagePost(pageId: string, text: string, mediaUrl?: string, mediaType?: string): Promise<ActionResponse> {
    return this.execute('CREATE_PAGE_POST', { pageId, text, mediaUrl, mediaType }, async (params, userId) => {
      const { pageId, text, mediaUrl, mediaType } = params;
      const pageDoc = await getDoc(doc(db, 'pages', pageId));
      if (pageDoc.data()?.ownerId !== userId) throw new Error('Unauthorized');

      const postData = {
        pageId,
        userId, // The admin who posted
        text,
        mediaUrl,
        mediaType,
        likeCount: 0,
        commentCount: 0,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, `pages/${pageId}/posts`), postData);
      return { postId: docRef.id };
    });
  }
}
