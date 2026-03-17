import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Shield, Bell, Lock, Eye, Trash2, ChevronRight, ShieldCheck, Sun, Moon } from 'lucide-react';

const Settings: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const sections: { title: string, items: { icon: any, label: string, desc: string, action?: () => void, toggle?: boolean, toggleValue?: boolean }[] }[] = [
    {
      title: 'Appearance',
      items: [
        { 
          icon: theme === 'light' ? Moon : Sun, 
          label: 'Theme', 
          desc: `Currently using ${theme} mode`,
          action: toggleTheme
        },
      ]
    },
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

  if (isAdmin) {
    sections.push({
      title: 'Administration',
      items: [
        { 
          icon: ShieldCheck, 
          label: 'Admin Panel', 
          desc: 'Access the management dashboard',
          action: () => navigate('/admin')
        },
      ]
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-8">Settings</h2>

      <div className="space-y-8">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest ml-4">{section.title}</h3>
            <div className="bg-[var(--bg-card)] rounded-[2rem] shadow-sm border border-[var(--border-color)] overflow-hidden transition-colors duration-300">
              {section.items.map((item, i) => (
                <button 
                  key={i}
                  onClick={item.action}
                  className="w-full flex items-center justify-between p-6 hover:bg-[var(--bg-input)] transition-all border-b border-[var(--border-color)] last:border-0 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[var(--bg-input)] rounded-2xl flex items-center justify-center group-hover:bg-[var(--bg-card)] transition-colors">
                      <item.icon className="w-6 h-6 text-[var(--text-secondary)] group-hover:text-[#ff3366]" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-[var(--text-primary)]">{item.label}</h4>
                      <p className="text-sm text-[var(--text-secondary)] font-medium">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[var(--text-secondary)] opacity-30 group-hover:opacity-100 transition-all" />
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-8">
          <button className="w-full bg-red-50 dark:bg-red-900/20 text-red-500 p-6 rounded-[2rem] font-bold flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all border border-red-100 dark:border-red-900/30">
            <Trash2 className="w-5 h-5" />
            <span>Delete Account</span>
          </button>
          <p className="text-center text-[var(--text-secondary)] text-xs mt-4 font-medium">
            This action is permanent and cannot be undone.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
