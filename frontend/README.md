# DevPulse ⚡

DevPulse is a full-stack, production-grade project management tool designed to give engineering teams a fast, intuitive workspace for task tracking, prioritization, and real-time collaboration.

---

## 🛠️ Tech Stack

### **Frontend**

- **React 19** – UI library
- **Apollo Client** – GraphQL data fetching and local cache management
- **Tailwind CSS** – Utility-first styling
- **shadcn/ui & Radix UI** – Accessible component primitives
- **Lucide React** – Clean vector icons

### **Backend**

- **Node.js & Apollo Server** – GraphQL API server
- **PostgreSQL** – Relational database
- **Prisma ORM** – Type-safe database client and migrations
- **JSON Web Tokens (JWT)** – Secure user authentication and session management
- **Dataloader** – Batching and caching for efficient database relations

---

## ✨ Features & Milestones Completed

### **Phase 1 & 2: Architecture & Authentication**

- Secure user signup and login flow with hashed passwords (`bcrypt`) and JWT session validation.
- Database relations connecting users directly to their assigned tasks for strict data isolation.
- Optimized database queries using DataLoader to prevent N+1 performance bottlenecks.

### **Phase 3: Enhanced CRUD & Polish (`phase-3-edit-mode`)**

- **Comprehensive Task Management:** Create, read, update, and delete user-scoped tasks seamlessly.
- **Rich Task Metadata:** Tasks now support multi-line **Descriptions** and distinct **Priorities** (`LOW`, `MEDIUM`, `HIGH`).
- **Advanced Modals & Controls:** Integrated custom shadcn Dialog modals for both task creation and editing, alongside clean dropdown selectors for status and priority changes.
- **Unified Mutations:** Flexible backend `updateTask` mutation handling partial updates across multiple fields simultaneously.

---

## 🚀 Getting Started

### **1. Clone the Repository**

```bash
git clone <your-repository-url>
cd graphql-project
```

### **2. Environment Setup**

Create a `.env` file in your root directory and configure your PostgreSQL connection string and JWT secret:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/devpulse?schema=public"
JWT_SECRET="your_super_secret_jwt_key"
```

### **3. Database Migration & Generation**

Run Prisma commands to push your schema to PostgreSQL and generate the client:

```bash
npx prisma db push
npx prisma generate
```

### **4. Run the Application**

Start your backend server and React development client:

```bash
# Start backend
node backend/index.js

# Start frontend (in a separate terminal)
npm run dev
```

---

## 🗺️ Roadmap

- **Phase 4:** Real-time task tracking with GraphQL Subscriptions and user presence indicators.
- **Phase 5:** Kanban board column views and team workspace invitations.
