import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Product } from '../types';
import { ShoppingBag, Plus, X, Tag, Trash2 } from 'lucide-react';
import { PRODUCT_CATEGORIES } from '../constants';
import { cn } from '../lib/utils';

const Market: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState({
    title: '',
    description: '',
    price: '',
    image: '',
    category: 'Other'
  });

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });
    return () => unsubscribe();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newProduct.title.trim()) return;

    try {
      await addDoc(collection(db, 'products'), {
        userId: profile.uid,
        authorName: profile.name,
        ...newProduct,
        price: parseFloat(newProduct.price),
        createdAt: new Date().toISOString()
      });
      setIsAdding(false);
      setNewProduct({ title: '', description: '', price: '', image: '', category: 'Other' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'products');
    }
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Marketplace</h2>
          <p className="text-slate-500 font-bold text-sm">Buy and sell products within the community</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-[#ff3366] text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-[#ff3366]/20 flex items-center gap-2 hover:scale-105 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Post Product</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-6 max-w-2xl mx-auto">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-900">List a New Product</h3>
            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
          </div>
          <form onSubmit={handleAddProduct} className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Product Title</label>
                <input 
                  type="text" 
                  value={newProduct.title}
                  onChange={(e) => setNewProduct({...newProduct, title: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Price ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Category</label>
                <select 
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10 font-bold"
                >
                  {PRODUCT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Image URL</label>
                <input 
                  type="url" 
                  value={newProduct.image}
                  onChange={(e) => setNewProduct({...newProduct, image: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Description</label>
                <textarea 
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#ff3366]/10 h-32 resize-none"
                  required
                />
              </div>
            </div>
            <button className="md:col-span-2 w-full bg-[#ff3366] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#ff3366]/20 text-lg">
              List Product
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {products.map(product => (
          <div key={product.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden group hover:shadow-xl transition-all">
            <div className="relative aspect-square overflow-hidden">
              <img 
                src={product.image} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl font-black text-[#ff3366] shadow-lg">
                ${product.price}
              </div>
              <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-[10px] font-black uppercase tracking-widest">
                {product.category}
              </div>
              {(isAdmin || product.userId === profile?.uid) && (
                <button 
                  onClick={() => handleDelete(product.id)}
                  className="absolute bottom-4 right-4 bg-red-500 text-white p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="p-6 space-y-2">
              <h4 className="font-black text-slate-900 text-lg line-clamp-1">{product.title}</h4>
              <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed">{product.description}</p>
              <div className="pt-4 flex items-center justify-between border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="w-3 h-3 text-slate-400" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{product.authorName}</span>
                </div>
                <button className="text-[#ff3366] font-black text-xs uppercase tracking-widest hover:underline">
                  Contact Seller
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Market;
