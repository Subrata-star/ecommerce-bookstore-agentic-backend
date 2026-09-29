import express, { Request, Response } from 'express';
import { db } from './db.js';

const router = express.Router();

// ── Book Catalog Routes ──────────────────────────────────────────────────────

// GET /api/books?query=...&genre=...&maxPrice=...
router.get('/books', (req: Request, res: Response) => {
  try {
    const query = req.query.query as string | undefined;
    const genre = req.query.genre as string | undefined;
    const maxPriceStr = req.query.maxPrice as string | undefined;
    const maxPrice = maxPriceStr ? parseFloat(maxPriceStr) : undefined;

    const books = db.searchBooks(query, genre, maxPrice);
    res.json({ success: true, count: books.length, books });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/books/:id
router.get('/books/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const book = db.getBook(id);
    if (!book) {
      res.status(404).json({ success: false, error: `Book with ID ${id} not found` });
      return;
    }
    res.json({ success: true, book });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Shopping Cart Routes ─────────────────────────────────────────────────────

// GET /api/cart/:userId
router.get('/cart/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const cart = db.getCart(userId);
    res.json({ success: true, cart });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/cart/:userId
// Body: { bookId: string, quantity: number }
router.post('/cart/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { bookId, quantity } = req.body;

    if (!bookId || typeof quantity !== 'number' || quantity <= 0) {
      res.status(400).json({ success: false, error: 'Valid bookId and a positive quantity are required' });
      return;
    }

    const cart = db.addToCart(userId, bookId, quantity);
    res.json({ success: true, message: 'Item added to cart successfully', cart });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/cart/:userId
// Body: { bookId: string, quantity: number }
router.put('/cart/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { bookId, quantity } = req.body;

    if (!bookId || typeof quantity !== 'number' || quantity < 0) {
      res.status(400).json({ success: false, error: 'Valid bookId and a non-negative quantity are required' });
      return;
    }

    const cart = db.updateCartItem(userId, bookId, quantity);
    res.json({ success: true, message: 'Cart updated successfully', cart });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/cart/:userId/:bookId
router.delete('/cart/:userId/:bookId', (req: Request, res: Response) => {
  try {
    const { userId, bookId } = req.params;
    const cart = db.removeFromCart(userId, bookId);
    res.json({ success: true, message: 'Item removed from cart successfully', cart });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Checkout & Order Routes ──────────────────────────────────────────────────

// POST /api/checkout/:userId
// Body: { shippingAddress: string }
router.post('/checkout/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { shippingAddress } = req.body;

    if (!shippingAddress || typeof shippingAddress !== 'string' || shippingAddress.trim() === '') {
      res.status(400).json({ success: false, error: 'A valid shipping address is required for checkout' });
      return;
    }

    const order = db.checkout(userId, shippingAddress);
    res.json({ success: true, message: 'Order placed successfully', order });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/orders/:orderId
router.get('/orders/:orderId', (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const order = db.getOrder(orderId);
    if (!order) {
      res.status(404).json({ success: false, error: `Order with ID ${orderId} not found` });
      return;
    }
    res.json({ success: true, order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/orders/user/:userId
router.get('/orders/user/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const orders = db.getOrdersByUserId(userId);
    res.json({ success: true, count: orders.length, orders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Express App Factory ──────────────────────────────────────────────────────

export function createServer(): express.Express {
  const app = express();
  app.use(express.json());

  // Welcome route
  app.get('/', (req, res) => {
    res.json({
      name: 'eCommerce Bookstore Backend API',
      version: '1.0.0',
      description: 'Provides REST endpoints and MCP tools for an agentic bookstore integration.',
      documentation: '/api-docs',
    });
  });

  // API router
  app.use('/api', router);

  return app;
}
