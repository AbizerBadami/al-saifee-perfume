import React, { useState } from 'react';
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
  FiX
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { Product, Coupon, Order } from '../types';
import styles from './AdminDashboard.module.css';

export const AdminDashboard: React.FC = () => {
  const { logout, isAdmin } = useAuth();
  const {
    products,
    orders,
    coupons,
    reviews,
    settings,
    saveProduct,
    deleteProduct,
    updateOrderStatus,
    saveCoupon,
    deleteCoupon,
    moderateReview,
    updateSettings,
  } = useStore();

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'coupons' | 'reviews' | 'settings'>('orders');

  // Product Modal State
  const [productModalOpen, setProductModalOpen] = useState(false);
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

  // Coupon Modal State
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon>>({
    code: 'NEWCODE15',
    discountType: 'percentage',
    discountValue: 15,
    minOrderAmount: 50,
    active: true,
  });

  if (!isAdmin) {
    return (
      <div className={styles.page} style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <h2>Access Restricted</h2>
        <p style={{ color: 'var(--text-muted)' }}>Please log in with administrator rights to access the panel.</p>
        <button
          onClick={() => navigate('/admin/login')}
          style={{ background: 'var(--gold-gradient)', color: '#000', padding: '0.75rem 1.5rem', marginTop: '1rem', borderRadius: '4px', fontWeight: 700 }}
        >
          Go to Admin Login
        </button>
      </div>
    );
  }

  // Calculate High-level Dashboard Statistics
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const pendingOrdersCount = orders.filter((o) => o.status === 'Processing').length;

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct.title && editingProduct.price) {
      await saveProduct(editingProduct as Product);
      setProductModalOpen(false);
    }
  };

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCoupon.code && editingCoupon.discountValue) {
      await saveCoupon(editingCoupon as Coupon);
      setCouponModalOpen(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.title}>Atelier Control Portal</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Manage Al-Saifee Perfumes inventory, client acquisitions, coupons & reviews
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
            <div className={styles.statValue}>{orders.length}</div>
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
          Acquisition Orders ({orders.length})
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'products' ? styles.activeTab : ''}`} onClick={() => setActiveTab('products')}>
          Catalog Products ({products.length})
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'coupons' ? styles.activeTab : ''}`} onClick={() => setActiveTab('coupons')}>
          Promotions & Coupons ({coupons.length})
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'reviews' ? styles.activeTab : ''}`} onClick={() => setActiveTab('reviews')}>
          Reviews Moderation ({reviews.length})
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'settings' ? styles.activeTab : ''}`} onClick={() => setActiveTab('settings')}>
          Store Config
        </button>
      </div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className={styles.contentCard}>
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
                {orders.map((order) => (
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
                        onChange={(e) => updateOrderStatus(order.id, e.target.value as Order['status'])}
                        style={{ background: '#111', color: 'var(--gold-light)', padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--gold-border)' }}
                      >
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td>
                      <button className={styles.actionBtn} onClick={() => alert(`Address: ${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}`)}>
                        View Shipping
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className={styles.contentCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>Fragrance Catalog Inventory</h3>
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
              style={{ background: 'var(--gold-gradient)', color: '#000', fontWeight: 700, padding: '0.5rem 1rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
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

      {/* Coupons Tab */}
      {activeTab === 'coupons' && (
        <div className={styles.contentCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>Promotional Coupons</h3>
            <button
              onClick={() => {
                setEditingCoupon({ code: 'SAVE10', discountType: 'percentage', discountValue: 10, minOrderAmount: 0, active: true });
                setCouponModalOpen(true);
              }}
              style={{ background: 'var(--gold-gradient)', color: '#000', fontWeight: 700, padding: '0.5rem 1rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <FiPlus /> New Coupon
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.code}</strong></td>
                    <td>{c.discountType}</td>
                    <td>{c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue.toLocaleString('en-IN')}`}</td>
                    <td>{c.active ? 'Active' : 'Disabled'}</td>
                    <td>
                      <button className={styles.actionBtn} style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={() => deleteCoupon(c.id)}>
                        <FiTrash2 /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reviews Moderation Tab */}
      {activeTab === 'reviews' && (
        <div className={styles.contentCard}>
          <h3>Client Testimonial Moderation</h3>
          <div className={styles.tableWrapper} style={{ marginTop: '1rem' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id}>
                    <td>{r.userName}</td>
                    <td>{r.rating} / 5</td>
                    <td>{r.comment}</td>
                    <td>{r.status}</td>
                    <td>
                      {r.status === 'Pending' && (
                        <button className={styles.actionBtn} onClick={() => moderateReview(r.id, 'Approved')}>Approve</button>
                      )}
                      <button className={styles.actionBtn} style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={() => moderateReview(r.id, 'Rejected')}>
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
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Title</label>
                <input
                  type="text"
                  value={editingProduct.title || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category</label>
                <select
                  value={editingProduct.category || 'Perfumes'}
                  onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                >
                  <option value="Perfumes">Perfumes</option>
                  <option value="Pure Attars">Pure Attars</option>
                  <option value="Artisanal Extracts">Artisanal Extracts</option>
                  <option value="Oud Specials">Oud Specials</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Price (₹)</label>
                <input
                  type="number"
                  value={editingProduct.price || 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                  required
                />
              </div>

              <div className={styles.formGridFull}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Description</label>
                <textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  style={{ width: '100%', minHeight: '80px' }}
                />
              </div>

              <button type="submit" className={styles.submitBtn}>
                Save Product Formulation
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Coupon Modal */}
      {couponModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setCouponModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>New Promo Coupon</h3>
            <form onSubmit={handleCouponSubmit} className={styles.formGrid}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Promo Code</label>
                <input
                  type="text"
                  value={editingCoupon.code || ''}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Discount Percentage (%)</label>
                <input
                  type="number"
                  value={editingCoupon.discountValue || 10}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, discountValue: Number(e.target.value) })}
                  required
                />
              </div>

              <button type="submit" className={styles.submitBtn}>
                Create Coupon Code
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
