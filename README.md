# Home Budget Planner

## Table of Contents

- [Home Budget Planner](#home-budget-planner)
  - [Table of Contents](#table-of-contents)
  - [Project description](#project-description)
  - [Tech stack](#tech-stack)
  - [Getting started locally](#getting-started-locally)
  - [Available scripts](#available-scripts)
  - [Project scope](#project-scope)
    - [Key Features](#key-features)
    - [Out of Scope for MVP](#out-of-scope-for-mvp)
  - [Project status](#project-status)
  - [License](#license)

## Project description

Home Budget Planner is a web application designed with a “mobile-first” approach to simplify the planning and tracking of monthly household expenses. It enables users to sum up the monthly income of all household members, create a budget by allocating funds to self-defined expense categories, and monitor the execution of this plan on an ongoing basis. The key principles of the MVP (Minimum Viable Product) version are simplicity, an intuitive interface, and a focus on core functionalities that effectively address the challenge of managing home finances.

## Tech stack

| Area    | Technology                                                                                                |
| ------- | --------------------------------------------------------------------------------------------------------- |
| Runtime | ![Node.js](https://img.shields.io/badge/Node.js-v22.14.0-339933?logo=nodedotjs)                           |
| CI/CD   | ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-205081?logo=githubactions&logoColor=ffffff) |
| Hosting | ![DigitalOcean](https://img.shields.io/badge/DigitalOcean-0080FF?logo=digitalocean&logoColor=white)       |
| BaaS    | ![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)                   |
| DB      | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)             |
| FaaS    | ![Edge Functions](https://img.shields.io/badge/Edge%20Functions-3FCF8E?logo=supabase&logoColor=white)     |
| Storage | ![Supabase Storage](https://img.shields.io/badge/Storage-3FCF8E?logo=supabase&logoColor=white)            |
| Auth    | ![Supabase Auth](https://img.shields.io/badge/Auth-3FCF8E?logo=supabase&logoColor=white)                  |
| Meta FW | ![Astro](https://img.shields.io/badge/Astro-FF5D01?logo=astro&logoColor=white)                            |
| UI FW   | ![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)                            |
| Styling | ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)        |
| UI      | ![Shadcn/ui](https://img.shields.io/badge/shadcn/ui-000000?logo=shadcnui&logoColor=white)                 |
| Schema  | ![Zod](https://img.shields.io/badge/Zod-3E67B1?logo=zod&logoColor=white)                                  |
| Testing | ![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)                         |
| E2E     | ![Playwright](https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white)             |
| UI Test | ![React Testing Library](https://img.shields.io/badge/Testing_Library-E33332?logo=testinglibrary&logoColor=white) |
| Linting | ![ESLint](https://img.shields.io/badge/ESLint-4B32C3?logo=eslint&logoColor=white)                         |
| Format  | ![Prettier](https://img.shields.io/badge/Prettier-F7B93E?logo=prettier&logoColor=black)                   |

## Getting started locally

To get started with this project locally, follow these steps:

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/home-budget-planner.git
   cd home-budget-planner
   ```

2. **Install dependencies:**

   Install the project dependencies:

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   Create a `.env` file in the root of the project and add the necessary environment variables. You can use the `.env.example` file as a template.

4. **Run the development server:**

   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`.

## Available scripts

In the project directory, you can run the following scripts:

| Script                  | Description                             |
| ----------------------- | --------------------------------------- |
| `npm run dev`           | Runs the app in development mode.       |
| `npm run build`         | Builds the app for production.          |
| `npm run preview`       | Serves the production build locally.    |
| `npm run lint`          | Lints the code using ESLint.            |
| `npm run format`        | Formats the code with Prettier.         |
| `npm run test:unit`     | Runs unit tests with Vitest.            |
| `npm run test:e2e`      | Runs E2E tests with Playwright.         |
| `npm run test:coverage` | Generates test coverage report.         |

## Project scope

### Key Features

- **User and Household Management**:
  - User registration via email and password.
  - Login with a "Remember Me" option for a 30-day session.
  - Password reset functionality.
  - Ability to define household members (add, edit, delete names).
- **Monthly Budget Management**:
  - Each calendar month is a separate budget unit.
  - Input income for each household member at the start of the month.
  - Create, edit, and delete custom expense categories.
  - Allocate budget by setting spending limits for each category.
  - Automatic calculation of "Free Funds".
- **Expense Tracking**:
  - Simple form to add expenses with amount, category, date, and optional notes.
  - Ability to edit and delete recorded transactions.
- **Visualization and Reporting**:
  - Main dashboard with a progress bar and summary of the remaining budget.
  - List of all categories on the dashboard, each with its own progress bar.
  - Clear visual indication when the budget is exceeded.
  - Access to a chronological list of all transactions in the current month.
  - Ability to navigate and view archived budgets from previous months.

### Out of Scope for MVP

- No support for sharing a single budget across multiple user accounts.
- No multimedia support for uploading invoices or receipts.
- No AI-based mechanisms for file analysis.
- No integration with email for automatic invoice import.
- No advanced sorting and filtering on the transaction history list.
- No dedicated onboarding tutorial for new users.
- No support for adding negative transactions (refunds).

## Testing Strategy

The project implements a comprehensive testing approach:

### Unit & Integration Tests
- **Framework**: Vitest
- **Component Testing**: React Testing Library
- **Coverage Target**: >80% for business logic
- **Scope**: Validation schemas, services, utilities, custom hooks, API endpoints

### End-to-End Tests
- **Framework**: Playwright
- **Scope**: Complete user journeys, multi-step workflows, responsive design
- **Devices**: Mobile (Pixel 5, iPhone 13) and Desktop (Chrome)
- **Target**: All user stories from PRD

### Continuous Integration
- Tests run automatically on every pull request via GitHub Actions
- Coverage reports and performance audits included in CI pipeline
- Regression test suite for critical flows

For detailed testing documentation, see `.ai/plan-testow.md`.

## Project status

![Project Status](https://img.shields.io/badge/status-in%20progress-yellow)

The project is currently in the development phase. The core functionalities are being implemented, and the application is being prepared for the MVP release.

## License

This project is licensed under the MIT License.
