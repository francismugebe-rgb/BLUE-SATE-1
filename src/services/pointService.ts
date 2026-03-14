import { doc, updateDoc, increment, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

export const POINT_VALUES = {
  POST: 10,
  COMMENT: 5,
  REEL: 15,
  LIKE: 1,
};

export const accumulatePoints = async (userId: string, type: keyof typeof POINT_VALUES) => {
  const points = POINT_VALUES[type];
  const userRef = doc(db, 'users', userId);
  
  try {
    await updateDoc(userRef, {
      points: increment(points)
    });
  } catch (error) {
    console.error('Error accumulating points:', error);
  }
};

import { TransactionType, TransactionStatus } from '../types';

export const createTransaction = async (
  userId: string, 
  amount: number, 
  type: TransactionType, 
  description?: string,
  status: TransactionStatus = TransactionStatus.COMPLETED
) => {
  try {
    await addDoc(collection(db, 'transactions'), {
      userId,
      amount,
      type,
      status,
      description,
      createdAt: new Date().toISOString()
    });
    
    if (status === TransactionStatus.COMPLETED) {
      const userRef = doc(db, 'users', userId);
      // For payments or withdrawals, amount should be negative
      await updateDoc(userRef, {
        walletBalance: increment(amount)
      });
    }
  } catch (error) {
    console.error('Error creating transaction:', error);
  }
};
