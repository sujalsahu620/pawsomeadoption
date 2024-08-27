require('dotenv').config();
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { graphqlUploadExpress } = require('graphql-upload');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { typeDefs, resolvers } = require('./schema');

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware for handling file uploads
app.use(graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }));

// Middleware to authenticate JWT tokens and attach user to context
app.use((req, res, next) => {
  const token = req.headers.authorization || '';
  if (token) {
    try {
      const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      console.error('Failed to authenticate token:', err);
    }
  }
  next();
});

// Initialize Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({
    user: req.user,  // Attach the authenticated user to the context
  }),
});

// Apply Apollo GraphQL middleware
server.start().then(() => {
  server.applyMiddleware({ app });

  // No need to specify a port; Vercel handles it
  // module.exports is the way to expose the app to Vercel
  module.exports = app;
});
