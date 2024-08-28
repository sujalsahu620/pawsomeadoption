require("dotenv").config();
const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { typeDefs, resolvers } = require("./schema");

const app = express();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Middleware to handle JWT authentication
app.use((req, res, next) => {
  const token = req.headers.authorization || "";
  console.log("Received Authorization Header:", token); // Debugging log

  if (token.startsWith("Bearer ")) {
    const strippedToken = token.replace("Bearer ", "").trim();
    console.log("Stripped Token:", strippedToken); // Debugging log

    try {
      const decoded = jwt.verify(strippedToken, process.env.JWT_SECRET);
      console.log("Decoded JWT Payload:", decoded); // Debugging log
      req.user = decoded;
      next(); // Proceed to the next middleware or route handler
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        console.error("Token expired at:", err.expiredAt);
        return res.status(401).json({ message: "Token expired, please log in again." });
      }
      console.error("JWT Verification Error:", err.message);
      return res.status(401).json({ message: "Failed to authenticate token." });
    }
  } else {
    if (token) {
      console.error("Token not in Bearer format");
      return res.status(401).json({ message: "Invalid token format." });
    }
    next();
  }
});

// Set up Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "uploads/");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// File upload route
app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.status(200).json({ url: imageUrl });
});

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Initialize Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({
    user: req.user, // Attach user information to the context
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
