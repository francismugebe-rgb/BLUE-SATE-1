export const POINT_VALUES = {
  POST: 10,
  COMMENT: 5,
  REEL: 15,
  LIKE: 1,
};

export const accumulatePoints = async (userId: string, type: keyof typeof POINT_VALUES) => {
  try {
    await fetch('/api/wallet/accumulate-points', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ type })
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
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ amount, type, description, status })
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
  }
};
