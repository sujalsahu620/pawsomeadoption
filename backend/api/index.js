// api/index.js
import { ApolloServer } from "apollo-server-micro";
import { typeDefs, resolvers } from "../../schema"; // Adjust the path if needed
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({
    user: req.user,
  }),
});

const startServer = async () => {
  // Connect to MongoDB
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected");
  }

  await server.start();
};

// Middleware to handle JWT authentication
const middleware = (handler) => async (req, res) => {
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
  await handler(req, res);
};

export default async (req, res) => {
  await startServer();
  return middleware(server.createHandler({ path: "/api/graphql" }))(req, res);
};

export const config = {
  api: {
    bodyParser: false,
  },
};
