import { ApolloServer } from "apollo-server-micro";
import { typeDefs, resolvers } from "./schema"; // Adjust the path if needed
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { createServer } from "http";
import { parse } from "url";

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({
    user: req.user,
  }),
});

const startServer = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected");
  }

  await apolloServer.start();
};

const serverHandler = async (req, res) => {
  await startServer();

  const { query } = parse(req.url, true);

  if (query && query.graphql) {
    return apolloServer.createHandler({
      path: "/api/graphql",
    })(req, res);
  }

  res.statusCode = 404;
  res.end("Not Found");
};

export default serverHandler;

export const config = {
  api: {
    bodyParser: false,
  },
};
