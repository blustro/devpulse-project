import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load the .env file from the root directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws'; // Bridges WebSockets with GraphQL protocol
import { makeExecutableSchema } from '@graphql-tools/schema'; // Compiles typeDefs & resolvers into an executable schema
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { PubSub } from 'graphql-subscriptions';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const pubsub = new PubSub(); // Initialize our global event publisher / subscriber
// Define an event constant name to avoid typos later
const TASK_MUTATED = 'TASK_MUTATED';

const typeDefs = `#graphql
  enum TaskStatus { TODO, IN_PROGRESS, DONE }
  enum TaskPriority { LOW, MEDIUM, HIGH }

  type User {
    id: ID!
    name: String!
    email: String!
    tasks: [Task!]!
  }

  type Task {
    id: ID!
    title: String!
    description: String
    status: TaskStatus!
    priority: TaskPriority!
    assignee: User
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    tasks: [Task!]!
    users: [User!]!
    me: User
  }

  type Mutation {
    signup(name: String!, email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    createTask(title: String!, description: String, priority: TaskPriority, assigneeId: ID): Task!
    updateTask(id: ID!, title: String, description: String, status: TaskStatus, priority: TaskPriority): Task!
    deleteTask(id: ID!): Task!
  }

  type Subscription {
    taskMutated: TaskPayload!
  }

  type TaskPayload {
    mutation: String! #e.g., 'CREATED', 'UPDATED', 'DELETED'
    task: Task!
  }
`;

const resolvers = {
  Query: {
    tasks: async () => {
      console.log('👉 [Backend Log] Fetching all tasks from PostgreSQL...');
      return await prisma.task.findMany();
    },
    users: async () => {
      console.log('👉 [Backend Log] Fetching all users from PostgreSQL...');
      return await prisma.user.findMany();
    },
    // Protected query to get the currently logged-in user
    me: async (_, __, { user }) => {
      // Return null quietly when logged out instead of throwing an error
      if (!user) return null;
      return await prisma.user.findUnique({ where: { id: user.userId } });
    },
  },

  Task: {
    // 💡 USING THE DATALOADER INSTEAD OF prisma.user.findUnique
    assignee: async (parent, _, { userLoader }) => {
      console.log('🔍 [Debug Task Parent Object]:', parent); // Let's see what fields are actually inside parent!

      if (!parent.assigneeId) {
        console.log(
          `⚠️ [Debug]: Task "${parent.title}" has NO assigneeId stored in the database.`,
        );
        return null;
      }

      // Instead of querying the DB directly, we ask our batch loader to queue this ID!
      console.log(
        `✅ [Debug]: Found assigneeId "${parent.assigneeId}". Loading via DataLoader...`,
      );
      return userLoader
        ? userLoader.load(parent.assigneeId)
        : prisma.user.findUnique({ where: { id: parent.assigneeId } });
    },
  },

  User: {
    tasks: async (parent) => {
      return await prisma.task.findMany({
        where: { assigneeId: parent.id },
      });
    },
  },

  Mutation: {
    signup: async (_, { name, email, password }) => {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { name, email, password: hashedPassword },
      });
      // 3. Generate a JWT token valid for 7 days
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: '7d',
      });

      return { token, user };
    },

    login: async (_, { email, password }) => {
      // FIXED: Wrap email in an object { email }
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) throw new Error('Invalid email or password');

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error('Invalid email or password');

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: '7d',
      });

      return { token, user };
    },

    createTask: async (_, args, { user }) => {
      console.log('👉 [Backend Log] Incoming createTask mutation args:', args);
      console.log('👉 [Backend Log] Current user from context:', user);

      // 🔒 Protect this mutation so only logged-in users can create tasks!
      if (!user) throw new Error('Auth required to create task');

      const taskData = {
        title: args.title,
        description: args.description || null,
        status: 'TODO',
        priority: args.priority || 'MEDIUM',
        assigneeId: args.assigneeId || user.userId,
      };

      const newTask = await prisma.task.create({
        data: taskData,
        include: { assignee: true },
      });

      // 📻 Broadcast CREATED event
      pubsub.publish(TASK_MUTATED, {
        taskMutated: {
          mutation: 'CREATED',
          task: newTask,
        },
      });

      return newTask;
    },

    updateTask: async (_, args, { user }) => {
      if (!user) throw new Error('Auth required');

      // Optional: Verify task ownership before updating
      const task = await prisma.task.findUnique({ where: { id: args.id } });
      if (!task) throw new Error('Task not found');
      if (task.assigneeId !== user.userId)
        throw new Error('Not authorized to update this task');

      const updatedTask = await prisma.task.update({
        where: { id: args.id },
        data: {
          ...(args.title !== undefined && { title: args.title }),
          ...(args.description !== undefined && {
            description: args.description,
          }),
          ...(args.status !== undefined && { status: args.status }),
          ...(args.priority !== undefined && { priority: args.priority }),
        },
        include: { assignee: true },
      });

      // 📻 BROADCAST UPDATED EVENT!
      pubsub.publish(TASK_MUTATED, {
        taskMutated: {
          mutation: 'UPDATED',
          task: updatedTask,
        },
      });

      return updatedTask;
    },

    deleteTask: async (_, { id }, { user }) => {
      console.log('👉 [Backend Log] Incoming deleteTask mutation for ID:', id);
      if (!user) throw new Error('Auth required to delete task.');

      // Optional security check: Ensure the task belongs to the logged-in user
      const task = await prisma.task.findUnique({ where: { id } });
      if (!task) throw new Error('Task not found.');
      if (task.assigneeId !== user.userId) {
        throw new Error('Not authorized to delete this task.');
      }

      const deletedTask = await prisma.task.delete({
        where: { id },
        include: { assignee: true },
      });

      // 📻 Broadcast DELETED event
      pubsub.publish(TASK_MUTATED, {
        taskMutated: {
          mutation: 'DELETED',
          task: deletedTask,
        },
      });

      return deletedTask;
    },
  },
  // 🚀 NEW: Subscription Resolvers
  Subscription: {
    taskMutated: {
      subscribe: () => pubsub.asyncIterator([TASK_MUTATED]),
    },
  },
};

// --- SERVER INITIALIZATION (HTTP + WebSockets) ---
const app = express();
const httpServer = createServer(app);

// 1. Create a unified executable GraphQL schema
const schema = makeExecutableSchema({ typeDefs, resolvers });

// 2. Set up the WebSocket Server on a specific path (/graphql)
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

// 3. Register the graphql-ws server handler
const serverCleanup = useServer({ schema }, wsServer);

// 4. Initialize Apollo Server with plugin hooks for graceful shutdown
const server = new ApolloServer({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }), // Drain HTTP on exit
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose(); // Drain WebSocket connections on exit
          },
        };
      },
    },
  ],
});

await server.start();

// Apply standard Express middleware for HTTP queries & mutations
app.use(
  '/graphql',
  cors(),
  express.json(),
  expressMiddleware(server, {
    context: async ({ req }) => {
      // Extract JWT token from headers for authentication
      const token = req.headers.authorization || '';
      try {
        const user = jwt.verify(
          token.replace('Bearer ', ''),
          process.env.JWT_SECRET,
        );
        return { user };
      } catch (e) {
        return { user: null };
      }
    },
  }),
);

// Start listening using the wrapped HTTP server (handles BOTH HTTP and WS!)
const PORT = 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 HTTP Server ready at http://localhost:${PORT}/graphql`);
  console.log(
    `🔌 WebSocket Subscriptions ready at ws://localhost:${PORT}/graphql`,
  );
});
