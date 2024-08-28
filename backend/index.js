require("dotenv").config();
const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { graphqlUploadExpress } = require("graphql-upload");
const path = require("path");
const fs = require("fs");
const { typeDefs, resolvers } = require("./schema");

const app = express();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// JWT authentication middleware
app.use((req, res, next) => {
  const token = req.headers.authorization || "";
  if (token.startsWith("Bearer ")) {
    const strippedToken = token.replace("Bearer ", "").trim();
    try {
      const decoded = jwt.verify(strippedToken, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      console.error("JWT Verification Error:", err.message);
      return res.status(401).json({ message: "Failed to authenticate token." });
    }
  }
  next();
});

// Add graphql-upload middleware for handling file uploads
app.use(graphqlUploadExpress());

// Serve static files from the uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Initialize Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({
    user: req.user,
  }),
  uploads: false, // Disable default upload handling, handled by graphqlUploadExpress middleware
});

server.start().then(() => {
  server.applyMiddleware({ app });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}${server.graphqlPath}`);
  });
});

module.exports = app;
