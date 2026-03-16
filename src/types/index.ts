export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  age?: number;
  gender?: string;
  interestedIn?: string;
  country?: string;
  city?: string;
  nationality?: string;
  location?: string;
  bio?: string;
  interests?: string[];
  photos?: string[];
  coverPhoto?: string;
  relationshipPreference?: string;
  relationshipStatus?: string;
  occupation?: string;
  height?: number;
  lifestyle?: string[];
  matches?: string[];
  likes?: string[];
  dislikes?: string[];
  followers?: string[];
  following?: string[];
  role: 'user' | 'admin';
  isVerified: boolean;
  isVerifiedPending?: boolean;
  isPremium?: boolean;
  isBanned?: boolean;
  isSuspended?: boolean;
  suspensionUntil?: string;
  points: number;
  walletBalance?: number;
  level: 'Bronze' | 'Gold' | 'Platinum';
  savedProducts?: string[];
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  authorName: string;
  authorPhoto?: string;
  isVerified: boolean;
  content: string;
  image?: string;
  linkPreview?: {
    title?: string;
    description?: string;
    image?: string;
    url: string;
  };
  likes: { userId: string; emoji?: string }[];
  comments: Comment[];
  views: number;
  createdAt: string;
}

export interface Page {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  isVerified: boolean;
  followers: string[];
  likes: string[];
  avatarUrl?: string;
  coverUrl?: string;
  createdAt: string;
}

export interface Group {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  members: string[];
  privacy: 'public' | 'private';
  coverPhoto?: string;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetId: string;
  targetType: 'user' | 'post' | 'comment' | 'reel';
  reason: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

export interface Advert {
  id: string;
  sponsorId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  link: string;
  type: 'cpc' | 'impression';
  budget: number;
  spent: number;
  clicks: number;
  impressions: number;
  status: 'active' | 'paused' | 'completed' | 'pending' | 'rejected';
  createdAt: string;
}

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  PAYMENT = 'payment',
  POINTS_CONVERSION = 'points_conversion'
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  description?: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: string;
  updatedAt: string;
}

export interface Comment {
  userId: string;
  userName: string;
  comment: string;
  createdAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  text: string;
  image?: string;
  read: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  receiverId: string;
  senderId: string;
  senderName: string;
  type: 'match' | 'message' | 'like' | 'comment' | 'follow' | 'verification' | 'page_follow' | 'group_join';
  relatedId?: string;
  read: boolean;
  createdAt: string;
}

export interface Reel {
  id: string;
  userId: string;
  authorName: string;
  authorPhoto?: string;
  videoUrl: string;
  caption: string;
  likes: string[];
  comments: Comment[];
  views: number;
  createdAt: string;
}

export interface Product {
  id: string;
  userId: string;
  authorName: string;
  title: string;
  description: string;
  price: number;
  image: string;
  category: string;
  createdAt: string;
}
