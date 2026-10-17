# DevPulse - Phase 2: Frontend Integration & Authentication

This phase bridges our verified PostgreSQL/Prisma/GraphQL backend with a modern, type-safe React frontend.

## 🚀 Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **State & Data Fetching**: Apollo Client (GraphQL)
- **Security**: JWT-based authentication with automated `localStorage` injection

## 🛠️ Key Technical Challenges Solved

1. **Authenticated Requests**: Configured Apollo Client's `SetContextLink` to dynamically intercept requests and attach the `Authorization: Bearer <token>` header from `localStorage`.
2. **User Data Isolation**: Migrated from a global task query to a nested `me { tasks }` query to ensure strict multi-tenant data privacy (users only see their own tasks).
3. **Strict TypeScript & Linting**: Eliminated all `any` types and modern deprecations (`baseUrl`, legacy hook signatures) to maintain a pristine, production-grade build.

## 🏃‍♂️ Running Locally

1. Ensure your backend server is running on port 4000.
2. Run `npm run dev` in the frontend directory.
3. Sign up for an account to test the authenticated dashboard flow!
