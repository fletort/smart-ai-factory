# System Architecture & Technical Constitution

## 1. Global Context & Architecture

- **Project Vision**: [Short description of the application, e.g., B2B SaaS platform for invoice
  management]
- **Target Architecture**: [e.g., Monolith, Microservices, Serverless Functions]
- **Deployment & Environment Constraints**: [e.g., Vercel, AWS Docker, Node 22 LTS, PostgreSQL]

## 2. Technical Stack & Dependencies

| Layer          | Technology/Library          | Version      | Specific Guidelines / Constraints                    |
| :------------- | :-------------------------- | :----------- | :--------------------------------------------------- |
| Frontend       | [e.g., Next.js / React]     | [e.g., 15.x] | [e.g., Use App Router, Server Components by default] |
| Styling        | [e.g., TailwindCSS]         | [e.g., 4.x]  | [e.g., Use Shadcn/ui tokens, no inline styles]       |
| Backend        | [e.g., NestJS / Node]       | [e.g., 22.x] | [e.g., Strictly typed DTOs with class-validator]     |
| Database / ORM | [e.g., PostgreSQL / Prisma] | [e.g., 6.x]  | [e.g., Always use migrations, no raw queries]        |
| State / Fetch  | [e.g., TanStack Query]      | [e.g., 5.x]  | [e.g., Centralized mutation hooks]                   |

## 3. Repository Directory Structure

```text
src/
├── app/               # Routes and pages (Next.js App Router convention)
├── components/        # Reusable UI components
│   ├── ui/            # Base design system components (shadcn)
│   └── blocks/        # Feature-specific layout blocks
├── features/          # Domain-driven modules (Auth, Billing, etc.)
│   ├── api/           # API fetchers and hooks
│   └── components/    # Feature-scoped components
├── lib/               # Shared utilities, clients (Prisma, SDKs)
└── types/             # Global TypeScript interfaces
```

## 4. Coding Standards & Conventions

### 4.1. Language & Typing

- **TypeScript**: Strict mode enabled. any is strictly prohibited. Every function argument and
  return value must be typed.
- **Naming Conventions**:
  - Components & Interfaces: `PascalCase` (e.g., `UserProfile.tsx`).
  - Functions, variables, hooks: `camelCase` (e.g., `useAuth.ts`).
  - Files/Folders (unless component): `kebab-case` (e.g., `error-boundary.ts`).

### 4.2. Code Style & Architecture Patterns

- **Component Design**: Prefer Functional Components with hooks. Max 200 lines per file; split into
  sub-components if it exceeds.
- **State Management**: Keep state local as much as possible. Use [Zustand/Redux] only for truly
  global state (e.g., user session).
- **Data Fetching**: Do not fetch data directly inside layout UI components. Use dedicated API layer
  / hooks.

## 5. Security & Performance Baselines

- **Authentication & AuthZ**: All endpoints are protected by default via middleware. Public
  endpoints must be explicitly declared with a decorator/wrapper.
- **Input Validation**: Every payload from Frontend to Backend must be validated at the gateway
  level (e.g., Zod, Yup).
- **Performance**: Images must use lazy loading. Heavy computations must be memoized (`useMemo`,
  `useCallback`).

## 6. Testing Strategy

- **Unit Tests**: [e.g., Vitest / Jest] for pure business logic, helpers, and hooks.
- **E2E / Integration Tests**: [e.g., Playwright / Cypress] for critical user journeys (Auth,
  Payment).
- **Coverage Expectation**: Minimum [e.g., 70%] coverage on core business logic files.
