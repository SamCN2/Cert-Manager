const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');

const app = express();
const PORT = 3005;

// Configure handlebars
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/material', express.static(path.join(__dirname, '../node_modules/material-components-web/dist')));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure API base URL
app.locals.apiBaseUrl = 'http://localhost:3004';

// Routes
app.get('/', (req, res) => {
  res.render('home');
});

// User routes
app.use('/users', require('./routes/users'));

// Group routes
app.use('/groups', require('./routes/groups'));

// Start server
app.listen(PORT, () => {
  console.log(`User Manager app listening at http://localhost:${PORT}`);
}); 