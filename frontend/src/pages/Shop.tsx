import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSearch, FiX } from 'react-icons/fi';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import styles from './Shop.module.css';

const CATEGORIES = ['Perfumes', 'Pure Attars', 'Artisanal Extracts', 'Oud Specials'];
const FAMILIES = ['Woody', 'Amber', 'Floral', 'Oriental', 'Fresh', 'Spicy'];

export const Shop: React.FC = () => {
  const { products } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlCat = searchParams.get('category') || '';
  const urlQ = searchParams.get('q') || '';
  const urlSort = searchParams.get('sort') || 'featured';

  const [selectedCategories, setSelectedCategories] = useState<string[]>(urlCat ? [urlCat] : []);
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(urlQ);
  const [sortBy, setSortBy] = useState(urlSort);
  const [currentPage, setCurrentPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    setSelectedCategories(urlCat ? [urlCat] : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCat]);
  useEffect(() => { setSearchQuery(urlQ); setCurrentPage(1); }, [urlQ]);
  useEffect(() => { setSortBy(urlSort); }, [urlSort]);

  const itemsPerPage = 12;

  const toggle = (list: string[], v: string, set: (x: string[]) => void) => {
    set(list.includes(v) ? list.filter((c) => c !== v) : [...list, v]);
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products
      .filter((p) => {
        if (selectedCategories.length && !selectedCategories.includes(p.category)) return false;
        if (selectedFamilies.length && !selectedFamilies.includes(p.fragranceFamily)) return false;
        if (inStockOnly && p.stock <= 0) return false;
        if (q) {
          const hay = [p.title, p.subtitle, p.description, p.category, p.fragranceFamily, ...p.topNotes, ...p.middleNotes, ...p.baseNotes]
            .join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const pa = a.salePrice && a.salePrice > 0 ? a.salePrice : a.price;
        const pb = b.salePrice && b.salePrice > 0 ? b.salePrice : b.price;
        if (sortBy === 'price-low') return pa - pb;
        if (sortBy === 'price-high') return pb - pa;
        if (sortBy === 'rating') return b.rating - a.rating;
        return 0;
      });
  }, [products, selectedCategories, selectedFamilies, searchQuery, sortBy, inStockOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const page = Math.min(currentPage, totalPages);
  const visible = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const activeCount = selectedCategories.length + selectedFamilies.length + (inStockOnly ? 1 : 0) + (searchQuery ? 1 : 0);

  const clear = () => {
    setSelectedCategories([]); setSelectedFamilies([]); setSearchQuery(''); setSortBy('featured'); setCurrentPage(1); setInStockOnly(false);
    setSearchParams({});
  };

  const filters = (
    <div className={styles.filters}>
      <div className={styles.group}>
        <h3 id="f-cat">Category</h3>
        <div role="group" aria-labelledby="f-cat">
          {CATEGORIES.map((c) => (
            <label key={c} className={styles.check}>
              <input type="checkbox" checked={selectedCategories.includes(c)} onChange={() => toggle(selectedCategories, c, setSelectedCategories)} />
              {c}
            </label>
          ))}
        </div>
      </div>
      <div className={styles.group}>
        <h3 id="f-fam">Fragrance family</h3>
        <div role="group" aria-labelledby="f-fam">
          {FAMILIES.map((f) => (
            <label key={f} className={styles.check}>
              <input type="checkbox" checked={selectedFamilies.includes(f)} onChange={() => toggle(selectedFamilies, f, setSelectedFamilies)} />
              {f}
            </label>
          ))}
        </div>
      </div>
      <div className={styles.group}>
        <h3 id="f-avail">Availability</h3>
        <label className={styles.check}>
          <input type="checkbox" checked={inStockOnly} onChange={(e) => { setInStockOnly(e.target.checked); setCurrentPage(1); }} />
          In stock only
        </label>
      </div>
      <button type="button" className="btn btn-ghost" onClick={clear}>Clear all filters</button>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className="container">
        <p className="eyebrow">Shop</p>
        <h1 className={styles.title}>Find your fragrance</h1>
        <p className={styles.sub}>Search by name or note, filter by collection, sort by price or rating.</p>

        <div className={styles.toolbar}>
          <form className={styles.search} role="search" onSubmit={(e) => e.preventDefault()}>
            <FiSearch aria-hidden="true" />
            <label htmlFor="shop-q" className="sr-only">Search products</label>
            <input
              id="shop-q" value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search rose, oud, vanilla…"
            />
            {searchQuery && <button type="button" aria-label="Clear search" onClick={() => setSearchQuery('')} className={styles.clearQ}><FiX /></button>}
          </form>
          <div className={styles.toolbarRight}>
            <p className={styles.count} role="status" aria-live="polite">{filtered.length} result{filtered.length === 1 ? '' : 's'}</p>
            <label className={styles.sortWrap}>
              <span className="sr-only">Sort products</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="featured">Featured</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="rating">Top rated</option>
              </select>
            </label>
            <button type="button" className="btn btn-secondary" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen} aria-controls="shop-filters">
              Filters{activeCount ? ` (${activeCount})` : ''}
            </button>
          </div>
        </div>

        <div className={styles.layout}>
          <aside className={styles.sidebar} aria-label="Filters">{filters}</aside>
          {filtersOpen && <div id="shop-filters" className={styles.mobileFilters}>{filters}</div>}

          <div className={styles.results}>
            {visible.length === 0 ? (
              <div className="empty">
                <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No matches found</h2>
                <p>Try a different note (e.g. “amber”, “jasmine”) or clear filters.</p>
                <p style={{ marginTop: '1rem' }}><button type="button" className="btn btn-primary" onClick={clear}>Clear filters</button></p>
              </div>
            ) : (
              <div className={styles.grid}>
                {visible.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}

            {totalPages > 1 && (
              <nav className={styles.pager} aria-label="Pagination">
                <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => setCurrentPage(page - 1)}>← Prev</button>
                <span aria-current="page">Page {page} of {totalPages}</span>
                <button type="button" className="btn btn-secondary" disabled={page >= totalPages} onClick={() => setCurrentPage(page + 1)}>Next →</button>
              </nav>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
