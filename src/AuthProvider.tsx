import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { useDispatch } from 'react-redux';
import { setUser, setLoading } from './store/slices/authSlice';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          dispatch(setUser({ ...firebaseUser, ...userDoc.data() }));
        } else {
          dispatch(setUser(firebaseUser));
        }
      } else {
        dispatch(setUser(null));
      }
      dispatch(setLoading(false));
      setIsReady(true);
    });

    return () => unsubscribe();
  }, [dispatch]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return <>{children}</>;
};
