const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const booksdb = require('./booksdb');
const { users, isValid, authenticatedUser } = require('./auth_users.js');
const jwt = require('jsonwebtoken');

const public_users = express.Router();
const app = express();

// Middleware to parse incoming requests with JSON payloads
app.use(express.json());

// Register a new user
app.post("/register", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
    }

    if (isValid(username)) {
        return res.status(400).json({ message: "Username already exists" });
    }

    users.push({ username, password });
    res.status(201).json({ message: "User registered successfully" });
});

// User login
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
    }

    if (!authenticatedUser(username, password)) {
        return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign({ username }, 'your-secret-key', { expiresIn: '1h' });
    res.status(200).json({ message: "Login successful", token });
});

// Get the list of all books
app.get('/', async (req, res) => {
    try {
        res.status(200).json({ books });
    } catch (error) {
        res.status(500).json({ message: "Error retrieving books" });
    }
});

// Get book details by ISBN
app.get('/isbn/:isbn', async (req, res) => {
    const { isbn } = req.params;
    const book = books[isbn];

    book
        ? res.status(200).json(book)
        : res.status(404).json({ message: "Book not found" });
});

// Get books by author
app.get('/author/:author', async (req, res) => {
    const { author } = req.params;
    const filteredBooks = Object.values(books).filter(book => book.author === author);

    filteredBooks.length > 0
        ? res.status(200).json(filteredBooks)
        : res.status(404).json({ message: "No books found by this author" });
});

// Get books by title
app.get('/title/:title', async (req, res) => {
    const { title } = req.params;
    const filteredBooks = Object.values(books).filter(book => book.title === title);

    filteredBooks.length > 0
        ? res.status(200).json(filteredBooks)
        : res.status(404).json({ message: "No books found with this title" });
});

// Get book reviews based on ISBN
app.get('/review/:isbn', async (req, res) => {
    const { isbn } = req.params;
    const book = books[isbn];

    book
        ? res.status(200).json(book.reviews || { message: "No reviews available for this book" })
        : res.status(404).json({ message: "Book not found" });
});

// Add or modify a review for a book
app.post('/review/:isbn', (req, res) => { // Removed the verifyToken middleware here
    const { isbn } = req.params;
    const { review } = req.body;
    const { username } = req.body; // No longer extracting from token, just using the sent username

    if (!review) {
        return res.status(400).json({ message: "Review content is required" });
    }

    const book = books[isbn];
    if (!book) {
        return res.status(404).json({ message: "Book not found" });
    }

    // Check if the user has already reviewed this book
    const existingReview = book.reviews.find(r => r.username === username);
    if (existingReview) {
        // Modify the existing review
        existingReview.review = review;
        return res.status(200).json({ message: "Review updated successfully", review: existingReview });
    } else {
        // Add a new review
        const newReview = { username, review };
        book.reviews.push(newReview);
        return res.status(201).json({ message: "Review added successfully", review: newReview });
    }
});

// Proxy setup with redirect handling
app.use('/proxy', createProxyMiddleware({
    target: 'http://172.22.182.181:8888', // Ensure this is the correct target
    changeOrigin: true,
    pathRewrite: { '^/proxy': '' },
    followRedirects: true,  // Follow redirects if the target server sends one
    onProxyReq: (proxyReq, req, res) => {
        console.log(`Proxying request to: ${proxyReq.url}`);
        console.log(`Headers: ${JSON.stringify(req.headers)}`);
    },
    onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).json({
            message: 'Proxy error',
            error: err.message,
            details: err
        });
    }
}));

// Set up the server to listen on port 5000
const port = process.env.PORT || 5000;
const host = '0.0.0.0'; // Listen on all available interfaces
app.listen(port, host, () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
});
