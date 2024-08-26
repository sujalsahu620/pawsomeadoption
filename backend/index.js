// index.js
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { graphqlUploadExpress } = require('graphql-upload');
const mongoose = require('mongoose');
const { typeDefs, resolvers } = require('./schema');
require('dotenv').config();

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

const app = express();

// File upload middleware
app.use(graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 })); // Adjust the settings as needed

// Apollo Server setup
const server = new ApolloServer({
  typeDefs,
  resolvers,
  uploads: false, // Disable the default upload handling in Apollo Server
});

server.start().then(() => {
  server.applyMiddleware({ app });

  const PORT = process.env.PORT || 400;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}${server.graphqlPath}`);
  });
});
