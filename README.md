# Oud & Elixir — Luxury Perfumes & Pure Attars E-Commerce House

A high-end, responsive luxury fragrance e-commerce web application built with **React (Vite)**, **Firebase (Firestore & Authentication)**, **Stripe**, and **Cloud Functions**.

---

## 🌟 Key Features

### 🛍️ Customer Experience
- **Luxury Hero & Showcase**: Elegant obsidian and champagne gold aesthetic featuring static high-resolution imagery, brand heritage, and curated fragrance spotlights.
- **Interactive Shop**: Advanced sidebar filtering by Category (*Perfumes, Pure Attars, Artisanal Extracts, Oud Specials*), Fragrance Family (*Woody, Amber, Floral, Oriental, Fresh, Spicy*), Price slider, Sorting (*Price Low/High, Rating, Newest*), Search bar, and Pagination.
- **Product Detail**: Multi-view bottle gallery, interactive Fragrance Notes Pyramid (*Top, Heart, Base notes with visual badges*), Size selection (12ml pure attar, 50ml, 100ml Extrait de Parfum), Longevity & Projection meters, Wishlist toggle (persisted), and CRUD Reviews with star ratings.
- **Cart Slide-in Drawer**: Quantity adjustments (+/-), item removal, coupon code validation (`WELCOME10` for 10% off), tax calculation (10%), free shipping calculator ($50 threshold), and checkout trigger.
- **Guest Checkout**: Guest-friendly checkout flow collecting customer name, email, and shipping address before redirecting to Stripe Hosted Checkout or running a seamless luxury demo process.
- **Order Confirmation & PDF Invoice**: Generates a PDF invoice with itemized breakdown, tax, shipping, and order tracking link.
- **Real-Time Order Tracking**: Lookup orders by Order Number (e.g. `ELE-8921`) and Customer Email with a status progress bar (*Processing -> Shipped -> Delivered*).

### 🔐 Admin Dashboard (`/admin`)
- **Dashboard Overview**: Metrics for Total Revenue, Orders, Products, and Pending Shipments.
- **Orders Management**: Search orders, view line items and customer addresses, and update order status.
- **Product Management (CRUD)**: Create, edit, and delete products with top/mid/base note tags, price, stock, category, and images.
- **Coupon Management**: Create percentage or fixed-value promo codes with minimum order limits.
- **Review Moderation**: Approve or delete customer product reviews.
- **Store Settings**: Configure tax rates, free shipping thresholds, store currency, and banner announcements.

---

## 📁 Repository Directory Structure

```
├── public/                 # Public assets and favicon
├── src/
│   ├── components/         # Navbar, Hero, ProductCard, CartDrawer, FragranceNotes...
│   ├── pages/              # Home, Shop, ProductDetail, Checkout, Success, OrderTracking, Admin...
│   ├── context/            # CartContext, AuthContext, StoreContext
│   ├── utils/              # firebase.js, seedData.js, pdfGenerator.js
│   └── styles/             # Modular CSS stylesheets (Gold & Black Luxury theme)
├── functions/              # Firebase Cloud Functions (index.js, package.json)
├── firestore.rules         # Security Rules for Firestore
├── firebase.json           # Firebase Deployment Config
├── .env.example            # Environment variables template
├── package.json            # Vite React dependencies
└── README.md               # Documentation
```

---

## 🚀 Setup & Installation

### 1. Clone & Install Dependencies
```bash
npm install
cd functions && npm install && cd ..
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your Firebase & Stripe API keys:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_STRIPE_PUBLIC_KEY=your_stripe_key
```

### 3. Run Development Server
```bash
npm run dev
```
The application will start on `http://localhost:3000`.

---

3. Or use the built-in First Admin Setup tool on the `/admin/login` page!

---

© 2026 Oud & Elixir Fragrance House. All rights reserved.
