import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSearch, FiFilter } from 'react-icons/fi';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import styles from './Shop.module.css';

const CATEGORIES = ['Perfumes', 'Pure Attars', 'Artisanal Extracts', 'Oud Specials'];
const FAMILIES = ['Woody', 'Amber', 'Floral', 'Oriental', 'Fresh', 'Spicy'];

export const Shop: React.FC = () => {
  const { products } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCat = searchParams.get('category') || '';
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCat);
  const [selectedFamily, setSelectedFamily] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<number>(5000);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const itemsPerPage = 6;

  // Filter & Sort logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (selectedCategory && p.category !== selectedCategory) return false;
        if (selectedFamily && p.fragranceFamily !== selectedFamily) return false;
        if ((p.salePrice || p.price) > maxPrice) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchNotes =
            p.topNotes.some((n) => n.toLowerCase().includes(q)) ||
            p.middleNotes.some((n) => n.toLowerCase().includes(q)) ||
            p.baseNotes.some((n) => n.toLowerCase().includes(q));
          if (!matchTitle && !matchNotes) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const priceA = a.salePrice || a.price;
        const priceB = b.salePrice || b.price;
        if (sortBy === 'price-low') return priceA - priceB;
        if (sortBy === 'price-high') return priceB - priceA;
        if (sortBy === 'rating') return b.rating - a.rating;
        return 0; // featured/default
      });
  }, [products, selectedCategory, selectedFamily, maxPrice, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedFamily('');
    setMaxPrice(5000);
    setSearchQuery('');
    setSortBy('featured');
    setCurrentPage(1);
    setSearchParams({});
  };

  return (
    <div className={styles.page}>
      <div className={styles.titleArea}>
        <h1 className={styles.title}>The Fragrance Sanctuary</h1>
        <p className={styles.subtitle}>Filter by concentration, olfactory family, or rare botanical notes</p>
      </div>

      <div className={styles.layout}>
        {/* Sidebar Filters */}
        <aside className={styles.sidebar}>
          <div>
            <h3 className={styles.filterGroupTitle}>Category</h3>
            <div className={styles.filterList}>
              {CATEGORIES.map((cat) => (
                <label key={cat} className={styles.checkboxItem}>
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategory === cat}
                    onChange={() => { setSelectedCategory(selectedCategory === cat ? '' : cat); setCurrentPage(1); }}
                  />
                  {cat}
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className={styles.filterGroupTitle}>Fragrance Family</h3>
            <div className={styles.filterList}>
              {FAMILIES.map((fam) => (
                <label key={fam} className={styles.checkboxItem}>
                  <input
                    type="radio"
                    name="family"
                    checked={selectedFamily === fam}
                    onChange={() => { setSelectedFamily(selectedFamily === fam ? '' : fam); setCurrentPage(1); }}
                  />
                  {fam}
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className={styles.filterGroupTitle}>Max Price (₹{maxPrice.toLocaleString('en-IN')})</h3>
            <div className={styles.rangeGroup}>
              <input
                type="range"
                min="1000"
                max="5000"
                step="100"
                value={maxPrice}
                onChange={(e) => { setMaxPrice(Number(e.target.value)); setCurrentPage(1); }}
              />
              <div className={styles.priceLabels}>
                <span>₹1,000</span>
                <span>₹5,000</span>
              </div>
            </div>
          </div>

          <button className={styles.clearBtn} onClick={clearFilters}>
            Reset All Filters
          </button>
        </aside>

        {/* Main Product Grid Area */}
        <main>
          <div className={styles.topControlBar}>
            <div className={styles.searchBox}>
              <span className={styles.searchIcon}><FiSearch /></span>
              <input
                type="text"
                placeholder="Search by name or note e.g. Rose, Oud, Vanilla..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>

            <select className={styles.sortSelect} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="featured">Featured Curations</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>

          {paginatedProducts.length === 0 ? (
            <div className={styles.noResults}>
              <p>No artisanal fragrances matched your current filter criteria.</p>
              <button onClick={clearFilters} style={{ color: 'var(--gold-primary)', marginTop: '0.75rem', textDecoration: 'underline' }}>
                Clear Filters
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {paginatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              {[...Array(totalPages)].map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    className={`${styles.pageBtn} ${pageNum === currentPage ? styles.activePage : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
