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
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCat ? [initialCat] : []);
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const itemsPerPage = 6;

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setCurrentPage(1);
  };

  const toggleFamily = (fam: string) => {
    setSelectedFamilies((prev) =>
      prev.includes(fam) ? prev.filter((f) => f !== fam) : [...prev, fam]
    );
    setCurrentPage(1);
  };

  // Filter & Sort logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (selectedCategories.length > 0 && !selectedCategories.includes(p.category)) return false;
        if (selectedFamilies.length > 0 && !selectedFamilies.includes(p.fragranceFamily)) return false;
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
  }, [products, selectedCategories, selectedFamilies, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedFamilies([]);
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
                    type="checkbox"
                    checked={selectedCategories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
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
                    type="checkbox"
                    checked={selectedFamilies.includes(fam)}
                    onChange={() => toggleFamily(fam)}
                  />
                  {fam}
                </label>
              ))}
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
