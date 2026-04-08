import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { User, MapPin, Calendar, Heart, Sparkles, Save, ArrowLeft, Zap } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const COUNTRIES_CITIES: Record<string, string[]> = {
  'Zimbabwe': ['Harare', 'Bulawayo', 'Chitungwiza', 'Mutare', 'Epworth', 'Gweru', 'Kwekwe', 'Kadoma', 'Masvingo', 'Chinhoyi'],
  'South Africa': ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein', 'East London', 'Sandton', 'Midrand', 'Randburg'],
  'Nigeria': ['Lagos', 'Kano', 'Ibadan', 'Benin City', 'Port Harcourt', 'Jos', 'Ilorin', 'Abuja', 'Kaduna', 'Enugu'],
  'Kenya': ['Nairobi', 'Mombasa', 'Nakuru', 'Kisumu', 'Eldoret', 'Kehancha', 'Ruiru', 'Kikuyu', 'Kangundo-Tala', 'Malindi'],
  'Ghana': ['Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Atsiaman', 'Tema', 'Teshi', 'Cape Coast', 'Sekondi', 'Obuasi']
};

const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const location = useLocation();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(
    location.state?.incomplete ? { type: 'warning', text: 'Please fill in your Name and Surname to continue using the app.' } : null
  );

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
    age: user?.age || 18,
    country: user?.location?.split(', ')[1] || '',
    city: user?.location?.split(', ')[0] || '',
    gender: user?.gender || '',
    lookingFor: user?.lookingFor || '',
    interests: user?.interests?.join(', ') || '',
    isDatingActive: user?.isDatingActive || false,
    phoneNumber: user?.phoneNumber || ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: user.bio || '',
        age: user.age || 18,
        country: user.location?.split(', ')[1] || '',
        city: user.location?.split(', ')[0] || '',
        gender: user.gender || '',
        lookingFor: user.lookingFor || '',
        interests: user.interests?.join(', ') || '',
        isDatingActive: user.isDatingActive || false,
        phoneNumber: user.phoneNumber || ''
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    if (!formData.firstName || !formData.lastName) {
      setMessage({ type: 'error', text: 'Name and Surname are required.' });
      setIsSaving(false);
      return;
    }

    if (formData.isDatingActive && (!formData.age || !formData.gender || !formData.country || !formData.city)) {
      setMessage({ type: 'error', text: 'Age, Gender, and Location are required for dating.' });
      setIsSaving(false);
      return;
    }

    try {
      await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        displayName: `${formData.firstName} ${formData.lastName}`,
        bio: formData.bio,
        age: Number(formData.age),
        location: formData.city && formData.country ? `${formData.city}, ${formData.country}` : '',
        gender: formData.gender,
        lookingFor: formData.lookingFor,
        interests: formData.interests.split(',').map(i => i.trim()).filter(i => i !== ''),
        isDatingActive: formData.isDatingActive,
        phoneNumber: formData.phoneNumber
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const getTierColor = (tier?: string) => {
    switch(tier) {
      case 'bronze': return 'bg-orange-500';
      case 'gold': return 'bg-yellow-500';
      case 'platinum': return 'bg-slate-300';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-pink-500 transition-colors font-bold">
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>
          <div className="flex items-center gap-4">
            <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-black text-slate-900">{user?.points || 0} Points</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900">Your Profile</h1>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
        >
          <div className="p-8 md:p-12">
            {message && (
              <div className={`mb-8 p-4 rounded-2xl font-bold text-sm ${
                message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 
                message.type === 'warning' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                'bg-red-50 text-red-600 border border-red-100'
              }`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Profile Header */}
              <div className="flex flex-col md:flex-row items-center gap-8 pb-8 border-b border-slate-100">
                <div className="relative group">
                  <div className="w-32 h-32 bg-pink-50 rounded-[2rem] flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-12 h-12 text-pink-300" />
                    )}
                  </div>
                  {user?.isVerified && (
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-500 rounded-xl shadow-md border border-white flex items-center justify-center text-white">
                      <Sparkles className="w-5 h-5 fill-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                    <h2 className="text-2xl font-black text-slate-900">
                      {formData.firstName || formData.lastName ? `${formData.firstName} ${formData.lastName}` : 'Set your name'}
                    </h2>
                    {user?.proTier && user.proTier !== 'none' && (
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest ${getTierColor(user.proTier)}`}>
                        {user.proTier}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 font-medium">{user?.email}</p>
                  <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3">
                    <label className="flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-600 rounded-xl cursor-pointer hover:bg-pink-100 transition-all">
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={formData.isDatingActive}
                        onChange={(e) => setFormData({...formData, isDatingActive: e.target.checked})}
                      />
                      <Heart className={`w-4 h-4 ${formData.isDatingActive ? 'fill-pink-600' : ''}`} />
                      <span className="text-sm font-bold">{formData.isDatingActive ? 'Dating Active' : 'Activate Dating'}</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">First Name</label>
                  <input 
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium"
                    placeholder="First Name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Surname</label>
                  <input 
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium"
                    placeholder="Surname"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Country</label>
                  <select 
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value, city: ''})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium appearance-none"
                  >
                    <option value="">Select Country</option>
                    {Object.keys(COUNTRIES_CITIES).map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">City</label>
                  <select 
                    value={formData.city}
                    disabled={!formData.country}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium appearance-none disabled:opacity-50"
                  >
                    <option value="">Select City</option>
                    {formData.country && COUNTRIES_CITIES[formData.country].map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">WhatsApp Number</label>
                  <input 
                    type="text"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium"
                    placeholder="+263..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Age</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({...formData, age: Number(e.target.value)})}
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium"
                      min="18"
                      max="100"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Gender</label>
                  <select 
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium appearance-none"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Interested In</label>
                  <select 
                    value={formData.lookingFor}
                    onChange={(e) => setFormData({...formData, lookingFor: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium appearance-none"
                  >
                    <option value="">Select Preference</option>
                    <option value="male">Men</option>
                    <option value="female">Women</option>
                    <option value="everyone">Everyone</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Bio</label>
                <textarea 
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  rows={4}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Interests (comma separated)</label>
                <input 
                  type="text"
                  value={formData.interests}
                  onChange={(e) => setFormData({...formData, interests: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium"
                  placeholder="Hiking, Cooking, Travel..."
                />
              </div>

              {/* Pro Upgrade Section */}
              <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                  <h3 className="text-2xl font-black mb-6 flex items-center gap-2">
                    <Zap className="w-6 h-6 text-pink-500 fill-pink-500" />
                    Upgrade to Pro
                  </h3>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {[
                      { tier: 'bronze', price: '9.99', color: 'bg-orange-500' },
                      { tier: 'gold', price: '19.99', color: 'bg-yellow-500' },
                      { tier: 'platinum', price: '29.99', color: 'bg-slate-300 text-slate-900' },
                    ].map((plan) => (
                      <button
                        key={plan.tier}
                        type="button"
                        onClick={() => updateProfile({ proTier: plan.tier as any })}
                        className={`p-6 rounded-3xl border border-white/10 hover:border-white/30 transition-all text-center group ${user?.proTier === plan.tier ? 'ring-2 ring-pink-500 bg-white/5' : ''}`}
                      >
                        <div className={`w-10 h-10 ${plan.color} rounded-xl mx-auto mb-4 flex items-center justify-center font-black text-xs uppercase`}>
                          {plan.tier[0]}
                        </div>
                        <div className="font-black uppercase tracking-widest text-[10px] mb-1">{plan.tier}</div>
                        <div className="text-xl font-black">${plan.price}</div>
                        <div className="text-[10px] font-bold opacity-60 mt-2 group-hover:opacity-100 transition-opacity">
                          {user?.proTier === plan.tier ? 'Current Plan' : 'Select Plan'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300 text-white font-bold py-4 rounded-2xl shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  {isSaving ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Profile Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
