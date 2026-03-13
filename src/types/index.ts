export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  age?: number;
  gender?: string;
  location?: string;
  bio?: string;
  interests?: string[];
  photos?: string[];
  relationshipPreference?: string;
  occupation?: string;
  height?: number;
  lifestyle?: string[];
  matches?: string[];
  likes?: string[];
  dislikes?: string[];
  followers?: string[];
  following?: string[];
  role: 'user' | 'admin';
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  image?: string;
  likes: string[];
  comments: Comment[];
  createdAt: string;
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
  type: 'match' | 'message' | 'like' | 'comment' | 'follow';
  relatedId?: string;
  read: boolean;
  createdAt: string;
}
