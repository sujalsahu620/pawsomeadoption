import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { ApolloServer } from "@apollo/server";
import { NextRequest } from "next/server";
import typeDefs from "./schema";
import resolvers from "./resolvers";
import mongoose from "mongoose";
import Users from "./datasource"; // Import your data source

const uri = process.env.NEXT_PUBLIC_MONGODB_URI;

mongoose.connect(uri);

const server = new ApolloServer({
  resolvers,
  typeDefs,
});

const handler = startServerAndCreateNextHandler(server, {
  context: async (req, res) => ({
    req,
    res,
    dataSources: {
      users: new Users(), // Add your data source here
    },
  }),
});

export async function GET(request) {
  return handler(request);
}

export async function POST(request) {
  return handler(request);
}
