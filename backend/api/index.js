import { ApolloServer } from "apollo-server-micro";
import { typeDefs, resolvers } from "../schema"; // Adjust path if needed
import mongoose from "mongoose";

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({
    user: req.user,
  }),
});

let isApolloServerStarted = false;

const startServer = async () => {
  if (!isApolloServerStarted) {
    await apolloServer.start();
    isApolloServerStarted = true;

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("MongoDB connected");
    }
  }
};

const serverHandler = async (req, res) => {
  await startServer();

  return apolloServer.createHandler({
    path: "/api/graphql",
  })(req, res);
};

export default serverHandler;

export const config = {
  api: {
    bodyParser: false,
  },
};
