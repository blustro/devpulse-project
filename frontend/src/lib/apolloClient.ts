import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

const httpLink = new HttpLink({
  uri: 'http://localhost:4000/graphql',
  headers: {
    authorization: localStorage.getItem('devpulse_token')
      ? `Bearer ${localStorage.getItem('devpulse_token')}`
      : '',
  },
});

// ✨ Enhanced WebSocket client with debug logging
const wsClient = createClient({
  url: 'ws://localhost:4000/graphql',
  connectionParams: () => {
    const token = localStorage.getItem('devpulse_token');
    return {
      authorization: token ? `Bearer ${token}` : '',
    };
  },
  on: {
    connected: () =>
      console.log('🟢 [WebSocket]: Connected successfully to server!'),
    closed: (event) => console.log('🔴 [WebSocket]: Connection closed', event),
    error: (err) => console.error('⚠️ [WebSocket]: Connection error', err),

    // 🔍 ADD THIS: Logs every incoming/outgoing frame (including subscription requests & errors)
    message: (message) => console.log('📥 [WebSocket Raw Frame]:', message),
  },
});

const wsLink = new GraphQLWsLink(wsClient);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink,
);

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
