import { gql, type TypedDocumentNode } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery, useSubscription } from '@apollo/client/react';
import { useState, type SyntheticEvent } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog';
import { Edit3, Trash2, PlusCircle, LogOut } from 'lucide-react';
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

const TASK_CREATED_SUBSCRIPTION = gql`
  subscription OnTaskCreated {
    taskCreated {
      id
      title
      description
      status
      priority
      userId
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
  mutation CreateNewTask(
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
  mutation UpdateExistingTask(
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

  // Query hook
  const { loading, error, data } = useQuery(GET_MY_DATA);
  const typedData = data as GetMeData | undefined;

  console.log('🔄 Dashboard component rendered, mounting subscription...');

  // Subscription hook (Guarded so it only fires when authenticated!)
  useSubscription(TASK_CREATED_SUBSCRIPTION, {
    skip: !typedData?.me, // 👈 CRITICAL: Prevents firing until user data is loaded & authenticated
    onData: ({ client, data: subData }) => {
      console.log('⚡ Subscription onData fired!', subData);
      const newTask = (subData.data as any)?.taskCreated;
      if (!newTask) return;

      client.cache.updateQuery({ query: GET_MY_DATA }, (existingData: any) => {
        if (!existingData?.me) return existingData;
        return {
          ...existingData,
          me: {
            ...existingData.me,
            tasks: [newTask, ...(existingData.me.tasks || [])],
          },
        };
      });
    },
    onError: (err) => {
      console.error('⚠️ Subscription Error:', err);
    },
  });

  const [login, { loading: loginLoading }] = useMutation(LOGIN_MUTATION, {
    onCompleted: (res) => {
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

  const [createTask] = useMutation(CREATE_TASK_MUTATION, {
    refetchQueries: [{ query: GET_MY_DATA }],
    onCompleted: () => {
      setTaskTitle('');
      setTaskDescription('');
      setTaskPriority('MEDIUM');
      setTaskError('');
      setIsCreateModalOpen(false);
    },
    onError: (err) => setTaskError(err.message),
  });

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

  // Event Handlers
  const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (isLoginMode) {
      login({ variables: { email, password } });
    } else {
      signup({ variables: { email, password, name } });
    }
  };

  const handleCreateTaskSubmit = (e: SyntheticEvent) => {
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

  // Conditional Renders
  if (loading) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center'>
        <p className='text-slate-500 animate-pulse font-medium'>
          Loading DevPulse...
        </p>
      </div>
    );
  }

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
                <Input
                  type='text'
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder='Jane Doe'
                />
              </div>
            )}

            <div className='space-y-1'>
              <label className='text-xs font-semibold text-slate-600 uppercase'>
                Email Address
              </label>
              <Input
                type='email'
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='you@example.com'
              />
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-semibold text-slate-600 uppercase'>
                Password
              </label>
              <Input
                type='password'
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='••••••••'
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
            <Button
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setErrorMessage('');
              }}
              className='text-xs text-slate-600 hover:text-slate-900 font-medium'
            >
              {isLoginMode
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const user = typedData.me;

  return (
    <div className='min-h-screen bg-slate-50 text-slate-900'>
      <div className='max-w-4xl mx-auto p-6 space-y-6'>
        {/* Header */}
        <header className='flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>
              DevPulse Dashboard
            </h1>
            <p className='text-sm text-slate-500'>
              Welcome back, {user.name} ({user.email})
            </p>
          </div>
          <div className='flex items-center gap-3'>
            {/* Create Task Dialog (Rendered without asChild) */}
            <Dialog
              open={isCreateModalOpen}
              onOpenChange={setIsCreateModalOpen}
            >
              <DialogTrigger
                render={
                  <Button className='gap-2'>
                    <PlusCircle className='w-4 h-4' /> New Task
                  </Button>
                }
              ></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                {taskError && (
                  <div className='p-2 bg-red-50 text-red-600 text-xs rounded'>
                    {taskError}
                  </div>
                )}
                <form
                  onSubmit={handleCreateTaskSubmit}
                  className='space-y-4 mt-2'
                >
                  <div>
                    <label className='text-xs font-semibold uppercase text-slate-600'>
                      Title
                    </label>
                    <Input
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder='Task title...'
                      required
                    />
                  </div>
                  <div>
                    <label className='text-xs font-semibold uppercase text-slate-600'>
                      Description
                    </label>
                    <Input
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      placeholder='Optional details...'
                    />
                  </div>
                  <div>
                    <label className='text-xs font-semibold uppercase text-slate-600'>
                      Priority
                    </label>
                    <Select
                      value={taskPriority}
                      onValueChange={(val) =>
                        setTaskPriority(val as TaskPriority)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='LOW'>Low</SelectItem>
                        <SelectItem value='MEDIUM'>Medium</SelectItem>
                        <SelectItem value='HIGH'>High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type='submit' className='w-full'>
                    Create Task
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Button
              variant='outline'
              onClick={handleLogout}
              className='gap-2 text-red-600 hover:text-red-700'
            >
              <LogOut className='w-4 h-4' /> Logout
            </Button>
          </div>
        </header>

        {/* Tasks List */}
        <section className='bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4'>
          <h2 className='text-lg font-semibold'>Your Assigned Tasks</h2>
          {user.tasks.length === 0 ? (
            <p className='text-slate-400 text-sm py-8 text-center'>
              No tasks found. Create one above to test real-time WebSocket
              updates!
            </p>
          ) : (
            <div className='grid gap-3'>
              {user.tasks.map((task) => (
                <div
                  key={task.id}
                  className='p-4 border border-slate-100 rounded-xl bg-slate-50/50 flex justify-between items-center transition hover:shadow-sm'
                >
                  <div className='space-y-1'>
                    <div className='flex items-center gap-2'>
                      <h3 className='font-semibold text-slate-800'>
                        {task.title}
                      </h3>
                      <span className='text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700 uppercase'>
                        {task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className='text-xs text-slate-500'>
                        {task.description}
                      </p>
                    )}
                  </div>

                  <div className='flex items-center gap-3'>
                    <Select
                      value={task.status}
                      onValueChange={(val) =>
                        handleStatusChange(task.id, val as TaskStatus)
                      }
                    >
                      <SelectTrigger className='w-32.5 h-8 text-xs font-medium'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='TODO'>To Do</SelectItem>
                        <SelectItem value='IN_PROGRESS'>In Progress</SelectItem>
                        <SelectItem value='DONE'>Done</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => handleOpenEditModal(task)}
                      className='h-8 w-8 text-slate-500 hover:text-slate-800'
                    >
                      <Edit3 className='w-4 h-4' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => handleDeleteTask(task.id)}
                      className='h-8 w-8 text-red-400 hover:text-red-600'
                    >
                      <Trash2 className='w-4 h-4' />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Edit Task Dialog */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditTaskSubmit} className='space-y-4 mt-2'>
              <div>
                <label className='text-xs font-semibold uppercase text-slate-600'>
                  Title
                </label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className='text-xs font-semibold uppercase text-slate-600'>
                  Description
                </label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
              <div>
                <label className='text-xs font-semibold uppercase text-slate-600'>
                  Priority
                </label>
                <Select
                  value={editPriority}
                  onValueChange={(val) => setEditPriority(val as TaskPriority)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='LOW'>Low</SelectItem>
                    <SelectItem value='MEDIUM'>Medium</SelectItem>
                    <SelectItem value='HIGH'>High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type='submit' className='w-full'>
                Save Changes
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
