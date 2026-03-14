import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, arrayUnion, arrayRemove, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Post } from '../types';
import { Heart, MessageCircle, Share2, Image as ImageIcon, Send, MoreHorizontal, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';

const Feed: React.FC = () => {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedType, setFeedType] = useState<'global' | 'following'>('global');
  const [newPost, setNewPost] = useState('');
  const [postImage, setPostImage] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const postsRef = collection(db, 'posts');
    let q = query(postsRef, orderBy('createdAt', 'desc'));

    if (feedType === 'following' && profile?.following?.length) {
      q = query(postsRef, where('userId', 'in', profile.following), orderBy('createdAt', 'desc'));
    } else if (feedType === 'following') {
      // If following but no one followed, show nothing or empty
      setPosts([]);
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(postsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });
    return () => unsubscribe();
  }, [feedType, profile?.following]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newPost.trim()) return;
    setIsPosting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        userId: profile.uid,
        authorName: profile.name,
        authorPhoto: profile.photos?.[0] || '',
        content: newPost,
        image: postImage || null,
        likes: [],
        comments: [],
        createdAt: new Date().toISOString()
      });
      setNewPost('');
      setPostImage('');
    } catch (err) {
      console.error("Error creating post:", err);
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (post: Post) => {
    if (!profile) return;
    const postRef = doc(db, 'posts', post.id);
    const isLiked = post.likes.includes(profile.uid);
    
    try {
      if (isLiked) {
        await updateDoc(postRef, { likes: arrayRemove(profile.uid) });
      } else {
        await updateDoc(postRef, { likes: arrayUnion(profile.uid) });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const handleComment = async (postId: string) => {
    if (!profile || !commentText[postId]?.trim()) return;
    const postRef = doc(db, 'posts', postId);
    const newComment = {
      userId: profile.uid,
      userName: profile.name,
      comment: commentText[postId],
      createdAt: new Date().toISOString()
    };

    try {
      await updateDoc(postRef, {
        comments: arrayUnion(newComment)
      });
      setCommentText(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!profile || profile.uid === targetUserId) return;
    const isFollowing = profile.following?.includes(targetUserId);
    const myRef = doc(db, 'users', profile.uid);
    const theirRef = doc(db, 'users', targetUserId);

    try {
      if (isFollowing) {
        await updateDoc(myRef, { following: arrayRemove(targetUserId) });
        await updateDoc(theirRef, { followers: arrayRemove(profile.uid) });
      } else {
        await updateDoc(myRef, { following: arrayUnion(targetUserId) });
        await updateDoc(theirRef, { followers: arrayUnion(profile.uid) });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Feed Tabs */}
      <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl w-fit mx-auto">
        <button 
          onClick={() => setFeedType('global')}
          className={cn(
            "px-6 py-2 rounded-xl font-bold text-sm transition-all",
            feedType === 'global' ? "bg-white text-[#ff3366] shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Global
        </button>
        <button 
          onClick={() => setFeedType('following')}
          className={cn(
            "px-6 py-2 rounded-xl font-bold text-sm transition-all",
            feedType === 'following' ? "bg-white text-[#ff3366] shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Following
        </button>
      </div>
      {/* Create Post */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
        <div className="flex gap-4">
          <img src={profile?.photos?.[0] || `https://picsum.photos/seed/${profile?.uid}/100/100`} className="w-12 h-12 rounded-2xl object-cover" referrerPolicy="no-referrer" />
          <form onSubmit={handleCreatePost} className="flex-1 space-y-4">
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10 focus:border-[#ff3366] transition-all resize-none h-24"
            />
            {postImage && (
              <div className="relative">
                <img src={postImage} className="w-full h-40 object-cover rounded-2xl" />
                <button 
                  onClick={() => setPostImage('')}
                  className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex justify-between items-center">
              <button 
                type="button" 
                onClick={() => {
                  const url = prompt("Enter image URL:");
                  if (url) setPostImage(url);
                }}
                className="flex items-center gap-2 text-slate-500 hover:text-[#ff3366] transition-colors font-medium"
              >
                <ImageIcon className="w-5 h-5" />
                <span>Photo</span>
              </button>
              <button
                type="submit"
                disabled={isPosting || !newPost.trim()}
                className="bg-[#ff3366] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#e62e5c] transition-all disabled:opacity-50"
              >
                {isPosting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3">
                  <img src={post.authorPhoto || `https://picsum.photos/seed/${post.userId}/100/100`} className="w-12 h-12 rounded-2xl object-cover" referrerPolicy="no-referrer" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900">{post.authorName}</h4>
                      {profile?.uid !== post.userId && (
                        <button 
                          onClick={() => handleFollow(post.userId)}
                          className="text-xs font-bold text-[#ff3366] hover:underline"
                        >
                          {profile?.following?.includes(post.userId) ? 'Following' : '+ Follow'}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-medium">
                      {formatDistanceToNow(new Date(post.createdAt))} ago
                    </p>
                  </div>
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-slate-700 leading-relaxed mb-4 whitespace-pre-wrap">
                {post.content}
              </p>
              
              {post.image && (
                <img src={post.image} className="w-full rounded-2xl mb-4 object-cover max-h-96" referrerPolicy="no-referrer" />
              )}
              
              <div className="flex items-center gap-6 pt-4 border-t border-slate-50">
                <button 
                  onClick={() => handleLike(post)}
                  className={cn(
                    "flex items-center gap-2 transition-colors font-bold text-sm",
                    post.likes.includes(profile?.uid || '') ? "text-[#ff3366]" : "text-slate-400 hover:text-[#ff3366]"
                  )}
                >
                  <Heart className={cn("w-5 h-5", post.likes.includes(profile?.uid || '') && "fill-current")} />
                  <span>{post.likes.length}</span>
                </button>
                <button className="flex items-center gap-2 text-slate-400 hover:text-[#6c5ce7] transition-colors font-bold text-sm">
                  <MessageCircle className="w-5 h-5" />
                  <span>{post.comments.length}</span>
                </button>
                <button className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors font-bold text-sm">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>

              {/* Comments Section */}
              <div className="mt-6 space-y-4">
                {post.comments.map((comment, idx) => (
                  <div key={idx} className="flex gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex-shrink-0" />
                    <div className="bg-slate-50 rounded-2xl p-3 flex-1">
                      <span className="font-bold text-slate-900 mr-2">{comment.userName}</span>
                      <span className="text-slate-600">{comment.comment}</span>
                    </div>
                  </div>
                ))}
                
                <div className="flex gap-3 items-center pt-2">
                  <img src={profile?.photos?.[0] || ''} className="w-8 h-8 rounded-lg object-cover" />
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={commentText[post.id] || ''}
                      onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                      placeholder="Write a comment..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10 focus:border-[#ff3366] text-sm"
                    />
                    <button 
                      onClick={() => handleComment(post.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#ff3366]"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Feed;
