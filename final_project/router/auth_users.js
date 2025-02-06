const express = require('express');
const jwt = require('jsonwebtoken');
const regd_users = express.Router();

let users = []; // Store users in an array for better structure

// Function to check if a username exists
const isValid = (username) => users.some(user => user.username === username);

// Function to authenticate a user
const authenticatedUser = (username, password) => {
    const user = users.find(user => user.username === username);
    return user && user.password === password;
};

// Register a new user
regd_users.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    if (isValid(username)) {
        return res.status(400).json({ message: 'Username already exists' });
    }

    users.push({ username, password });
    res.status(201).json({ message: 'User registered successfully' });
});

// User login
regd_users.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    if (!authenticatedUser(username, password)) {
        return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ username }, 'your-secret-key', { expiresIn: '1h' });
    res.status(200).json({ message: 'Login successful', token });
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: 'No token provided' });

    jwt.verify(token, 'your-secret-key', (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Invalid or expired token' });
        req.user = decoded;
        next();
    });
};

// Add or update a book review
regd_users.put('/auth/review/:isbn', verifyToken, async (req, res) => {
    const { isbn } = req.params;
    const { review } = req.body;

    if (!books[isbn]) {
        return res.status(404).json({ message: 'Book not found' });
    }

    books[isbn].reviews = books[isbn].reviews || {};
    books[isbn].reviews[req.user.username] = review;

    res.status(200).json({ message: 'Review added/updated successfully' });
});

module.exports = { authenticated: regd_users, isValid, authenticatedUser, users };
