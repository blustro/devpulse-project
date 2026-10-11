import { gql, type TypedDocumentNode } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery } from '@apollo/client/react';
import { useState } from 'react';

// --- GraphQL Operations ---
const GET_MY_DATA: TypedDocumentNode<GetMeData> = gql`
  query GetMyData {
    me {
      id
      name
      tasks {
        id
        title
        status
      }
    }
  }
`;

const LOGIN_MUTATION: TypedDocumentNode<LoginData, LoginVariables> = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        name
      }
    }
  }
`;

const SIGNUP_MUTATION: TypedDocumentNode<SignupData, SignupVariables> = gql`
  mutation Signup($email: String!, $password: String!, $name: String!) {
    signup(email: $email, password: $password, name: $name) {
      token
      user {
        id
        name
      }
    }
  }
`;

// --- TypeScript Interfaces ---
// 1. Define types for your data structure
interface Task {
  id: string;
  title: string;
  status: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  tasks: Task[];
}

interface GetMeData {
  me: UserProfile;
}

interface AuthPayload {
  token: string;
  user: {
    id: string;
    name: string;
  };
}

interface LoginData {
  login: AuthPayload;
}

interface SignupData {
  signup: AuthPayload;
}

// --- Add Variable Interfaces ---
interface LoginVariables {
  email: string;
  password: string;
}

interface SignupVariables {
  email: string;
  password: string;
  name: string;
}

export default function App() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch logged-in user profile & tasks
  const { loading, error, data } = useQuery(GET_MY_DATA);
  const typedData = data as GetMeData | undefined;

  const [login, { loading: loginLoading }] = useMutation(LOGIN_MUTATION, {
    onCompleted: (res) => {
      // res.login.token is automatically inferred as string!
      localStorage.setItem('devpulse_token', res.login.token);
      window.location.reload();
    },
    onError: (err) => setErrorMessage(err.message),
  });

  const [signup, { loading: signupLoading }] = useMutation(SIGNUP_MUTATION, {
    onCompleted: (res) => {
      localStorage.setItem('devpulse_token', res.signup.token);
      window.location.reload();
    },
    onError: (err) => setErrorMessage(err.message),
  });

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (isLoginMode) {
      login({ variables: { email, password } });
    } else {
      signup({ variables: { email, password, name } });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('devpulse_token');
    window.location.reload();
  };

  // If loading user data initially
  if (loading) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center'>
        <p className='text-slate-500 animate-pulse'>Loading DevPulse...</p>
      </div>
    );
  }

  // If user is NOT logged-in (or token is missing/invalid), show Auth Screen
  if (error || !typedData?.me) {
    return (
      <div className='min-h-screen bg-slate-50 p-4 flex items-center justify-center'>
        <div className='max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-6'>
          <div className='text-center space-y-1'>
            <h1 className='text-3xl font-extrabold text-slate-900 tracking-tight'>
              DevPulse
            </h1>
            <p className='text-sm text-slate-500'>
              {isLoginMode
                ? 'Sign in to your workspace'
                : 'Create your account'}
            </p>
          </div>

          {errorMessage && (
            <div className='p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center'>
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className='space-y-4'>
            {!isLoginMode && (
              <div className='space-y-1'>
                <label className='text-xs font-semibold text-slate-600 uppercase'>
                  Full Name
                </label>
                <input
                  type='text'
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder='Jane Doe'
                  className='w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900'
                />
              </div>
            )}

            <div className='space-y-1'>
              <label className='text-xs font-semibold text-slate-600 uppercase'>
                Email Address
              </label>
              <input
                type='email'
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='you@example.com'
                className='w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900'
              />
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-semibold text-slate-600 uppercase'>
                Password
              </label>
              <input
                type='password'
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='••••••••'
                className='w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900'
              />
            </div>

            <Button
              type='submit'
              className='w-full mt-2'
              disabled={loginLoading || signupLoading}
            >
              {isLoginMode
                ? loginLoading
                  ? 'Signing in...'
                  : 'Sign In'
                : signupLoading
                  ? 'Creating account...'
                  : 'Create Account'}
            </Button>
          </form>

          <div className='text-center pt-2 border-t border-slate-100'>
            <button
              type='button'
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setErrorMessage('');
              }}
              className='text-xs text-slate-600 hover:text-slate-900 font-medium'
            >
              {isNeedAccountText(isLoginMode)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user IS logged in, show User-Scoped Dashboard
  return (
    <div className='min-h-screen bg-slate-50 p-8 flex flex-col items-center'>
      <div className='max-w-xl w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-6'>
        {/* Header & Logout */}
        <div className='flex justify-between items-center border-b border-slate-100 pb-4'>
          <div>
            <h1 className='text-2xl font-bold text-slate-900'>
              DevPulse Dashboard
            </h1>
            <p className='text-xs text-slate-500'>
              Welcome back, {typedData.me.name} ({typedData.me.email})
            </p>
          </div>
          <Button variant='outline' size='sm' onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* User-Scoped Tasks Section */}
        <div className='space-y-3'>
          <div className='flex justify-between items-center'>
            <h2 className='font-semibold text-slate-800 text-sm uppercase tracking-wider'>
              Your Assigned Tasks
            </h2>
            <span className='text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600'>
              {typedData.me.tasks.length} total
            </span>
          </div>

          {typedData.me.tasks.length === 0 ? (
            <div className='text-center py-10 border-2 border-dashed border-slate-200 rounded-xl space-y-2'>
              <p className='text-sm text-slate-500'>
                You don't have any tasks yet.
              </p>
              <p className='text-xs text-slate-400'>
                Create your first task to get started!
              </p>
            </div>
          ) : (
            <ul className='space-y-2 max-h-80 overflow-y-auto pr-1'>
              {typedData.me.tasks.map((task: Task) => (
                <li
                  key={task.id}
                  className='p-3 bg-white border border-slate-200 hover:border-slate-300 transition rounded-xl text-sm flex justify-between items-center shadow-xs'
                >
                  <span className='font-medium text-slate-700'>
                    {task.title}
                  </span>
                  <span className='font-mono text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200'>
                    {task.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button className='w-full'>Create New Task 🚀</Button>
      </div>
    </div>
  );
}

function isNeedAccountText(isLogin: boolean) {
  return isLogin
    ? "Don't have an account? Sign up"
    : 'Already have an account? Sign in';
}
