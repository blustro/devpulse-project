# DevPulse - Phase 1: GraphQL Foundations

Welcome to Phase 1 of DevPulse! This project introduces core GraphQL concepts by building a lightweight task manager from scratch—featuring a Node.js / Apollo Server backend and a TypeScript React frontend connected via Apollo Client.

---

## 📂 Project Structure

```text
graphql-project/
├── backend/          # Node.js + Apollo Server
└── frontend/         # React + TypeScript + Vite (Apollo Client)
````

---

## 🛠️ Tech Stack

### Backend

- **Runtime:** Node.js (with ES Modules)
- **Server Engine:** Apollo Server v4 (`@apollo/server`)
- **Data Store:** In-memory JavaScript array (RAM)

### Frontend

- **Framework:** React + Vite
- **Language:** TypeScript
- **GraphQL Client:** Apollo Client (`@apollo/client`) with strict `TypedDocumentNode` type safety

---

## 🚀 How to Run the Project

Since this project has two independent parts (Backend and Frontend), you will run them in **two separate terminal windows**.

### Step 1: Run the Backend

1. Open terminal window #1 and navigate to the backend folder:
```bash
cd backend
```

2. Install dependencies (if you haven't already):
```bash
npm install
```

3. Start the server:
```bash
node index.js
```

4. Your server will run at `http://localhost:4000`. Open this URL in your browser to use the interactive Apollo Sandbox playground.

### Step 2: Run the Frontend

1. Open terminal window #2 and navigate to the frontend folder:
```bash
cd frontend
```

2. Install dependencies (if you haven't already):
```bash
npm install
```

3. Start the server:
```bash
 npm run dev
```

4. Open the local URL provided in your terminal (usually `http://localhost:5173`) to view the DevPulse UI dashboard.
