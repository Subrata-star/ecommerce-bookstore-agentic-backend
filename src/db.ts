export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  price: number;
  inventory: number;
  rating: number; // 1 to 5
  description: string;
}

export interface CartItem {
  bookId: string;
  title: string;
  price: number;
  quantity: number;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  totalAmount: number;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  totalAmount: number;
  shippingAddress: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  createdAt: string;
}

// ── In-Memory Data Store ─────────────────────────────────────────────────────

class Database {
  private books: Map<string, Book> = new Map();
  private carts: Map<string, Cart> = new Map();
  private orders: Map<string, Order> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    const initialBooks: Book[] = [
      {
        id: 'book-1',
        title: 'The Pragmatic Programmer',
        author: 'Andrew Hunt & David Thomas',
        genre: 'Technology',
        price: 49.99,
        inventory: 12,
        rating: 4.8,
        description: 'One of the most significant books on software development, full of practical advice for programmers.'
      },
      {
        id: 'book-2',
        title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        author: 'Robert C. Martin',
        genre: 'Technology',
        price: 44.50,
        inventory: 8,
        rating: 4.7,
        description: 'Even bad code can function. But if code isn\'t clean, it can bring a development organization to its knees.'
      },
      {
        id: 'book-3',
        title: 'Dune',
        author: 'Frank Herbert',
        genre: 'Sci-Fi',
        price: 14.99,
        inventory: 25,
        rating: 4.9,
        description: 'Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, who would become the mysterious man known as Muad\'Dib.'
      },
      {
        id: 'book-4',
        title: 'Neuromancer',
        author: 'William Gibson',
        genre: 'Sci-Fi',
        price: 12.99,
        inventory: 15,
        rating: 4.5,
        description: 'The matrix is a world within the world, a consensus hallucination, the representation of every byte of data in cyberspace.'
      },
      {
        id: 'book-5',
        title: 'Atomic Habits',
        author: 'James Clear',
        genre: 'Self-Help',
        price: 16.20,
        inventory: 50,
        rating: 4.9,
        description: 'No matter your goals, Atomic Habits offers a proven framework for improving—every day.'
      },
      {
        id: 'book-6',
        title: 'Steve Jobs',
        author: 'Walter Isaacson',
        genre: 'Biography',
        price: 19.99,
        inventory: 10,
        rating: 4.6,
        description: 'Based on more than forty interviews with Jobs conducted over two years, this is the riveting story of the roller-coaster life of a creative entrepreneur.'
      },
      {
        id: 'book-7',
        title: 'The Hobbit',
        author: 'J.R.R. Tolkien',
        genre: 'Fantasy',
        price: 15.99,
        inventory: 18,
        rating: 4.8,
        description: 'Written for J.R.R. Tolkien\'s own children, The Hobbit met with instant critical acclaim when it was published in 1937.'
      },
      {
        id: 'book-8',
        title: 'Designing Data-Intensive Applications',
        author: 'Martin Kleppmann',
        genre: 'Technology',
        price: 55.00,
        inventory: 14,
        rating: 4.9,
        description: 'An exceptional guide to the principles and practicalities of processing and storing data in modern backend architectures.'
      }
    ];

    initialBooks.forEach(b => this.books.set(b.id, b));
  }

  // ── Book Methods ───────────────────────────────────────────────────────────

  public getAllBooks(): Book[] {
    return Array.from(this.books.values());
  }

  public getBook(id: string): Book | undefined {
    return this.books.get(id);
  }

  public searchBooks(query?: string, genre?: string, maxPrice?: number): Book[] {
    let result = this.getAllBooks();

    if (genre) {
      result = result.filter(b => b.genre.toLowerCase() === genre.toLowerCase());
    }

    if (maxPrice !== undefined) {
      result = result.filter(b => b.price <= maxPrice);
    }

    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        b =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q)
      );
    }

    return result;
  }

  // ── Cart Methods ───────────────────────────────────────────────────────────

  public getCart(userId: string): Cart {
    let cart = this.carts.get(userId);
    if (!cart) {
      cart = { userId, items: [], totalAmount: 0 };
      this.carts.set(userId, cart);
    }
    return cart;
  }

  public addToCart(userId: string, bookId: string, quantity: number): Cart {
    const book = this.getBook(bookId);
    if (!book) {
      throw new Error(`Book with ID ${bookId} not found`);
    }

    if (book.inventory < quantity) {
      throw new Error(`Insufficient inventory for book "${book.title}". Available: ${book.inventory}, Requested: ${quantity}`);
    }

    const cart = this.getCart(userId);
    const existingItem = cart.items.find(item => item.bookId === bookId);

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (book.inventory < newQty) {
        throw new Error(`Cannot add more. Total requested (${newQty}) exceeds available inventory (${book.inventory}).`);
      }
      existingItem.quantity = newQty;
    } else {
      cart.items.push({
        bookId: book.id,
        title: book.title,
        price: book.price,
        quantity: quantity
      });
    }

    this.recalculateCart(cart);
    return cart;
  }

  public updateCartItem(userId: string, bookId: string, quantity: number): Cart {
    const cart = this.getCart(userId);
    const itemIndex = cart.items.findIndex(item => item.bookId === bookId);

    if (itemIndex === -1) {
      throw new Error(`Book with ID ${bookId} is not in the cart`);
    }

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      const book = this.getBook(bookId)!;
      if (book.inventory < quantity) {
        throw new Error(`Insufficient inventory for book "${book.title}". Available: ${book.inventory}, Requested: ${quantity}`);
      }
      cart.items[itemIndex].quantity = quantity;
    }

    this.recalculateCart(cart);
    return cart;
  }

  public removeFromCart(userId: string, bookId: string): Cart {
    const cart = this.getCart(userId);
    cart.items = cart.items.filter(item => item.bookId !== bookId);
    this.recalculateCart(cart);
    return cart;
  }

  public clearCart(userId: string): void {
    this.carts.delete(userId);
  }

  private recalculateCart(cart: Cart) {
    cart.totalAmount = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    // Round total amount to 2 decimal places
    cart.totalAmount = Math.round(cart.totalAmount * 100) / 100;
  }

  // ── Order Methods ──────────────────────────────────────────────────────────

  public getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  public getOrdersByUserId(userId: string): Order[] {
    return Array.from(this.orders.values()).filter(o => o.userId === userId);
  }

  public checkout(userId: string, shippingAddress: string): Order {
    const cart = this.getCart(userId);
    if (cart.items.length === 0) {
      throw new Error('Cannot checkout an empty cart');
    }

    // Double check inventory for all items
    for (const item of cart.items) {
      const book = this.getBook(item.bookId);
      if (!book || book.inventory < item.quantity) {
        throw new Error(`Inventory check failed during checkout for "${item.title}".`);
      }
    }

    // Deduct inventory
    for (const item of cart.items) {
      const book = this.getBook(item.bookId)!;
      book.inventory -= item.quantity;
    }

    const orderId = `order-${Math.floor(100000 + Math.random() * 900000)}`;
    const newOrder: Order = {
      id: orderId,
      userId,
      items: [...cart.items],
      totalAmount: cart.totalAmount,
      shippingAddress,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    this.orders.set(orderId, newOrder);
    this.clearCart(userId);

    // Auto-advance order status for simulation purposes
    setTimeout(() => {
      newOrder.status = 'processing';
      setTimeout(() => {
        newOrder.status = 'shipped';
      }, 30000); // 30 seconds to ship
    }, 10000); // 10 seconds to process

    return newOrder;
  }
}

export const db = new Database();
