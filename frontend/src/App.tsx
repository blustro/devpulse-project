import { gql, type TypedDocumentNode } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery } from '@apollo/client/react';
import { useState } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog';
import { Trash2 } from 'lucide-react';

// --- Types ---
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

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

const CREATE_TASK_MUTATION: TypedDocumentNode<
  CreateTaskData,
  CreateTaskVariables
> = gql`
  mutation createTask($title: String!) {
    createTask(title: $title) {
      id
      title
      status
    }
  }
`;

const UPDATE_TASK_STATUS_MUTATION: TypedDocumentNode<
  UpdateTaskStatusData,
  UpdateTaskStatusVariables
> = gql`
  mutation UpdateTaskStatus($id: ID!, $status: TaskStatus!) {
    updateTaskStatus(id: $id, status: $status) {
      id
      title
      status
    }
  }
`;

const DELETE_TASK_MUTATION: TypedDocumentNode<
  DeleteTaskData,
  DeleteTaskVariables
> = gql`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id) {
      id
    }
  }
`;

// --- TypeScript Interfaces ---
interface Task {
  id: string;
  title: string;
  status: TaskStatus;
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

interface CreateTaskData {
  createTask: Task;
}

interface UpdateTaskStatusData {
  updateTaskStatus: Task;
}

interface DeleteTaskData {
  deleteTask: Task;
}

// --- Variable Interfaces ---
interface LoginVariables {
  email: string;
  password: string;
}

interface SignupVariables {
  email: string;
  password: string;
  name: string;
}

interface CreateTaskVariables {
  title: string;
}

interface UpdateTaskStatusVariables {
  id: string;
  status: TaskStatus;
}

interface DeleteTaskVariables {
  id: string;
}

export default function App() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Create Task state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskError, setTaskError] = useState('');

  // Queries & mutations
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

  const [createTask, { loading: creatingTask }] = useMutation(
    CREATE_TASK_MUTATION,
    {
      refetchQueries: [{ query: GET_MY_DATA }],
      onCompleted: () => {
        setTaskTitle('');
        setTaskError('');
        setIsModalOpen(false);
      },
      onError: (err) => setTaskError(err.message),
    },
  );

  const [updateTaskStatus] = useMutation(UPDATE_TASK_STATUS_MUTATION, {
    refetchQueries: [{ query: GET_MY_DATA }],
  });

  const [deleteTask] = useMutation(DELETE_TASK_MUTATION, {
    refetchQueries: [{ query: GET_MY_DATA }],
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

  const handleCreateTaskSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    createTask({ variables: { title: taskTitle } });
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    updateTaskStatus({
      variables: { id: taskId, status: newStatus },
    });
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask({
      variables: { id: taskId },
    });
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

                  {/* Status Dropdown Selector */}
                  <select
                    value={task.status}
                    onChange={(e) =>
                      handleStatusChange(task.id, e.target.value as TaskStatus)
                    }
                    className='text-xs font-mono bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer'
                  >
                    <option value='TODO'>TODO</option>
                    <option value='IN_PROGRESS'>IN_PROGRESS</option>
                    <option value='DONE'>DONE</option>
                  </select>

                  {/* Delete Task Button */}
                  <Button
                    type='button'
                    onClick={() => handleDeleteTask(task.id)}
                    className='cursor-pointer p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition'
                    title='Delete Task'
                  >
                    <Trash2 className='w-4 h-4' />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Create Task Modal dialog */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger
            render={<Button className='w-full'>Create New Task 🚀</Button>}
          />

          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>

            {taskError && (
              <div className='p-2 bg-red-50 text-red-600 text-xs rounded border border-red-200'>
                {taskError}
              </div>
            )}

            <form onSubmit={handleCreateTaskSubmit} className='space-y-4 pt-2'>
              <div className='space-y-1'>
                <label className='text-xs font-semibold text-slate-600 uppercase'>
                  Task Title
                </label>

                <input
                  type='text'
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder='e.g., Fix navigation bug'
                  className='w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900'
                />
              </div>

              <div className='flex justify-end space-x-2 pt-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>

                <Button type='submit' disabled={creatingTask}>
                  {creatingTask ? 'Creating...' : 'Save Task'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function isNeedAccountText(isLogin: boolean) {
  return isLogin
    ? "Don't have an account? Sign up"
    : 'Already have an account? Sign in';
}
