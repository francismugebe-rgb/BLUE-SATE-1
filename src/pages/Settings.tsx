import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Bell, Lock, Eye, Trash2, ChevronRight } from 'lucide-react';

const Settings: React.FC = () => {
  const { profile } = useAuth();

  const sections = [
    {
      title: 'Account Settings',
      items: [
        { icon: Bell, label: 'Notifications', desc: 'Manage your alerts and emails' },
        { icon: Lock, label: 'Privacy', desc: 'Control who sees your profile' },
        { icon: Shield, label: 'Security', desc: 'Password and authentication' },
      ]
    },
    {
      title: 'Discovery Preferences',
      items: [
        { icon: Eye, label: 'Visibility', desc: 'Show/Hide your profile from discovery' },
      ]
    }
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-slate-900 mb-8">Settings</h2>

      <div className="space-y-8">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-4">{section.title}</h3>
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
              {section.items.map((item, i) => (
                <button 
                  key={i}
                  className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-white transition-colors">
                      <item.icon className="w-6 h-6 text-slate-400 group-hover:text-[#ff3366]" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-slate-900">{item.label}</h4>
                      <p className="text-sm text-slate-400 font-medium">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-all" />
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-8">
          <button className="w-full bg-red-50 text-red-500 p-6 rounded-[2rem] font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-all border border-red-100">
            <Trash2 className="w-5 h-5" />
            <span>Delete Account</span>
          </button>
          <p className="text-center text-slate-400 text-xs mt-4 font-medium">
            This action is permanent and cannot be undone.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
