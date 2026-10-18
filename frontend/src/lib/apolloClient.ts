import {
  ApolloClient,
  InMemoryCache,
  ApolloLink,
  HttpLink,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

// 1. HTTP link for Queries and Mutations
const httpLink = new HttpLink({
  uri: 'http://localhost:4000/graphql',
});

// 2. Auth link to automatically attach devpulse_token to HTTP requests
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('devpulse_token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// 3. WebSocket link with connectionParams for real-time subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:4000/graphql',
    connectionParams: () => {
      const token = localStorage.getItem('devpulse_token');
      return {
        authorization: token ? `Bearer ${token}` : '',
      };
    },
  }),
);

// 4. Route traffic: Subscriptions go to WebSockets, Queries/Mutations go through auth + http
const splitLink = ApolloLink.split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  authLink.concat(httpLink),
);

// 5. Export the configured client
export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
