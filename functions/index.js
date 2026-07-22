const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const Stripe = require('stripe');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

// Initialize Stripe if API key exists in config
const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY || functions.config().stripe?.secret;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return Stripe(secretKey);
};

/**
 * Cloud Function 1: Create Stripe Checkout Session
 */
exports.createCheckoutSession = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
      const { items, customerEmail, customerName, shippingAddress, discountCode } = req.body;

      if (!items || !items.length || !customerEmail) {
        return res.status(400).json({ error: 'Missing required order details' });
      }

      // Calculate totals
      let subtotal = 0;
      const lineItems = items.map((item) => {
        const itemPrice = Math.round(item.price * 100);
        subtotal += item.price * item.quantity;
        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${item.title} (${item.selectedSize || 'Standard'})`,
              description: item.category || 'Luxury Fragrance',
              images: item.images && item.images.length ? [item.images[0]] : [],
            },
            unit_amount: itemPrice,
          },
          quantity: item.quantity,
        };
      });

      // Handle Coupon Discount
      let discountAmount = 0;
      if (discountCode) {
        const couponRef = await db.collection('coupons').where('code', '==', discountCode.toUpperCase()).get();
        if (!couponRef.empty) {
          const couponData = couponRef.docs[0].data();
          if (couponData.active) {
            if (couponData.discountType === 'percent') {
              discountAmount = (subtotal * couponData.discountValue) / 100;
            } else if (couponData.discountType === 'fixed') {
              discountAmount = couponData.discountValue;
            }
          }
        }
      }

      const orderNumber = 'ELE-' + Math.floor(100000 + Math.random() * 900000);

      // Create Order Document in Firestore
      const orderRef = await db.collection('orders').add({
        orderNumber,
        customerEmail,
        customerName: customerName || 'Valued Guest',
        shippingAddress: shippingAddress || {},
        items,
        subtotal,
        discount: discountAmount,
        tax: Math.round((subtotal - discountAmount) * 0.1 * 100) / 100,
        shippingFee: subtotal > 50 ? 0 : 15,
        total: Math.max(0, subtotal - discountAmount) * 1.1 + (subtotal > 50 ? 0 : 15),
        status: 'Processing',
        paymentStatus: 'Paid',
        paymentMethod: 'Stripe Checkout',
        createdAt: new Date().toISOString(),
      });

      // Try creating Stripe session if Stripe configured
      try {
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          customer_email: customerEmail,
          line_items: lineItems,
          mode: 'payment',
          success_url: `${req.headers.origin}/success?orderId=${orderRef.id}`,
          cancel_url: `${req.headers.origin}/checkout`,
          metadata: {
            orderId: orderRef.id,
            orderNumber,
          },
        });

        return res.json({ id: session.id, url: session.url, orderId: orderRef.id, orderNumber });
      } catch (stripeErr) {
        // Fallback for demo mode without live Stripe key
        console.log('Stripe initialization notice:', stripeErr.message);
        return res.json({
          orderId: orderRef.id,
          orderNumber,
          message: 'Order created successfully (Demo Payment Mode)',
        });
      }
    } catch (error) {
      console.error('Checkout error:', error);
      return res.status(500).json({ error: error.message });
    }
  });
});

/**
 * Cloud Function 2: Stripe Webhook Handler
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || functions.config().stripe?.webhook_secret;

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata.orderId;

    if (orderId) {
      await db.collection('orders').doc(orderId).update({
        paymentStatus: 'Paid',
        stripePaymentIntentId: session.payment_intent,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  res.json({ received: true });
});

/**
 * Cloud Function 3: Validate Coupon Code
 */
exports.validateCoupon = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    const { code, cartTotal } = req.body;
    if (!code) return res.status(400).json({ valid: false, message: 'Coupon code required' });

    try {
      const snapshot = await db.collection('coupons').where('code', '==', code.toUpperCase()).get();
      if (snapshot.empty) {
        return res.json({ valid: false, message: 'Invalid promotional code' });
      }

      const coupon = snapshot.docs[0].data();
      if (!coupon.active) {
        return res.json({ valid: false, message: 'This coupon has expired' });
      }

      if (coupon.minOrderAmount && cartTotal < coupon.minOrderAmount) {
        return res.json({
          valid: false,
          message: `Minimum order of $${coupon.minOrderAmount} required for this code`,
        });
      }

      return res.json({
        valid: true,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });
});

/**
 * Cloud Function 4: Assign Admin Claim
 */
exports.setAdminClaim = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    const { email, secretKey } = req.body;
    // Check master secret key or allow during first setup
    const masterKey = process.env.ADMIN_SETUP_SECRET || 'oud_elixir_secret_2026';
    if (secretKey !== masterKey) {
      return res.status(403).json({ error: 'Unauthorized secret key' });
    }

    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().setCustomUserClaims(user.uid, { admin: true });

      // Add to admins collection for rules check
      await db.collection('admins').doc(user.uid).set({
        email: user.email,
        createdAt: new Date().toISOString(),
      });

      return res.json({ success: true, message: `Admin privileges assigned to ${email}` });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });
});
