// Import React tools to manage local screen states (like loading spinners or list inputs)
import { useState } from 'react';

// Import Apollo Client tools to connect to our GraphQL backend
import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  gql,
  type TypedDocumentNode,
} from '@apollo/client';
import { ApolloProvider, useMutation, useQuery } from '@apollo/client/react';

// ==========================================
// 1. TYPES & INTERFACES (TypeScript Contracts)
// ==========================================
// We define strict blueprints for what a Task looks like so TypeScript can check our spelling and properties.
interface Task {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'; // Literal union type matching our backend Enum!
}

// Define the shape of the data returned by our GET_TASKS query
interface GetTasksData {
  tasks: Task[];
}

// Define the shape of variables and response for the CREATE_TASK mutation
interface CreateTaskVariables {
  title: string;
}

interface CreateTaskData {
  createTask: Task;
}

// ==========================================
// 2. SETUP APOLLO CLIENT (The Waiter)
// ==========================================
// This tells Apollo Client where our backend restaurant kitchen is located (http://localhost:4000).
// InMemoryCache is a smart local storage box that remembers data so the app doesn't have to keep re-downloading it.
const client = new ApolloClient({
  link: new HttpLink({ uri: 'http://localhost:4000/' }),
  cache: new InMemoryCache(),
});

// ==========================================
// 3. WRITE GRAPHQL QUERIES & MUTATIONS
// ==========================================
// 'gql' is a helper tag that lets us write raw GraphQL syntax inside JavaScript.

// Query to fetch all tasks from the backend
const GET_TASKS: TypedDocumentNode<GetTasksData, Record<string, never>> = gql`
  query GetTasks {
    tasks {
      id
      title
      status
    }
  }
`;

// Mutation to create a new task on the backend
const CREATE_TASK: TypedDocumentNode<CreateTaskData, CreateTaskVariables> = gql`
  mutation CreateTask($title: String!) {
    createTask(title: $title) {
      id
      title
      status
    }
  }
`;

// ==========================================
// 4. THE UI COMPONENTS
// ==========================================

function TaskDashboard() {
  // Local state to keep track of what the user types in the input box
  const [taskTitle, setTaskTitle] = useState<string>('');

  // 🛠️ HOOK 1: useQuery
  // Apollo Client automatically fetches tasks from the backend as soon as this component loads on screen!
  // It gives us back 'loading' (true/false), 'error' (if server is down), and 'data' (our tasks list).
  const { loading, error, data } = useQuery(GET_TASKS);

  // 🛠️ HOOK 2: useMutation
  // This hook gives us a trigger function ('createTask') to send data to the backend,
  // plus a 'refetchQueries' instruction so the task list automatically updates on screen after creating one!
  const [createTask, { loading: creating }] = useMutation(CREATE_TASK, {
    refetchQueries: [{ query: GET_TASKS }],
  });

  // Handle form submission when user clicks "Add Task"
  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    console.log(
      '👉 [Frontend Log] Sending mutation to backend with title:',
      taskTitle,
    );

    // Call the mutation function with variables
    createTask({ variables: { title: taskTitle } });

    // Clear the input box
    setTaskTitle('');
  };

  // If the server is still answering, show a simple loading message
  if (loading)
    return (
      <p style={{ padding: '20px', fontSize: '18px' }}>
        Loading tasks from backend kitchen...
      </p>
    );

  // If the backend is turned off or broken, show an error message
  if (error)
    return (
      <p style={{ padding: '20px', color: 'red' }}>
        Oops! Could not connect to backend: {error.message}
      </p>
    );

  return (
    <div
      style={{
        fontFamily: 'sans-serif',
        maxWidth: '600px',
        margin: '40px auto',
        padding: '20px',
        border: '1px solid #ccc',
        borderRadius: '8px',
      }}
    >
      <h2>✨ DevPulse Task Dashboard (Phase 1)</h2>
      <p style={{ color: '#666' }}>
        This frontend is communicating live with your Node.js GraphQL backend
        via Apollo Client.
      </p>

      {/* Form to create a new task */}
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}
      >
        <input
          type='text'
          placeholder='Enter a new task...'
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          style={{ flex: 1, padding: '8px', fontSize: '16px' }}
        />
        <button
          type='submit'
          disabled={creating}
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          {creating ? 'Adding...' : 'Add Task'}
        </button>
      </form>

      {/* List of tasks fetched from GraphQL */}
      <h3>Current Tasks:</h3>
      <ul style={{ paddingLeft: '20px' }}>
        {data?.tasks.map((task) => (
          <li key={task.id} style={{ marginBottom: '8px' }}>
            <strong>{task.title}</strong> —{' '}
            <span
              style={{ color: task.status === 'DONE' ? 'green' : 'orange' }}
            >
              [{task.status}]
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ==========================================
// 4. MAIN APP WRAPPER
// ==========================================
// The ApolloProvider wraps our entire app so every child component has access to the Apollo Client "waiter".
export default function App() {
  return (
    <ApolloProvider client={client}>
      <TaskDashboard />
    </ApolloProvider>
  );
}
