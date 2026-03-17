import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Transaction, TransactionType, TransactionStatus } from '../types';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, DollarSign, Star, RefreshCw, CreditCard, History, Plus, Megaphone } from 'lucide-react';
import { cn, formatCurrency, formatTime } from '../lib/utils';
import { createTransaction } from '../services/pointService';

const Wallet: React.FC = () => {
  const { profile, user: authUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [pointValue, setPointValue] = useState(0.01);

  useEffect(() => {
    if (!authUser) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', authUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
      setLoading(false);
    });

    // Fetch point value from settings
    getDoc(doc(db, 'settings', 'site')).then(snap => {
      if (snap.exists()) setPointValue(snap.data().pointValue || 0.01);
    });

    return () => unsub();
  }, [authUser]);

  const handleDeposit = async () => {
    if (!authUser || !amount) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    try {
      // 1. Create order on server
      const response = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: val.toFixed(2) }),
      });
      const order = await response.json();

      if (order.id) {
        // In a real app, we'd use the PayPal JS SDK to show the buttons.
        // For this demo, we'll simulate the capture after a "successful" payment.
        // The user would normally click the PayPal button which opens a popup.
        
        const confirmPayment = confirm(`Simulate PayPal Payment for ${formatCurrency(val)}? (Order ID: ${order.id})`);
        if (confirmPayment) {
          const captureResponse = await fetch('/api/paypal/capture-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderID: order.id }),
          });
          const captureData = await captureResponse.json();

          if (captureData.status === 'COMPLETED') {
            await createTransaction(authUser.uid, val, TransactionType.DEPOSIT, 'PayPal');
            setAmount('');
            alert("Deposit successful!");
          } else {
            alert("Payment failed or was not completed.");
          }
        }
      }
    } catch (err) {
      console.error('PayPal Error:', err);
      alert("PayPal integration error. Please check your credentials.");
    }
  };

  const handleConvertPoints = async () => {
    if (!profile || profile.points <= 0) return;
    
    const conversionValue = profile.points * pointValue;
    if (confirm(`Convert ${profile.points} points to ${formatCurrency(conversionValue)}?`)) {
      try {
        await createTransaction(profile.uid, conversionValue, TransactionType.POINTS_CONVERSION, 'Points to Wallet');
        await updateDoc(doc(db, 'users', profile.uid), { points: 0 });
        alert("Points converted successfully!");
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'users');
      }
    }
  };

  const [showAdModal, setShowAdModal] = useState(false);
  const [newAd, setNewAd] = useState({ title: '', link: '', budget: '10', type: 'cpc' });

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !newAd.title || !newAd.link) return;
    const budgetVal = parseFloat(newAd.budget);
    if (isNaN(budgetVal) || budgetVal > (profile?.walletBalance || 0)) {
      alert("Insufficient balance or invalid budget");
      return;
    }

    try {
      await addDoc(collection(db, 'adverts'), {
        sponsorId: authUser.uid,
        title: newAd.title,
        link: newAd.link,
        type: newAd.type,
        budget: budgetVal,
        spent: 0,
        clicks: 0,
        impressions: 0,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      
      await createTransaction(authUser.uid, -budgetVal, TransactionType.PAYMENT, `Ad Sponsorship: ${newAd.title}`);
      
      // Shift level for sponsoring
      const levels: ('Bronze' | 'Gold' | 'Platinum')[] = ['Bronze', 'Gold', 'Platinum'];
      const currentIdx = levels.indexOf(profile?.level || 'Bronze');
      const nextLevel = levels[Math.min(currentIdx + 1, levels.length - 1)];
      
      await updateDoc(doc(db, 'users', authUser.uid), { 
        level: nextLevel 
      });

      setShowAdModal(false);
      alert("Ad submitted for approval! Your level has been upgraded for sponsoring content.");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'adverts');
    }
  };

  if (loading) return <div className="p-8">Loading wallet...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-[var(--text-primary)]">My Wallet</h2>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl font-bold text-sm border border-emerald-100 dark:border-emerald-900/30">
          <WalletIcon className="w-4 h-4" />
          <span>Verified Secure</span>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-[#ff3366] to-[#ff6b6b] p-8 rounded-[2.5rem] text-white shadow-xl shadow-[#ff3366]/20 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-white/80 font-bold uppercase tracking-widest text-xs mb-2">Available Balance</p>
            <h3 className="text-5xl font-black mb-6">{formatCurrency(profile?.walletBalance || 0)}</h3>
            <div className="flex gap-3">
              <button onClick={() => setAmount('10')} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-bold backdrop-blur-md transition-all">Add Funds</button>
              <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-bold backdrop-blur-md transition-all">Withdraw</button>
            </div>
          </div>
          <DollarSign className="absolute -right-8 -bottom-8 w-48 h-48 text-white/10 rotate-12" />
        </div>

        <div className="bg-[var(--bg-card)] p-8 rounded-[2.5rem] border border-[var(--border-color)] shadow-sm flex flex-col justify-between transition-colors duration-300">
          <div>
            <p className="text-[var(--text-secondary)] font-bold uppercase tracking-widest text-xs mb-2">Accumulated Points</p>
            <div className="flex items-center gap-3">
              <h3 className="text-4xl font-black text-[var(--text-primary)]">{profile?.points || 0}</h3>
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            </div>
            <p className="text-[var(--text-secondary)] text-sm mt-2 font-medium">Estimated Value: <span className="font-bold text-emerald-600">{formatCurrency((profile?.points || 0) * pointValue)}</span></p>
          </div>
          <button 
            onClick={handleConvertPoints}
            disabled={!profile?.points}
            className="mt-6 w-full bg-[var(--bg-input)] hover:bg-[var(--bg-card)] text-[var(--text-primary)] py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50 border border-[var(--border-color)]"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Convert Points to Cash</span>
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <button 
          onClick={() => setShowAdModal(true)}
          className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-color)] shadow-sm flex flex-col items-center gap-3 hover:bg-[var(--bg-input)] transition-all group duration-300"
        >
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all">
            <Megaphone className="w-6 h-6" />
          </div>
          <span className="font-black text-[var(--text-primary)]">Sponsor Content</span>
        </button>
        <button className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-color)] shadow-sm flex flex-col items-center gap-3 hover:bg-[var(--bg-input)] transition-all group duration-300">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <span className="font-black text-[var(--text-primary)]">Deposit Funds</span>
        </button>
        <button className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-color)] shadow-sm flex flex-col items-center gap-3 hover:bg-[var(--bg-input)] transition-all group duration-300">
          <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <span className="font-black text-[var(--text-primary)]">Withdraw Cash</span>
        </button>
      </div>

      {/* Deposit Section */}
      <div className="bg-[var(--bg-card)] p-8 rounded-[2.5rem] border border-[var(--border-color)] shadow-sm transition-colors duration-300">
        <h3 className="text-xl font-black text-[var(--text-primary)] mb-6 flex items-center gap-2">
          <Plus className="w-6 h-6 text-[#ff3366]" />
          Deposit Funds
        </h3>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[var(--text-secondary)]">$</span>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount to deposit" 
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-2xl p-4 pl-8 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/20 transition-all font-bold placeholder:text-[var(--text-secondary)]"
            />
          </div>
          <button 
            onClick={handleDeposit}
            className="bg-[#0070ba] text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-[#005ea6] transition-all shadow-lg shadow-blue-500/20"
          >
            <CreditCard className="w-5 h-5" />
            <span>Deposit with PayPal</span>
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-color)] shadow-sm overflow-hidden transition-colors duration-300">
        <div className="p-8 border-b border-[var(--border-color)] flex justify-between items-center">
          <h3 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-2">
            <History className="w-6 h-6 text-[#ff3366]" />
            Transaction History
          </h3>
          <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold text-sm">View All</button>
        </div>
        <div className="divide-y divide-[var(--border-color)]">
          {transactions.map(tx => (
            <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-[var(--bg-input)] transition-all">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  tx.type === 'deposit' ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600" :
                  tx.type === 'withdrawal' ? "bg-red-100 dark:bg-red-900/20 text-red-600" :
                  tx.type === 'points_conversion' ? "bg-blue-100 dark:bg-blue-900/20 text-blue-600" :
                  "bg-[var(--bg-input)] text-[var(--text-secondary)]"
                )}>
                  {tx.type === 'deposit' ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                </div>
                <div>
                  <p className="font-bold text-[var(--text-primary)] capitalize">{tx.type.replace('_', ' ')}</p>
                  <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-widest">{formatTime(tx.createdAt)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn(
                  "text-lg font-black",
                  tx.type === 'deposit' || tx.type === 'points_conversion' ? "text-emerald-600" : "text-red-600"
                )}>
                  {tx.type === 'deposit' || tx.type === 'points_conversion' ? '+' : '-'}{formatCurrency(tx.amount)}
                </p>
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  tx.status === 'completed' ? "text-emerald-500" : "text-orange-500"
                )}>{tx.status}</p>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="p-12 text-center text-[var(--text-secondary)] italic font-bold">No transactions found</div>
          )}
        </div>
      </div>

      {/* Ad Modal */}
      {showAdModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in zoom-in duration-200 border border-[var(--border-color)]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-[var(--text-primary)]">Sponsor Content</h3>
              <button onClick={() => setShowAdModal(false)} className="p-2 hover:bg-[var(--bg-input)] rounded-xl transition-all">
                <Plus className="w-6 h-6 rotate-45 text-[var(--text-secondary)]" />
              </button>
            </div>
            
            <form onSubmit={handleCreateAd} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2">Campaign Title</label>
                <input 
                  type="text" 
                  value={newAd.title}
                  onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
                  placeholder="e.g. Summer Sale 2024" 
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/20 transition-all font-bold placeholder:text-[var(--text-secondary)]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2">Target Link</label>
                <input 
                  type="url" 
                  value={newAd.link}
                  onChange={(e) => setNewAd({ ...newAd, link: e.target.value })}
                  placeholder="https://yourwebsite.com" 
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/20 transition-all font-bold placeholder:text-[var(--text-secondary)]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2">Budget ($)</label>
                  <input 
                    type="number" 
                    value={newAd.budget}
                    onChange={(e) => setNewAd({ ...newAd, budget: e.target.value })}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/20 transition-all font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2">Ad Type</label>
                  <select 
                    value={newAd.type}
                    onChange={(e) => setNewAd({ ...newAd, type: e.target.value })}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/20 transition-all font-bold appearance-none"
                  >
                    <option value="cpc">CPC (Cost Per Click)</option>
                    <option value="impression">CPM (Cost Per 1k Impressions)</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-medium italic">Note: Adverts are subject to admin approval. Budget will be deducted from your wallet balance.</p>
              <button 
                type="submit"
                className="w-full bg-[#ff3366] text-white py-4 rounded-2xl font-black shadow-lg shadow-[#ff3366]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Launch Campaign
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
