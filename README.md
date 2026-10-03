# Al-Saifee Perfumes - E-Commerce Platform

Al-Saifee Perfumes is a custom-built, decoupled e-commerce platform designed specifically for artisanal fragrances. The application is built entirely on the Cloudflare edge network, providing minimal latency, high availability, and serverless scalability.

## Architecture Overview

The system follows a strict decoupled architecture separated into a static frontend and a serverless backend.

*   **Frontend (Cloudflare Pages):** Built with React 19, TypeScript, and Vite. State management is handled natively via React Context (StoreContext for remote data syncing, CartContext for local cart state). The frontend is compiled to static assets and served globally via Cloudflare Pages.
*   **Backend (Cloudflare Workers):** The API is built using Hono, a lightweight, ultrafast web framework optimized for edge runtimes. It handles routing, authorization, and checkout orchestration.
*   **Database (Cloudflare D1):** A serverless SQLite database native to Cloudflare. The schema is fully normalized, separating products, orders, order items, reviews, and store settings, utilizing foreign key constraints and cascading deletes to maintain referential integrity.
*   **Payments (Razorpay):** Integrated directly via the Razorpay REST API to avoid heavy Node.js SDK dependencies on the edge.

## System Design & Technical Implementation

### Security-First Payment Flow
To prevent client-side price manipulation, the frontend cart never dictates the final order amount. During the checkout process:
1. The frontend submits an array of product IDs and quantities.
2. The Worker queries the D1 database to determine the authoritative price for each item.
3. Subtotals, dynamic tax rates, and shipping thresholds are recalculated server-side.
4. The Worker generates the Razorpay order and returns the `keyId` and `amount` to the client for the payment overlay.
5. Upon completion, the Razorpay HMAC-SHA256 signature is verified server-side using the native Web Crypto API before the order is committed.

### Concurrency and Inventory Management
Inventory race conditions are mitigated by utilizing atomic D1 batch transactions. When a payment is verified, the order insertion, order items insertion, and product stock decrements are queued in a single `db.batch()` call. A strict `WHERE stock >= quantity` clause ensures that concurrent checkouts cannot oversell limited inventory.

### Edge Authentication
Administrative access is secured via JSON Web Tokens (JWT). Due to the constraints of the V8 isolate environment in Cloudflare Workers, authentication is implemented entirely via the standard Web Crypto API. Passwords are hashed using PBKDF2 (100,000 iterations), and JWTs are signed and verified using HMAC-SHA256. Registration is locked after the initial admin account is provisioned to prevent privilege escalation.

## Local Development Setup

### Prerequisites
*   Node.js (v18+)
*   Cloudflare Wrangler CLI (`npm install -g wrangler`)

### Backend Setup (Worker)
1. Navigate to the `worker/` directory and install dependencies.
2. Instantiate a local D1 database: `npx wrangler d1 execute al-saifee-db --local --file=./src/db/schema.sql`
3. Seed the initial data: `npx wrangler d1 execute al-saifee-db --local --file=./src/db/seed.sql`
4. Rename `.env.example` to `.env` and add your development Razorpay keys. Do not commit real production secrets to version control.
5. Start the local worker: `npx wrangler dev`

### Frontend Setup (Pages)
1. Navigate to the `frontend/` directory and install dependencies.
2. Ensure the backend is running locally on port 8787. The Vite configuration will automatically proxy `/api` requests to the local worker.
3. Start the development server: `npm run dev`

## Deployment

Deployments are managed via Wrangler. 
*   **Backend:** Authenticate via `wrangler login`, provision a production D1 database, set the `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `JWT_SECRET` via `wrangler secret put`, and run `wrangler deploy`.
*   **Frontend:** Update the `API_BASE` in the frontend API client to point to your live Worker URL, run `npm run build`, and deploy the `dist` folder via `wrangler pages deploy dist`.
