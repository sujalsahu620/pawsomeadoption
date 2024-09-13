// app/lib/apolloClient.js
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const client = new ApolloClient({
  link: new HttpLink({
    uri: 'http://localhost:4000/graphql', // Your GraphQL API URL
  }),
  cache: new InMemoryCache(),
});

export default client;
