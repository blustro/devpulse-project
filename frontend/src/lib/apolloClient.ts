import { ApolloClient, InMemoryCache } from '@apollo/client';
import { HttpLink } from '@apollo/client/link/http';
import { SetContextLink } from '@apollo/client/link/context';

// 1. Point to your backend GraphQL server
const httpLink = new HttpLink({
  uri: 'http://localhost:4000',
});

// 2. Automatically attach the JWT rtoken from localStorage if it exists
const authLink = new SetContextLink((prevContext) => {
  const token = localStorage.getItem('devpulse_token');
  return {
    headers: {
      ...prevContext.headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

export const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
