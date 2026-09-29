import { createServer } from './server.js';

const PORT = process.env.PORT || 3000;
const app = createServer();

app.listen(PORT, () => {
  console.log('============================================================');
  console.log(`🚀 eCommerce Bookstore Backend is running on port ${PORT}`);
  console.log(`👉 REST API Welcome: http://localhost:${PORT}/`);
  console.log(`👉 REST API Books Catalog: http://localhost:${PORT}/api/books`);
  console.log(`👉 REST API Sample Cart: http://localhost:${PORT}/api/cart/user-123`);
  console.log('------------------------------------------------------------');
  console.log('🤖 Agentic integration enabled!');
  console.log('To start the Bookstore MCP Server for IBM Bob or other agents:');
  console.log('  npm run mcp');
  console.log('============================================================');
});
