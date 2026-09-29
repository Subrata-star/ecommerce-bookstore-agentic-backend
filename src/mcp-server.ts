import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { db } from "./db.js";

// ── MCP Server Instance ──────────────────────────────────────────────────────

export const mcpServer = new McpServer({
  name: "ecommerce-bookstore-agentic-tools",
  version: "1.0.0",
});

// ── Tool 1: search_books ─────────────────────────────────────────────────────

mcpServer.tool(
  "search_books",
  "Search the bookstore catalog by text query, genre, or maximum price. Returns a list of matching books.",
  {
    query: z.string().optional().describe("Keywords to match in title, author, or description"),
    genre: z.string().optional().describe("Specific genre to filter by (e.g., 'Technology', 'Sci-Fi', 'Biography', 'Fantasy', 'Self-Help')"),
    maxPrice: z.number().optional().describe("Maximum price of books to include in results"),
  },
  async ({ query, genre, maxPrice }) => {
    try {
      const books = db.searchBooks(query, genre, maxPrice);
      if (books.length === 0) {
        return {
          content: [{ type: "text", text: "No books found matching the specified filters." }],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                message: `Found ${books.length} matching book(s).`,
                books: books.map((b) => ({
                  id: b.id,
                  title: b.title,
                  author: b.author,
                  genre: b.genre,
                  price: `$${b.price.toFixed(2)}`,
                  rating: `${b.rating}/5.0`,
                  availableStock: b.inventory,
                  description: b.description,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error searching books: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 2: get_book_details ─────────────────────────────────────────────────

mcpServer.tool(
  "get_book_details",
  "Retrieve detailed information about a single book by its ID.",
  {
    bookId: z.string().describe("The unique ID of the book (e.g., 'book-1')"),
  },
  async ({ bookId }) => {
    try {
      const book = db.getBook(bookId);
      if (!book) {
        return {
          content: [{ type: "text", text: `Error: Book with ID '${bookId}' not found.` }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                bookId: book.id,
                title: book.title,
                author: book.author,
                genre: book.genre,
                price: `$${book.price.toFixed(2)}`,
                stock: book.inventory > 0 ? `${book.inventory} copies available` : "Out of stock",
                rating: `${book.rating} out of 5 stars`,
                description: book.description,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error retrieving book details: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 3: get_cart ─────────────────────────────────────────────────────────

mcpServer.tool(
  "get_cart",
  "View the shopping cart contents and total amount for a specific user.",
  {
    userId: z.string().describe("The unique ID of the user/customer (e.g., 'user-123')"),
  },
  async ({ userId }) => {
    try {
      const cart = db.getCart(userId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                userId: cart.userId,
                itemsCount: cart.items.length,
                items: cart.items.map((i) => ({
                  bookId: i.bookId,
                  title: i.title,
                  price: `$${i.price.toFixed(2)}`,
                  quantity: i.quantity,
                  subtotal: `$${(i.price * i.quantity).toFixed(2)}`,
                })),
                totalAmount: `$${cart.totalAmount.toFixed(2)}`,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error retrieving cart: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 4: add_to_cart ──────────────────────────────────────────────────────

mcpServer.tool(
  "add_to_cart",
  "Add a book to the user's shopping cart. Validates available inventory first.",
  {
    userId: z.string().describe("The unique ID of the user/customer"),
    bookId: z.string().describe("The unique ID of the book to add"),
    quantity: z.number().int().positive().default(1).describe("Number of copies to add"),
  },
  async ({ userId, bookId, quantity }) => {
    try {
      const cart = db.addToCart(userId, bookId, quantity);
      const book = db.getBook(bookId)!;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: `Successfully added ${quantity} copy(ies) of "${book.title}" to cart for ${userId}.`,
                updatedCart: {
                  userId: cart.userId,
                  items: cart.items.map((i) => ({
                    bookId: i.bookId,
                    title: i.title,
                    price: `$${i.price.toFixed(2)}`,
                    quantity: i.quantity,
                    subtotal: `$${(i.price * i.quantity).toFixed(2)}`,
                  })),
                  totalAmount: `$${cart.totalAmount.toFixed(2)}`,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error adding item to cart: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 5: update_cart ──────────────────────────────────────────────────────

mcpServer.tool(
  "update_cart",
  "Update the quantity of a book already in the user's shopping cart. Set quantity to 0 to remove it.",
  {
    userId: z.string().describe("The unique ID of the user/customer"),
    bookId: z.string().describe("The unique ID of the book to update"),
    quantity: z.number().int().nonnegative().describe("New quantity (must be 0 or more)"),
  },
  async ({ userId, bookId, quantity }) => {
    try {
      const cart = db.updateCartItem(userId, bookId, quantity);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: `Cart updated. Set quantity of book '${bookId}' to ${quantity}.`,
                updatedCart: {
                  userId: cart.userId,
                  items: cart.items.map((i) => ({
                    bookId: i.bookId,
                    title: i.title,
                    price: `$${i.price.toFixed(2)}`,
                    quantity: i.quantity,
                    subtotal: `$${(i.price * i.quantity).toFixed(2)}`,
                  })),
                  totalAmount: `$${cart.totalAmount.toFixed(2)}`,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error updating cart: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 6: remove_from_cart ─────────────────────────────────────────────────

mcpServer.tool(
  "remove_from_cart",
  "Completely remove a book from the user's shopping cart.",
  {
    userId: z.string().describe("The unique ID of the user/customer"),
    bookId: z.string().describe("The unique ID of the book to remove"),
  },
  async ({ userId, bookId }) => {
    try {
      const cart = db.removeFromCart(userId, bookId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: `Removed book '${bookId}' from cart.`,
                updatedCart: {
                  userId: cart.userId,
                  items: cart.items.map((i) => ({
                    bookId: i.bookId,
                    title: i.title,
                    price: `$${i.price.toFixed(2)}`,
                    quantity: i.quantity,
                    subtotal: `$${(i.price * i.quantity).toFixed(2)}`,
                  })),
                  totalAmount: `$${cart.totalAmount.toFixed(2)}`,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error removing from cart: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 7: checkout_cart ────────────────────────────────────────────────────

mcpServer.tool(
  "checkout_cart",
  "Checkout the user's shopping cart, deduct book inventory, empty the cart, and create a purchase order.",
  {
    userId: z.string().describe("The unique ID of the user/customer"),
    shippingAddress: z.string().min(5).describe("Full shipping address for delivery"),
  },
  async ({ userId, shippingAddress }) => {
    try {
      const order = db.checkout(userId, shippingAddress);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: "Order placed successfully! Inventory has been updated.",
                order: {
                  orderId: order.id,
                  userId: order.userId,
                  items: order.items.map((i) => ({
                    bookId: i.bookId,
                    title: i.title,
                    quantity: i.quantity,
                    price: `$${i.price.toFixed(2)}`,
                  })),
                  totalAmount: `$${order.totalAmount.toFixed(2)}`,
                  shippingAddress: order.shippingAddress,
                  status: order.status,
                  createdAt: order.createdAt,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error checking out: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 8: get_order_status ─────────────────────────────────────────────────

mcpServer.tool(
  "get_order_status",
  "Check the fulfillment and delivery status of a previously placed order.",
  {
    orderId: z.string().describe("The unique order ID (e.g., 'order-123456')"),
  },
  async ({ orderId }) => {
    try {
      const order = db.getOrder(orderId);
      if (!order) {
        return {
          content: [{ type: "text", text: `Error: Order with ID '${orderId}' not found.` }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                orderId: order.id,
                userId: order.userId,
                status: order.status,
                totalAmount: `$${order.totalAmount.toFixed(2)}`,
                shippingAddress: order.shippingAddress,
                createdAt: order.createdAt,
                items: order.items.map((i) => ({
                  title: i.title,
                  quantity: i.quantity,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error fetching order status: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// ── Main Start Function for standalone run ───────────────────────────────────

if (process.argv[1] && process.argv[1].endsWith("mcp-server.ts")) {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error("Bookstore MCP Server started via Stdio Transport.");
}
