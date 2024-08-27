// index.js
require("dotenv").config(); // Load environment variables from .env file
const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const { graphqlUploadExpress } = require("graphql-upload");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { typeDefs, resolvers } = require("./schema");

const app = express();
// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware for handling file uploads
app.use(graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }));

// Middleware to authenticate JWT tokens and attach user to context
app.use((req, res, next) => {
  const token = req.headers.authorization || "";
  if (token) {
    try {
      const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      console.error("Failed to authenticate token:", err);
    }
  }
  next();
});

// Initialize Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({
    user: req.user, // Attach the authenticated user to the context
  }),
});

// Apply Apollo GraphQL middleware and start the server
server.start().then(() => {
  server.applyMiddleware({ app });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}${server.graphqlPath}`);
  });
});
