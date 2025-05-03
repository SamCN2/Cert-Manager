/**
 * Copyright (c) 2025 ogt11.com, llc
 */

const express = require('express');
const path = require('path');
const handlebars = require('express-handlebars');
const routes = require('./routes/index');

const app = express();
const port = process.env.PORT || 3006;

// View engine setup
app.engine('handlebars', handlebars());
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use('/request/public', express.static(path.join(__dirname, 'public')));

// Serve JavaScript files
app.use('/request/js', express.static(path.join(__dirname, 'public/js')));

// Serve CSS files
app.use('/request/css', express.static(path.join(__dirname, 'public/css')));

// Routes
app.use('/request', routes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).render('error', {
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start server
app.listen(port, () => {
  console.info(`User Request service listening at http://localhost:${port}`);
}); 