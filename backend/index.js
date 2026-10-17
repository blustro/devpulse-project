import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';
import bcrypt from 'bcrypt';
import DataLoader from 'dataloader';
import 'dotenv/config';
import jwt from 'jsonwebtoken';
const { PrismaClient } = pkg;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ==========================================
// 🧠 1. CREATE THE USER DATALOADER
// ==========================================
// This function batches multiple user ID requests into a single database query.
const createLoader = () => ({
  userLoader: new DataLoader(async (userIds) => {
    console.log(
      `🚀 [DataLoader Batch Log] Batching ${userIds.length} user IDs into ONE single SQL query!`,
      userIds,
    );

    // Fetch all users whose IDs match the requested list in one single query
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
    });

    // DataLoader requires the returned array to match the exact order of the requested userIds
    const userMap = new Map(users.map((user) => [user.id, user]));
    return userIds.map((id) => userMap.get(id) || null);
  }),
});

const typeDefs = `
  enum TaskStatus {
    TODO
    IN_PROGRESS
    DONE
  }

  type User {
    id: ID!
    name: String!
    email: String!
    tasks: [Task!]!
  }

  type Task {
    id: ID!
    title: String!
    status: TaskStatus!
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
    createTask(title: String!, assigneeId: ID): Task!
    updateTaskStatus(id: ID!, status: TaskStatus!): Task!
    deleteTask(id: ID!): Task!
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
      if (!user) throw new Error('Not authenticated');
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
      return userLoader.load(parent.assigneeId);
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
      // 1. Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // 2. Create the user in PostgreSQL
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
      // 1. Find user by email
      const user = await prisma.user.findUnique({ where: email });
      if (!user) throw new Error('Invalid email or password');

      // 2. Verify password
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error('Invalid email or password');

      // 3. Generate JWT token
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
        status: 'TODO',
        assignee: {
          connect: { id: args.assigneeId || user.userId },
        },
      };

      if (args.assigneeId) {
        taskData.assignee = { connect: { id: args.assigneeId } };
      }

      return prisma.task.update
        ? await prisma.task.create({ data: taskData })
        : null;
    },

    updateTaskStatus: async (_, args, { user }) => {
      if (!user) throw new Error('Auth required');
      return await prisma.task.update({
        where: { id: args.id },
        data: { status: args.status },
      });
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

      return await prisma.task.delete({ where: { id } });
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

// ==========================================
// 🔌 2. PASS DATALOADER INTO CONTEXT PER REQUEST
// ==========================================
const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => {
    // 1. Extract the Authorization header
    const authHeader = req.headers.authorization || '';
    console.log('🔍 [Auth Debug] Received Authorization Header:', authHeader);

    let user = null;

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      try {
        // 2. Verify and decode the JWT token
        user = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ [Auth Debug] Successfully decoded user:', user);
      } catch (err) {
        console.log(
          '❌ [Auth Debug] JWT verification failed with error:',
          err.message,
        );
      }
    } else {
      console.log('⚠️ [Auth Debug] Header did not start with "Bearer "');
    }

    return {
      ...createLoader(),
      user, // Pass the decode user info every resolver context!
    };
  },
});

console.log(`🚀 DevPulse Phase 2 Optimized Backend running at: ${url}`);
