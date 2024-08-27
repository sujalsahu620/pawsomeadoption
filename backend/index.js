// index.js
require("dotenv").config();
const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { typeDefs, resolvers } = require("./schema"); // Import typeDefs and resolvers

const app = express();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Middleware to handle JWT authentication
app.use((req, res, next) => {
  const token = req.headers.authorization || "";
  if (token) {
    try {
      const decoded = jwt.verify(
        token.replace("Bearer ", ""),
        process.env.JWT_SECRET
      );
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
    user: req.user,
  }),
});

// Apply Apollo GraphQL middleware
server.start().then(() => {
  server.applyMiddleware({ app });

  // Listen on a specific port for development
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(
      `Server is running on http://localhost:${PORT}${server.graphqlPath}`
    );
  });
});

module.exports = app;
