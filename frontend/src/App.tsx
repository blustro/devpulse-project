import { gql, type TypedDocumentNode } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery } from '@apollo/client/react';
import { useState, type SyntheticEvent } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog';
import { Edit3, Trash2 } from 'lucide-react';
import { Input } from './components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';

// --- Types ---
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

// --- GraphQL Operations ---
const GET_MY_DATA: TypedDocumentNode<GetMeData> = gql`
  query GetMyData {
    me {
      id
      name
      email
      tasks {
        id
        title
        description
        status
        priority
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
  mutation createTask(
    $title: String!
    $description: String
    $priority: TaskPriority
  ) {
    createTask(title: $title, description: $description, priority: $priority) {
      id
      title
      description
      status
      priority
    }
  }
`;

const UPDATE_TASK_MUTATION: TypedDocumentNode<
  UpdateTaskData,
  UpdateTaskVariables
> = gql`
  mutation updateTask(
    $id: ID!
    $title: String
    $description: String
    $status: TaskStatus
    $priority: TaskPriority
  ) {
    updateTask(
      id: $id
      title: $title
      description: $description
      status: $status
      priority: $priority
    ) {
      id
      title
      description
      status
      priority
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
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
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

interface UpdateTaskData {
  updateTask: Task;
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
  description?: string;
  priority?: TaskPriority;
}

interface UpdateTaskVariables {
  id: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('MEDIUM');
  const [taskError, setTaskError] = useState('');

  // Edit Task state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('MEDIUM');

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
        setTaskDescription('');
        setTaskPriority('MEDIUM');
        setTaskError('');
        setIsCreateModalOpen(false);
      },
      onError: (err) => setTaskError(err.message),
    },
  );

  const [updateTask] = useMutation(UPDATE_TASK_MUTATION, {
    refetchQueries: [{ query: GET_MY_DATA }],
    onCompleted: () => {
      setIsEditModalOpen(false);
      setEditingTaskId(null);
    },
  });

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
    createTask({
      variables: {
        title: taskTitle,
        description: taskDescription || undefined,
        priority: taskPriority,
      },
    });
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditPriority(task.priority);
    setIsEditModalOpen(true);
  };

  const handleEditTaskSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    if (!editingTaskId || !editTitle.trim()) return;
    updateTask({
      variables: {
        id: editingTaskId,
        title: editTitle,
        description: editDescription,
        priority: editPriority,
      },
    });
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
                  className='p-4 bg-white border border-slate-200 hover:border-slate-300 transition rounded-xl flex justify-between items-start shadow-xs space-x-3'
                >
                  <div className='space-y-1 flex-1 min-w-0'>
                    <div className='flex items-center space-x-2'>
                      <span className='font-semibold text-slate-800 text-sm truncate'>
                        {task.title}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
                          task.priority === 'HIGH'
                            ? 'bg-red-100 text-red-700'
                            : task.priority === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className='text-xs text-slate-500 line-clamp-2'>
                        {task.description}
                      </p>
                    )}
                  </div>

                  <div className='flex items-center space-x-2 shrink-0'>
                    {/* Status Dropdown Selector */}
                    <Select
                      value={task.status}
                      onValueChange={(value) =>
                        handleStatusChange(task.id, value as TaskStatus)
                      }
                    >
                      <SelectTrigger className='h-8 w-32 text-xs font-mono bg-slate-50'>
                        <SelectValue placeholder='Select status' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='TODO'>TODO</SelectItem>
                        <SelectItem value='IN_PROGRESS'>IN_PROGRESS</SelectItem>
                        <SelectItem value='DONE'>DONE</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Edit Button */}
                    <Button
                      onClick={() => handleOpenEditModal(task)}
                      className='p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition'
                      title='Edit Task'
                    >
                      <Edit3 className='w-4 h-4' />
                    </Button>

                    {/* Delete Task Button */}
                    <Button
                      onClick={() => handleDeleteTask(task.id)}
                      className='p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition'
                      title='Delete Task'
                    >
                      <Trash2 className='w-4 h-4' />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Create Task Modal dialog */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
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

                <Input
                  type='text'
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder='e.g., Fix navigation bug'
                  className='w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900'
                />
              </div>

              <div className='space-y-1'>
                <label className='text-xs font-semibold text-slate-600 uppercase'>
                  Priority
                </label>

                <Select
                  value={taskPriority}
                  onValueChange={(value) =>
                    setTaskPriority(value as TaskPriority)
                  }
                >
                  <SelectTrigger className='h-8 w-28 text-xs font-mono'>
                    <SelectValue placeholder='Priority' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='LOW'>LOW</SelectItem>
                    <SelectItem value='MEDIUM'>MEDIUM</SelectItem>
                    <SelectItem value='HIGH'>HIGH</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='flex justify-end space-x-2 pt-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setIsCreateModalOpen(false)}
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

        {/* Edit Task Modal Dialog */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleEditTaskSubmit} className='space-y-4 pt-2'>
              <div className='space-y-1'>
                <label className='text-xs font-semibold text-slate-600 uppercase'>
                  Task Title
                </label>
                <input
                  type='text'
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className='w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900'
                />
              </div>

              <div className='space-y-1'>
                <label className='text-xs font-semibold text-slate-600 uppercase'>
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className='w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none'
                />
              </div>

              <div className='space-y-1'>
                <label className='text-xs font-semibold text-slate-600 uppercase'>
                  Priority
                </label>
                <select
                  value={editPriority}
                  onChange={(e) =>
                    setEditPriority(e.target.value as TaskPriority)
                  }
                  className='w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white'
                >
                  <option value='LOW'>LOW</option>
                  <option value='MEDIUM'>MEDIUM</option>
                  <option value='HIGH'>HIGH</option>
                </select>
              </div>

              <div className='flex justify-end space-x-2 pt-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type='submit'>Update Task</Button>
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
