import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ActionService } from '../../services/ActionService';
import { Megaphone, Plus, Clock, DollarSign, Layout, Trash2, CheckCircle, AlertCircle, Image as ImageIcon, Upload, X } from 'lucide-react';
import LoadingScreen from '../../components/LoadingScreen';
import imageCompression from 'browser-image-compression';

interface Ad {
  id: string;
  userId: string;
  title: string;
  content: string;
  imageUrl: string;
  placement: 'feed' | 'sidebar';
  price: number;
  duration: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  expiresAt?: any;
}

const AdsPage: React.FC = () => {
  const { user } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    placement: 'feed' as 'feed' | 'sidebar',
    duration: 7, // days
  });

  const PRICES = {
    feed: 50, // $50 per week
    sidebar: 30, // $30 per week
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'ads'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const adsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ad[];
      setAds(adsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);
      setSelectedFile(compressedFile);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error("Error compressing image:", error);
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedFile) {
      alert("Please select an image for your ad.");
      return;
    }

    setIsUploading(true);
    const price = formData.placement === 'feed' ? PRICES.feed : PRICES.sidebar;
    
    try {
      // 1. Upload Image
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData
      });

      if (!uploadResponse.ok) throw new Error('Image upload failed');
      const { url } = await uploadResponse.json();

      // 2. Create Ad
      const response = await ActionService.createAd({
        ...formData,
        imageUrl: url,
        price,
      });

      if (response.status) {
        setIsCreateModalOpen(false);
        setFormData({
          title: '',
          content: '',
          placement: 'feed',
          duration: 7,
        });
        setUploadPreview(null);
        setSelectedFile(null);
        alert("Ad created successfully! It will appear once approved by an admin.");
      } else {
        alert(response.error || "Failed to create ad");
      }
    } catch (error) {
      console.error("Error creating ad:", error);
      alert("An error occurred while creating your ad. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!window.confirm("Are you sure you want to delete this ad?")) return;
    try {
      await ActionService.deleteAd(adId);
    } catch (error) {
      console.error("Error deleting ad:", error);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-slate-900 mb-2">Advertising</h1>
            <p className="text-slate-500 font-medium">Promote your business or profile to our community.</p>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-pink-500 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-pink-600 transition-all shadow-xl shadow-pink-500/20"
          >
            <Plus className="w-6 h-6" />
            Create New Ad
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ads.map((ad) => (
            <motion.div 
              key={ad.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden group"
            >
              <div className="relative h-48 bg-slate-100 overflow-hidden">
                {ad.imageUrl ? (
                  <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${
                    ad.status === 'approved' ? 'bg-green-500 text-white' :
                    ad.status === 'rejected' ? 'bg-red-500 text-white' :
                    'bg-yellow-400 text-white'
                  }`}>
                    {ad.status}
                  </span>
                </div>
              </div>

              <div className="p-8">
                <div className="flex items-center gap-2 mb-4">
                  <Layout className="w-4 h-4 text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{ad.placement} placement</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">{ad.title}</h3>
                <p className="text-slate-500 font-medium text-sm line-clamp-2 mb-6">{ad.content}</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <DollarSign className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Price</span>
                    </div>
                    <p className="text-sm font-black text-slate-900">${ad.price}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Duration</span>
                    </div>
                    <p className="text-sm font-black text-slate-900">{ad.duration} Days</p>
                  </div>
                </div>

                {ad.status === 'approved' && ad.expiresAt && (
                  <div className="flex items-center gap-2 text-green-600 mb-6 bg-green-50 p-3 rounded-xl">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-bold">Expires: {ad.expiresAt.toDate().toLocaleDateString()}</span>
                  </div>
                )}

                <button 
                  onClick={() => handleDeleteAd(ad.id)}
                  className="w-full py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-bold hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  Delete Ad
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {ads.length === 0 && (
          <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Megaphone className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">No Ads Yet</h3>
            <p className="text-slate-500 font-medium mb-8">Start promoting your content to reach more people.</p>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-pink-500 text-white px-8 py-4 rounded-2xl font-bold hover:bg-pink-600 transition-all"
            >
              Create Your First Ad
            </button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden my-auto md:my-8"
            >
              <div className="p-8 md:p-12">
                <h2 className="text-3xl font-black text-slate-900 mb-2">Create Ad</h2>
                <p className="text-slate-500 font-medium mb-8">Fill in the details to launch your campaign.</p>

                <form onSubmit={handleCreateAd} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Ad Title</label>
                    <input 
                      type="text" 
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-pink-500/20 font-medium"
                      placeholder="e.g. Summer Sale 2024"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Ad Content</label>
                    <textarea 
                      required
                      value={formData.content}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-pink-500/20 font-medium h-32 resize-none"
                      placeholder="Describe what you are promoting..."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Ad Image</label>
                    <div className="relative">
                      {uploadPreview ? (
                        <div className="relative aspect-video rounded-2xl overflow-hidden group">
                          <img src={uploadPreview} alt="Preview" className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => {setUploadPreview(null); setSelectedFile(null);}}
                            className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all group">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                            <Upload className="w-6 h-6 text-slate-400" />
                          </div>
                          <span className="text-sm font-bold text-slate-500">Click to upload ad image</span>
                          <span className="text-[10px] font-medium text-slate-400 mt-1">Recommended: 1200x630px</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Placement</label>
                      <select 
                        value={formData.placement}
                        onChange={(e) => setFormData({...formData, placement: e.target.value as 'feed' | 'sidebar'})}
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-pink-500/20 font-medium appearance-none"
                      >
                        <option value="feed">Feed Ad ($50)</option>
                        <option value="sidebar">Sidebar Ad ($30)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Duration (Days)</label>
                      <input 
                        type="number" 
                        min="1"
                        max="30"
                        required
                        value={formData.duration}
                        onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-pink-500/20 font-medium"
                      />
                    </div>
                  </div>

                  <div className="bg-pink-50 p-6 rounded-[2rem] flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest mb-1">Total Cost</p>
                      <p className="text-2xl font-black text-pink-600">${formData.placement === 'feed' ? PRICES.feed : PRICES.sidebar}</p>
                    </div>
                    <div className="flex items-center gap-2 text-pink-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Non-refundable</span>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isUploading}
                      className="flex-1 py-4 bg-pink-500 text-white rounded-2xl font-bold hover:bg-pink-600 transition-all shadow-xl shadow-pink-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isUploading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Uploading...
                        </>
                      ) : 'Pay & Launch'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdsPage;
