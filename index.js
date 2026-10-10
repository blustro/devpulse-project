// ==========================================
// IMPORTING TOOLS
// ==========================================

// Import the ApolloServer class from the '@apollo/server' package.
// Think of ApolloServer as the restaurant manager who coordinates incoming customer orders.
import { ApolloServer } from '@apollo/server';

// Import the standalone server status function.
// This creates a bult-in web server instantly so we don't need complex extra software like Express yet.
import { startStandaloneServer } from '@apollo/server/standalone';

// ==========================================
// 1. THE SCHEMA (The Restaurant Menu)
// ==========================================
// This is a strict contract or blueprint defining what data exists and what questions you are allowed to ask.
// Just like a menu, you can only order what is written here. If it's not on the menu, the server refuses it!
const typeDefs = `#graphql

# An "enum" is a list of fixed choices. Think of a task status like a traffic light:
# It can only be TODO, IN_PROGRESS, or DONE. No other random words are allowed!
enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

# This describes what a single "Task" object looks like in our app.
type Task {
  id: ID!             # "ID" means a unique identifier (like a passport number).
                      # The exclamation mark "!" means this field can NEVER be empty/null.
  title: String!      # The text description of the task. Must be text, cannot be empty.
  status: TaskStatus! # The current status, which must match one of our choices in the enum above.
}

# The "Query" type defines what data you can *read* or fetch from the server.
type Query {
  # Asking for 'tasks' will give you a list ([...]) of Task items.
  # The inner exclamation mark means tasks inside cannot be null,
  # and the outer one means the list itself won't be null.
  tasks: [Task!]! 
}

# The "Mutation" type defines what data you can *change* (create, update, or delete).
type Mutation {
  # To create a task, you must send a 'title'.
  # The server will create it in memory and give you back the newly created Task object.
  createTask(title: String!): Task!
}
`;

// ==========================================
// 2. THE DATABASE (Temporary In-Memory List)
// ==========================================
// To keep things 100% free and simple without installing a heavy database yet,
// we will store our tasks in a simple JavaScript list (array) right here in your computer's RAM.
let tasks = [
  { id: '1', title: 'Learn GraphQL Basics', status: 'IN_PROGRESS' },
  { id: '2', title: 'Build DevPulse Phase 1', status: 'TODO' },
];

// ==========================================
// 3. THE RESOLVERS (The Kitchen Staff)
// ==========================================
// Resolvers are functions that actually fetch, calculate, or modify the data when a client asks for it.
// Every single field on your schema menu can have a resolver function.
const resolvers = {
  // Resolvers for reading data (Queries)
  Query: {
    // When someone asks for 'tasks' on the menu, this exact function runs behind the scenes.
    tasks: (parent, args, context, info) => {
      // 🛠️ DEBUG LOG: This will print in your black terminal window every time someone fetches tasks!
      console.log(
        '👉 [Backend Log] Someone asked for all tasks! Fetching from our memory array...',
      );

      //We return our raw JavaScript list of tasks back to Apollo Server.
      return tasks;
    },
  },

  // Resolvers for writing/modifying data (Mutations)
  Mutation: {
    // When someone wants to create a task, this function runs.
    // 'args' contains the data the user passed in (like the task title).
    createTask: (parent, args, context, info) => {
      // 🛠️ DEBUG LOG: Let's see what title the user sent us
      console.log(
        '👉 [Backend Log] Someone wants to create a task with title:',
      );

      // Create a brand new task object JavaScript dictionary
      const newTask = {
        // Generate a simple unique UI based on how many tasks we have plus 1
        id: String(tasks.length + 1),
        title: args.title,
        status: 'TODO', // New tasks always start as TODO by default
      };

      // Add this new task into our list array stored in memory
      tasks.push(newTask);

      // 🛠️ DEBUG LOG: Show confirmation in the terminal
      console.log(
        '👉 [Backend Log] Task created successfully! Total tasks now:',
        tasks.length,
      );

      // Return the newly created task object back to the client interface
      return newTask;
    },
  },
};

// ==========================================
// 4. STARTING THE SERVER
// ==========================================

// We combine our Menu (typeDefs) and Kitchen Staff (resolvers) into the ApolloServer manager.
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// We turn on the web server on a local free port (port 4000) using standalone server.
const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

// Print a nice success message to your terminal
console.log(`🚀 Yay! Your GraphQL server is ready and running at: ${url}`);
