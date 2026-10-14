import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiDollarSign,
  FiShoppingBag,
  FiPackage,
  FiTag,
  FiStar,
  FiSettings,
  FiLogOut,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiX,
  FiRefreshCw,
  FiUpload,
  FiImage
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { ordersAPI, reviewsAPI } from '../lib/api';
import { Product, Order, Review } from '../types';
import styles from './AdminDashboard.module.css';

const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1615397349754-cfa2066a298e?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?auto=format&fit=crop&q=80&w=800'
];

export const AdminDashboard: React.FC = () => {
  const { logout, isAdmin } = useAuth();
  const {
    products,
    reviews,
    settings,
    saveProduct,
    deleteProduct,
    moderateReview,
    updateSettings,
  } = useStore();

  const navigate = useNavigate();

  // Admin orders: fetched server-side (StoreContext never holds orders —
  // orders live only in D1 and are created via Razorpay verify).
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const fetchOrders = async () => {
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const res = await ordersAPI.list(100, 0);
      setAdminOrders(res.orders || []);
    } catch (err) {
      setOrdersError(err instanceof Error ? err.message : 'Could not load orders.');
    } finally {
      setOrdersLoading(false);
    }
  };
  useEffect(() => {
    if (isAdmin) fetchOrders();
  }, [isAdmin]);

  const handleOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      await ordersAPI.updateStatus(orderId, { status });
      setAdminOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    } catch (err) {
      setOrdersError(err instanceof Error ? err.message : 'Could not update order.');
    }
  };

  // Admin moderation queue: Pending + Approved with private fields (email, order).
  // Public StoreContext reviews are Approved-only without PII, so fetch separately.
  const [adminReviews, setAdminReviews] = useState<Review[]>([]);
  const [adminReviewsError, setAdminReviewsError] = useState('');
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const [pending, approved] = await Promise.all([
          reviewsAPI.adminList('Pending'),
          reviewsAPI.adminList('Approved'),
        ]);
        if (!cancelled) {
          const merged = [...pending.reviews, ...approved.reviews].sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt)
          );
          setAdminReviews(merged);
          setAdminReviewsError('');
        }
      } catch (err) {
        if (!cancelled) setAdminReviewsError(err instanceof Error ? err.message : 'Could not load reviews.');
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin, reviews.length]);

  const totalRevenue = adminOrders.filter((o) => o.status !== 'Cancelled').reduce((sum, o) => sum + o.total, 0);
  const pendingOrdersCount = adminOrders.filter((o) => o.status === 'Processing').length;

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct.title) {
      saveProduct(editingProduct as Product);
      setProductModalOpen(false);
      setImageError('');
    }
  };

  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'reviews' | 'settings'>('orders');

  // Product Modal State
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({
    title: '',
    subtitle: '',
    category: 'Perfumes',
    fragranceFamily: 'Woody',
    price: 150,
    description: '',
    topNotes: ['Bergamot'],
    middleNotes: ['Grasse Rose'],
    baseNotes: ['Cambodian Oud'],
    bottleSizes: ['50ml Spray', '100ml Spray'],
    images: ['https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=800'],
    rating: 5.0,
    reviewCount: 1,
    isBestSeller: false,
    isFeatured: true,
  });

  const [imageError, setImageError] = useState('');

  // Bounded uploads: type + 2MB + 6-image cap, resized to max 1200px JPEG.
  // Raw data-URLs exceed the API's 2000-char URL limit and bloat D1, so every
  // file is downscaled client-side before it enters the gallery.
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setImageError('');

    const current = editingProduct.images || [];
    if (current.length + files.length > 6) {
      setImageError(`Gallery holds max 6 photos (you have ${current.length}). Remove one first.`);
      e.target.value = '';
      return;
    }

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setImageError(`"${file.name}" is not an image file.`);
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setImageError(`"${file.name}" exceeds 2MB. Compress it or paste an image URL instead.`);
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const maxSide = 1200;
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const resized = canvas.toDataURL('image/jpeg', 0.8);
          setEditingProduct((prev) => ({
            ...prev,
            images: [...(prev.images || []), resized].slice(0, 6),
          }));
        } catch {
          setImageError('Could not process that image. Try an image URL instead.');
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        setImageError(`"${file.name}" could not be read as an image.`);
      };
      img.src = url;
    });
    e.target.value = '';
  };

  const handleAddImageUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;
    setImageError('');
    if (!/^https?:\/\/.+\..+/.test(url)) {
      setImageError('Enter a full http(s) image URL.');
      return;
    }
    if (url.length > 2000) {
      setImageError('That URL exceeds 2000 characters.');
      return;
    }
    if ((editingProduct.images || []).length >= 6) {
      setImageError('Gallery holds max 6 photos. Remove one first.');
      return;
    }
    setEditingProduct((prev) => ({
      ...prev,
      images: [...(prev.images || []), url].slice(0, 6),
    }));
    setImageUrlInput('');
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setEditingProduct((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Shipping Details Modal State
  const [shippingModalOrder, setShippingModalOrder] = useState<Order | null>(null);

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.title}>Atelier Control Portal</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Manage Al-Saifee Perfumes inventory, client acquisitions & reviews
          </p>
        </div>

        <button className={styles.logoutBtn} onClick={() => { logout(); navigate('/'); }}>
          <FiLogOut /> Logout
        </button>
      </div>

      {/* Statistics Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}><FiDollarSign /></div>
          <div>
            <div className={styles.statValue}>₹{totalRevenue.toLocaleString('en-IN')}</div>
            <div className={styles.statLabel}>Total Sales Revenue</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}><FiShoppingBag /></div>
          <div>
            <div className={styles.statValue}>{adminOrders.length}</div>
            <div className={styles.statLabel}>Total Orders ({pendingOrdersCount} Pending)</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}><FiPackage /></div>
          <div>
            <div className={styles.statValue}>{products.length}</div>
            <div className={styles.statLabel}>Active Fragrances</div>
          </div>
        </div>
      </div>

      {/* Tab Controls */}
      <div className={styles.tabs}>
        <button className={`${styles.tabBtn} ${activeTab === 'orders' ? styles.activeTab : ''}`} onClick={() => setActiveTab('orders')}>
          Acquisition Orders ({adminOrders.length})
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'products' ? styles.activeTab : ''}`} onClick={() => setActiveTab('products')}>
          Catalog Products ({products.length})
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'reviews' ? styles.activeTab : ''}`} onClick={() => setActiveTab('reviews')}>
          Reviews Moderation ({adminReviews.length || reviews.length})
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'settings' ? styles.activeTab : ''}`} onClick={() => setActiveTab('settings')}>
          Store Config
        </button>
      </div>

      {/* Orders Tab — server-side list with loading/error/empty states */}
      {activeTab === 'orders' && (
        <div className={styles.contentCard}>
          {ordersLoading && <p className="muted">Loading orders…</p>}
          {ordersError && (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <p className="alert alert-error" role="alert">{ordersError}</p>
              <button type="button" className="btn btn-secondary" onClick={fetchOrders}>Retry</button>
            </div>
          )}
          {!ordersLoading && !ordersError && adminOrders.length === 0 && (
            <div className="empty">
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem' }}>No orders yet</h3>
              <p>New paid orders will appear here automatically.</p>
            </div>
          )}
          {!ordersLoading && !ordersError && adminOrders.length > 0 && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order Ref</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminOrders.map((order) => (
                  <tr key={order.id}>
                    <td><strong>{order.orderNumber}</strong></td>
                    <td>
                      <div>{order.customerName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.customerEmail}</div>
                    </td>
                    <td>{order.items.length} items</td>
                    <td>₹{order.total.toLocaleString('en-IN')}</td>
                    <td>
                      <select
                        value={order.status}
                        onChange={(e) => handleOrderStatus(order.id, e.target.value as Order['status'])}
                        aria-label={`Status for order ${order.orderNumber}`}
                        style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid var(--line-strong)', minHeight: '40px' }}
                      >
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td>
                      <button className={styles.actionBtn} onClick={() => setShippingModalOrder(order)}>
                        View Shipping
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className={styles.contentCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3>Fragrance Catalog Inventory ({products.length})</h3>
            <button
              onClick={() => {
                setEditingProduct({
                  title: '',
                  subtitle: '',
                  category: 'Perfumes',
                  fragranceFamily: 'Woody',
                  price: 150,
                  description: '',
                  topNotes: ['Bergamot'],
                  middleNotes: ['Grasse Rose'],
                  baseNotes: ['Cambodian Oud'],
                  bottleSizes: ['50ml Spray', '100ml Spray'],
                  images: ['https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=800'],
                  rating: 5.0,
                  reviewCount: 1,
                  isBestSeller: false,
                  isFeatured: true,
                });
                setProductModalOpen(true);
              }}
              style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', fontWeight: 700, padding: '0.65rem 1.1rem', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', minHeight: '44px' }}
            >
              <FiPlus /> Add Fragrance
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Best Seller</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <img src={p.images[0]} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} referrerPolicy="no-referrer" />
                    </td>
                    <td><strong>{p.title}</strong></td>
                    <td>{p.category}</td>
                    <td>₹{p.price.toLocaleString('en-IN')}</td>
                    <td>{p.isBestSeller ? 'Yes' : 'No'}</td>
                    <td>
                      <button
                        className={styles.actionBtn}
                        onClick={() => { setEditingProduct(p); setProductModalOpen(true); }}
                      >
                        <FiEdit /> Edit
                      </button>
                      <button
                        className={styles.actionBtn}
                        style={{ borderColor: '#ef4444', color: '#ef4444' }}
                        onClick={() => deleteProduct(p.id)}
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reviews Moderation Tab — admin-only queue with verified-purchase context */}
      {activeTab === 'reviews' && (
        <div className={styles.contentCard}>
          <h3>Verified Review Moderation</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Only paid, non-cancelled orders containing the product can submit. Public list shows Approved only, without emails.
          </p>
          {adminReviewsError && <p className="alert alert-error" role="alert" style={{ marginTop: '1rem' }}>{adminReviewsError}</p>}
          <div className={styles.tableWrapper} style={{ marginTop: '1rem' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Order</th>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(adminReviews.length ? adminReviews : reviews).map((r) => (
                  <tr key={r.id}>
                    <td>{r.userName}{r.userEmail ? <><br /><span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{r.userEmail}</span></> : null}</td>
                    <td>{r.orderNumber || '—'}{r.verifiedPurchase ? <><br /><span style={{ color: 'var(--success)', fontSize: '0.75rem', fontWeight: 700 }}>✓ Verified</span></> : null}</td>
                    <td>{r.rating} / 5</td>
                    <td>{r.comment}</td>
                    <td>{r.status}</td>
                    <td>
                      {r.status === 'Pending' && (
                        <button className={styles.actionBtn} onClick={async () => {
                          await moderateReview(r.id, 'Approved');
                          setAdminReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: 'Approved' as const } : x)));
                        }}>Approve</button>
                      )}
                      <button className={styles.actionBtn} style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={async () => {
                        await moderateReview(r.id, 'Rejected');
                        setAdminReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: 'Rejected' as const } : x)));
                      }}>
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className={styles.contentCard}>
          <h3>Global Store Settings</h3>
          <div className={styles.formGrid}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Promo Banner Announcement</label>
              <input
                type="text"
                value={settings.promoMessage}
                onChange={(e) => updateSettings({ promoMessage: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Free Shipping Order Minimum (₹)</label>
              <input
                type="number"
                value={settings.freeShippingThreshold}
                onChange={(e) => updateSettings({ freeShippingThreshold: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Product Edit Modal */}
      {productModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setProductModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Product Formulation Editor</h3>
              <button onClick={() => setProductModalOpen(false)}><FiX /></button>
            </div>

            <form onSubmit={handleProductSubmit} className={styles.formGrid}>
              <div className={styles.formGridFull}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Title / Fragrance Name</label>
                <input
                  type="text"
                  value={editingProduct.title || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                  placeholder="e.g. Royal Oud Impérial"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Subtitle / Concentration</label>
                <input
                  type="text"
                  value={editingProduct.subtitle || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, subtitle: e.target.value })}
                  placeholder="e.g. Extrait de Parfum"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category</label>
                <select
                  value={editingProduct.category || 'Perfumes'}
                  onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as any })}
                >
                  <option value="Perfumes">Perfumes</option>
                  <option value="Pure Attars">Pure Attars</option>
                  <option value="Artisanal Extracts">Artisanal Extracts</option>
                  <option value="Oud Specials">Oud Specials</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fragrance Family</label>
                <select
                  value={editingProduct.fragranceFamily || 'Woody'}
                  onChange={(e) => setEditingProduct({ ...editingProduct, fragranceFamily: e.target.value as any })}
                >
                  <option value="Woody">Woody</option>
                  <option value="Amber">Amber</option>
                  <option value="Floral">Floral</option>
                  <option value="Oriental">Oriental</option>
                  <option value="Fresh">Fresh</option>
                  <option value="Spicy">Spicy</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Regular Price (₹)</label>
                <input
                  type="number"
                  value={editingProduct.price || 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sale Price (₹, Optional)</label>
                <input
                  type="number"
                  value={editingProduct.salePrice || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, salePrice: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="e.g. 2450"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>In-Stock Inventory Count</label>
                <input
                  type="number"
                  value={editingProduct.stock ?? 20}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                />
              </div>

              <div className={styles.formGridFull}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fragrance Description</label>
                <textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  style={{ width: '100%', minHeight: '75px' }}
                  placeholder="Describe the notes, origin, and olfactory profile..."
                />
              </div>

              {/* Fragrance Badges & Notes */}
              <div className={styles.formGridFull} style={{ display: 'flex', gap: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={editingProduct.isBestSeller || false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isBestSeller: e.target.checked })}
                  />
                  Mark as Best Seller
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={editingProduct.isFeatured ?? true}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isFeatured: e.target.checked })}
                  />
                  Feature on Homepage
                </label>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Top Notes (comma-separated)</label>
                <input
                  type="text"
                  value={(editingProduct.topNotes || []).join(', ')}
                  onChange={(e) => setEditingProduct({ ...editingProduct, topNotes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  placeholder="e.g. Taif Rose, Cardamom, Bergamot"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Middle Notes (comma-separated)</label>
                <input
                  type="text"
                  value={(editingProduct.middleNotes || []).join(', ')}
                  onChange={(e) => setEditingProduct({ ...editingProduct, middleNotes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  placeholder="e.g. Saffron, Wild Oud, Orris"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Base Notes (comma-separated)</label>
                <input
                  type="text"
                  value={(editingProduct.baseNotes || []).join(', ')}
                  onChange={(e) => setEditingProduct({ ...editingProduct, baseNotes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  placeholder="e.g. Ambergris, Sandalwood, Musk"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available Bottle Sizes (comma-separated)</label>
                <input
                  type="text"
                  value={(editingProduct.bottleSizes || []).join(', ')}
                  onChange={(e) => setEditingProduct({ ...editingProduct, bottleSizes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  placeholder="e.g. 50ml Spray, 100ml Extrait"
                />
              </div>

              {/* Product Photos & Gallery Management */}
              <div className={styles.formGridFull} style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--gold-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  <FiImage /> Product Photos & Gallery ({(editingProduct.images || []).length})
                </label>

                {/* Current Photos Grid */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', minHeight: '85px', background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {(editingProduct.images || []).map((imgUrl, index) => (
                    <div
                      key={index}
                      style={{
                        position: 'relative',
                        width: '80px',
                        height: '80px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: index === 0 ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                      }}
                    >
                      <img src={imgUrl} alt={`Product ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                      {index === 0 && (
                        <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--gold-primary)', color: '#000', fontSize: '0.55rem', textAlign: 'center', fontWeight: 700, padding: '1px 0' }}>
                          COVER PHOTO
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        style={{
                          position: 'absolute',
                          top: '3px',
                          right: '3px',
                          background: 'rgba(0,0,0,0.85)',
                          color: '#ef4444',
                          border: '1px solid #ef4444',
                          borderRadius: '50%',
                          width: '22px',
                          height: '22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                        title="Remove photo"
                      >
                        <FiX />
                      </button>
                    </div>
                  ))}
                  {(!editingProduct.images || editingProduct.images.length === 0) && (
                    <div style={{ width: '100%', textAlign: 'center', padding: '1rem', color: '#ef4444', fontSize: '0.85rem' }}>
                      ⚠️ No photos attached. Please upload a photo file or enter an image URL below.
                    </div>
                  )}
                </div>

                {/* Upload File & Add URL Controls */}
                {imageError && <p className="alert alert-error" role="alert" style={{ marginBottom: '0.75rem' }}>{imageError}</p>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'center' }}>
                  {/* File Upload Button */}
                  <label
                    style={{
                      background: 'rgba(255, 215, 0, 0.12)',
                      color: 'var(--gold-light)',
                      border: '1px dashed var(--gold-border)',
                      borderRadius: '6px',
                      padding: '0.65rem 1rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: '0.2s'
                    }}
                  >
                    <FiUpload style={{ fontSize: '1rem' }} /> Upload Photo File
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {/* Add URL Input */}
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                      type="url"
                      placeholder="Paste image URL..."
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      style={{ fontSize: '0.8rem', padding: '0.5rem', flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      style={{
                        background: 'var(--gold-gradient)',
                        color: '#000',
                        fontWeight: 700,
                        padding: '0.5rem 0.85rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                    >
                      + Add URL
                    </button>
                  </div>
                </div>

                {/* Sample Stock Photos Picker */}
                <div style={{ marginTop: '0.85rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Click to add sample luxury photo: </span>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                    {SAMPLE_PHOTOS.map((sampleUrl, sIdx) => (
                      <img
                        key={sIdx}
                        src={sampleUrl}
                        alt="Sample"
                        onClick={() => {
                          if (!editingProduct.images?.includes(sampleUrl)) {
                            setEditingProduct((prev) => ({
                              ...prev,
                              images: [...(prev.images || []), sampleUrl]
                            }));
                          }
                        }}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '4px',
                          objectFit: 'cover',
                          cursor: 'pointer',
                          border: '1px solid rgba(255,255,255,0.2)',
                          transition: 'transform 0.2s'
                        }}
                        title="Click to add sample photo"
                        referrerPolicy="no-referrer"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <button type="submit" className={styles.submitBtn}>
                Save Product Formulation
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Shipping Address Modal */}
      {shippingModalOrder && (
        <div className={styles.modalOverlay} onClick={() => setShippingModalOrder(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
              <h3 style={{ color: 'var(--gold-light)' }}>Order Dispatch Details (#{shippingModalOrder.orderNumber})</h3>
              <button onClick={() => setShippingModalOrder(null)} style={{ background: 'transparent', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}><FiX /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Recipient Name</span>
                <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{shippingModalOrder.customerName}</div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Email Address</span>
                <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{shippingModalOrder.customerEmail}</div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Contact Phone</span>
                <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{shippingModalOrder.shippingAddress?.phone || 'Not provided'}</div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Payment Status</span>
                <div style={{ fontWeight: 600, marginTop: '0.2rem', color: shippingModalOrder.paymentStatus === 'Paid' ? '#10b981' : '#f59e0b' }}>
                  {shippingModalOrder.paymentStatus || 'Paid'} ({shippingModalOrder.paymentMethod || 'Online'})
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                <span style={{ color: 'var(--gold-primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Shipping Address</span>
                <div style={{ marginTop: '0.5rem', lineHeight: '1.5', color: '#fff' }}>
                  {shippingModalOrder.shippingAddress?.addressLine1 ? (
                    <>
                      <div>{shippingModalOrder.shippingAddress.addressLine1}</div>
                      {shippingModalOrder.shippingAddress.addressLine2 && <div>{shippingModalOrder.shippingAddress.addressLine2}</div>}
                      <div>
                        {shippingModalOrder.shippingAddress.city}, {shippingModalOrder.shippingAddress.state} - {shippingModalOrder.shippingAddress.postalCode}
                      </div>
                      <div>{shippingModalOrder.shippingAddress.country}</div>
                    </>
                  ) : (
                    <div style={{ color: 'var(--text-muted)' }}>No detailed shipping address recorded for this order.</div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShippingModalOrder(null)}
              style={{
                width: '100%',
                marginTop: '1.5rem',
                background: 'var(--gold-gradient)',
                color: '#000',
                fontWeight: 700,
                padding: '0.75rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Close Dispatch Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

