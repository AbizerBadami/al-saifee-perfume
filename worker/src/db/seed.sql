-- ============================================================
-- Al-Saifee Perfumes — Seed Data for D1
-- Ported from src/utils/seedData.ts
-- ============================================================

-- 8 flagship products
INSERT OR IGNORE INTO products (id, title, subtitle, category, fragrance_family, price, sale_price, stock, description, top_notes, middle_notes, base_notes, longevity, projection, bottle_sizes, images, is_featured, is_best_seller, rating, review_count)
VALUES
  ('prod-001', 'Royal Oud Impérial', 'Extrait de Parfum', 'Oud Specials', 'Woody', 2800, 2450, 18,
   'An majestic blend of 30-year aged Cambodian wild agarwood resin, woven with smoky taif rose petals, velvety saffron, and dark amber crystals. Crafted for royalty.',
   '["Taif Rose","Cardamom Pods","Smoky Bergamot"]',
   '["30-Yr Wild Oud","Saffron Threads","Orris Butter"]',
   '["Ambergris","Sandalwood Mysore","Dark Musk"]',
   '14-16 Hours', 'Enveloping & Powerful',
   '["12ml Attar Oil","50ml Spray","100ml Extrait"]',
   '["https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=800","https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&q=80&w=800","https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&q=80&w=800"]',
   1, 1, 4.9, 42),

  ('prod-002', 'Sultanate Velvet Attar', 'Pure Concentrated Perfume Oil', 'Pure Attars', 'Amber', 1850, 1599, 25,
   '100% alcohol-free artisanal attar oil distilled in copper stills. Rich golden amber infused with velvety damask rose, rare frankincense, and creamy Mysore sandalwood.',
   '["Damask Rose","Pink Pepper","Sweet Myrrh"]',
   '["Omani Frankincense","Golden Amber","Labdanum"]',
   '["Mysore Sandalwood","Oakmoss","Cashmere Wood"]',
   '18-24 Hours', 'Intimate & Radiating',
   '["6ml Concentrated","12ml Concentrated","24ml Royal Crystal Decanter"]',
   '["https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&q=80&w=800","https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&q=80&w=800"]',
   1, 1, 5.0, 29),

  ('prod-003', 'Nocturne Amber Nectar', 'Parfum Absolute', 'Perfumes', 'Oriental', 2200, 1899, 14,
   'A seductive midnight composition featuring bourbon vanilla, toasted tonka beans, spicy nutmeg, and rich golden amber resin. Enigmatic and intoxicating.',
   '["Toasted Nutmeg","Cinnamon Bark","Blood Orange"]',
   '["Madagascar Vanilla","Tonka Bean","Cacao Blossom"]',
   '["Golden Amber","Benzoin","Smoky Patchouli"]',
   '12-14 Hours', 'Strong Sillage',
   '["50ml Spray","100ml Spray"]',
   '["https://images.unsplash.com/photo-1615397349754-cfa2066a298e?auto=format&fit=crop&q=80&w=800","https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=800"]',
   1, 0, 4.8, 31),

  ('prod-004', 'Jasmine de Grasse & White Musk', 'Elixir de Parfum', 'Artisanal Extracts', 'Floral', 1650, NULL, 30,
   'Hand-harvested night-blooming jasmine blossoms from Grasse, France, layered over crystalline white musk, neroli, and sun-kissed citrus leaves.',
   '["Italian Neroli","Mandarin Leaf","Bergamot Zest"]',
   '["Grasse Jasmine Sambac","Tuberose Absolute","White Lily"]',
   '["Crystalline White Musk","Cedarwood","Ambrette Seed"]',
   '10-12 Hours', 'Moderate Elegance',
   '["50ml Spray","100ml Spray"]',
   '["https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&q=80&w=800","https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&q=80&w=800"]',
   0, 1, 4.7, 18),

  ('prod-005', 'Saffron & Smoked Leather', 'Extrait de Parfum', 'Perfumes', 'Spicy', 2400, NULL, 12,
   'Sophisticated Tuscan leather infused with precious Kashmiri saffron, black pepper, velvet suede, and smoldering birch tar. A bold statement fragrance.',
   '["Kashmiri Saffron","Black Pepper","Thyme Blossom"]',
   '["Tuscan Leather","Raspberry Accent","Iris Absolute"]',
   '["Birch Tar","Smoky Amber","Vetiver Root"]',
   '14-18 Hours', 'Dominant & Commanding',
   '["50ml Spray","100ml Spray"]',
   '["https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&q=80&w=800","https://images.unsplash.com/photo-1615397349754-cfa2066a298e?auto=format&fit=crop&q=80&w=800"]',
   1, 0, 4.9, 24),

  ('prod-006', 'Oasis Citrus & Mint Water', 'Pure Cologne Intense', 'Perfumes', 'Fresh', 1250, NULL, 40,
   'Refreshing Mediterranean citrus breeze with crushed spearmint leaves, green tea absolute, sea salt minerals, and crisp white cedar.',
   '["Calabrian Bergamot","Crushed Mint","Grapefruit Zest"]',
   '["Green Tea Leaves","Sea Salt Accord","Neroli"]',
   '["White Cedarwood","Clean Musk","Vetiver"]',
   '8-10 Hours', 'Fresh & Vibrant',
   '["50ml Spray","100ml Spray"]',
   '["https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&q=80&w=800","https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&q=80&w=800"]',
   0, 0, 4.6, 15),

  ('prod-007', 'Dehn Al Oud Al-Malaki', 'Royal Aged Cambodian Oud Oil', 'Oud Specials', 'Woody', 3500, 2999, 8,
   'Pure, unadulterated 40-year-old wild Cambodian agarwood extract. Animalic, woody, deep leather tones with subtle sweet drydown. The holy grail of Oriental perfumery.',
   '["Aged Leather","Wild Wood Smoke","Balsamic Resin"]',
   '["Pure Cambodian Agarwood","Earthy Roots","Labdanum"]',
   '["Smoked Cedar","Vintage Musk","Animalic Accord"]',
   '24+ Hours', 'Heavy & Mystical',
   '["3ml Concentrated","6ml Concentrated","12ml Crystal Flacon"]',
   '["https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?auto=format&fit=crop&q=80&w=800","https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=800"]',
   1, 1, 5.0, 56),

  ('prod-008', 'Majestic Mukhallat Al-Saifee', 'Signature House Blend Attar', 'Pure Attars', 'Oriental', 2100, NULL, 20,
   'Our master perfumer''s secret signature blend. Wild Taif rose, Hindi oud, saffron, cardamoms, and rare ambergris unified into an unforgettable royal trail.',
   '["Fresh Taif Rose","Cardamom","Bergamot"]',
   '["Kashmiri Saffron","Hindi Oud","Geranium"]',
   '["White Amber","Sandalwood","Natural Musk"]',
   '16-20 Hours', 'Powerful & Regal',
   '["6ml Concentrated","12ml Concentrated"]',
   '["https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&q=80&w=800","https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&q=80&w=800"]',
   1, 1, 4.9, 38);

-- 2 default coupons
INSERT OR IGNORE INTO coupons (id, code, discount_type, discount_value, min_order_amount, active)
VALUES
  ('coup-1', 'WELCOME10', 'percent', 10, 0, 1),
  ('coup-2', 'ROYAL300',  'fixed',  300, 2000, 1);

-- Default store settings
INSERT OR IGNORE INTO store_settings (id, store_name, support_email, currency_symbol, tax_rate, free_shipping_threshold, promo_message)
VALUES (1, 'Al-Saifee Perfumes', 'concierge@alsaifeeperfumes.com', '₹', 0.10, 999, 'COMPLIMENTARY EXPRESS SHIPPING ON ORDERS OVER ₹999 • USE CODE WELCOME10 FOR 10% OFF');
