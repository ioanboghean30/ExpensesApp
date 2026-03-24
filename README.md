# CheltuieliAppExpo - Expense Tracker

A React Native (Expo) mobile app for personal expense tracking with two modes:

- Guest mode (local AsyncStorage)
- Logged-in mode (Supabase cloud sync)

## What Is New (Current State)

- Category creation UX is now picker-first:
  - The Add Category button/input was removed from forms.
  - Selecting Other in the category picker opens a modal to create a custom category.
  - Custom categories can be deleted directly from the picker (trash icon).
- Safer data pipeline:
  - Central normalization utility in src/utils/normalizeData.ts.
  - Expense reads/writes now normalize amount/category/date consistently.
  - Zustand setExpenses normalizes incoming data before storing in state.
- Guest to cloud migration flow:
  - Guest users can create an account from Settings.
  - Existing guest expenses are migrated into Supabase.
- Budgeting system is live:
  - Total monthly limit and per-category limits are stored in Zustand.
  - Budgets persist locally and sync to Supabase for logged-in users.
  - Statistics includes priority-sorted budget progress with Show More / Show Less.
- Theme system is now centralized:
  - App themes are defined in src/constants/theme.ts.
  - Current theme is stored in Zustand and persisted to AsyncStorage.
  - Settings includes an App Theme selector (Midnight Emerald / Classic Dark).
- Shared premium header:
  - New ScreenHeader component is used across app screens.
  - Drawer default headers are hidden and replaced by in-screen custom headers.
- CSV export feature is available:
  - Settings includes an Export Data to CSV action.
  - Expenses are transformed to CSV and shared through native share sheet.
- Home global search is available:
  - Search matches description, category, and amount.
  - Empty search uses the regular recent-activity view logic.
  - While typing, results are shown in a floating panel above the keyboard.
- Statistics spending trend readability improved:
  - Left-side amount scale is pinned and remains visible while the bars scroll horizontally.
- Daily local reminders are now enabled:
  - Home screen registers a daily recurring local notification at 20:00.
  - Reminder text: "Daily Expense Tracker" / "Did you spend anything today? Don't forget to add it!".
  - Existing scheduled reminders are cleared before scheduling to avoid duplicates.

## Tech Stack

- Framework: React Native with Expo SDK 54
- Language: TypeScript (strict mode)
- Navigation: React Navigation (Drawer + Stack)
- Backend/Auth: Supabase (PostgreSQL + Auth)
- Local Storage: AsyncStorage
- Global State: Zustand
- Charts: react-native-chart-kit (BarChart, PieChart)
- Icons: @expo/vector-icons (MaterialCommunityIcons)
- Date Picker: @react-native-community/datetimepicker
- Dropdown Picker: @react-native-picker/picker
- File Export: expo-file-system + expo-sharing
- Notifications: expo-notifications
- Testing: Jest + jest-expo + @testing-library/react-native

## Project Structure

```
App.tsx - Root app, auth gating, Stack/Drawer navigation
index.js - Entry point
scripts/reset-project.js - Utility script to reset starter scaffolding
jest.config.js - Jest runtime config
jest.setup.ts - Global test setup

src/
  components/
    auth/
      GuestSignupModal.tsx - Guest to cloud signup/migration modal
    budgets/
      BudgetProgressBar.tsx - Shared budget progress indicator
    categories/
      NewCategoryForm.tsx - Reusable category creation form + validation
      NewCategoryForm.test.tsx
    expenses/
      ExpenseCard.tsx - Shared expense row (edit/delete)
      index.ts
    ScreenHeader.tsx - Shared dynamic screen header (menu/back)
    inputs/
      AmountInput.tsx - Amount input normalization
      CategoryPicker.tsx - Custom modal picker + category create/delete UX
      DateField.tsx - Shared date field + picker
      DescriptionInput.tsx - Shared description input
      index.ts
    index.ts - Components barrel exports

  constants/
    theme.ts - Theme tokens and available theme definitions

  hooks/
    useCustomCategories.ts - Category merge/mapping + safe icon/color access
    useDailyReminder.ts - Permission + daily local reminder scheduling (20:00)
    useExpenseForm.ts - Shared add/update form state and validation
    useExpenseMutations.ts - Guest/logged-in add/update/delete + category bulk actions
    useGuestToCloudMigration.ts - Guest account conversion + data migration
    useRecentExpenses.ts - Home recent list logic (latest 3 vs last 30 days)
    useStatistics.ts - Filters, KPIs, trend grouping, chart data
    index.ts - Hooks barrel exports
    __tests__/
      useCustomCategories.test.tsx
      useExpenseMutations.test.ts
      useGuestToCloudMigration.test.tsx
      useRecentExpenses.test.tsx
      useStatistics.test.tsx

  lib/
    supabaseClient.ts - Supabase client configuration

  screens/
    LoginScreen.tsx
    SignupScreen.tsx
    InitialSetupScreen.tsx
    HomeScreen.tsx
    AddExpenseScreen.tsx
    UpdateScreen.tsx
    StatisticsScreen.tsx
    StatisticsScreen.test.tsx
    SettingsScreen.tsx

  store/
    useAppStore.ts - Global app store and persistence helpers

  utils/
    budgeting.ts - Budget percentage/color helpers
    exportData.ts - Expense to CSV transform + file/share export flow
    exportData.test.ts - CSV export utility tests
    normalizeData.ts - Expense normalization for storage/cloud/state
```

## Authentication Flow

Global auth states in store:

- loggedOut
- guest
- loggedIn

Rules:

- Auth status is persisted in AsyncStorage under authStatus.
- On startup, store hydration restores auth/currency/custom categories/theme/budgets.
- loggedOut users see Login/Signup stack.
- guest and loggedIn users see Drawer app screens.

## Theming

- Theme source of truth: src/constants/theme.ts
- Available themes:
  - midnightEmerald
  - classicDark
- Theme state:
  - Stored in Zustand as currentTheme
  - Persisted in AsyncStorage under appTheme
- Settings screen includes an App Theme selector.

## Initial Setup Flow

- Triggered only by onboarding actions:
  - After Signup success
  - After Continue as Guest
- Trigger key: shouldOpenInitialSetup
- HomeScreen consumes and clears the one-time key, then opens InitialSetupScreen.
- Initial setup stores:
  - userCurrency
  - userCountry

## Expense Data Model

In app state:

- id: string
- amount: number
- description: string
- category: string
- date: Date

Supabase table: expenses

Expected columns include:

- id
- amount
- description
- category
- date
- user_id

## Normalization and Data Safety

All expense payloads pass through src/utils/normalizeData.ts utilities:

- normalizeExpense
- normalizeExpenseForState
- normalizeExpensesForState

Guarantees:

- Amount becomes a finite number (invalid -> 0).
- Category falls back to Other when missing/blank.
- Date is converted to a safe ISO value; invalid date falls back to now.
- Store-level setExpenses also normalizes incoming arrays.

## Categories

Default categories (order-sensitive for icon/color mapping):

- Food
- Transport
- Bills
- Entertainment
- Shopping
- Health
- Other

Custom category behavior:

- Persisted under AsyncStorage key userCategories.
- Available in add, update, and statistics filters.
- Icon fallback: shape-outline.
- Color fallback: deterministic generated HSL color from category name.
- Duplicate guard is case-insensitive.

### Category Picker UX

- CategoryPicker uses a modal list UI.
- Selecting Other opens a create-category modal.
- Cancel in that modal leaves selection at Other.
- Custom categories show a trash icon for direct deletion.
- Deleting a custom category can:
  - delete all expenses in that category, or
  - move them to Other

## Guest vs Logged-In Persistence

Guest mode:

- Reads/writes expenses from savedExpenses in AsyncStorage.
- Category bulk operations are done locally.

Logged-in mode:

- Uses Supabase expenses table for CRUD.
- Category bulk operations use server-side update/delete queries.

## Budgeting

- Store state:
  - budgets.totalLimit
  - budgets.categoryLimits
- Persistence:
  - Guest: AsyncStorage key userBudgets
  - loggedIn: Supabase budgets table (upsert by user_id)
- Home screen:
  - Monthly total card shows total-limit progress when set.
- Statistics screen:
  - Budget section appears below analytics/list content.
  - Category limits are sorted by spent/limit descending (most critical first).
  - Collapsed view shows top 1; expanded view shows all.
  - Total Limit bar is shown only in expanded mode and pinned at the bottom.
  - View & Edit modal supports save/delete for total and category limits.

## Guest to Cloud Migration

- Settings shows a guest-only banner: Back up your expenses.
- GuestSignupModal collects email/password.
- useGuestToCloudMigration:
  - signs up user
  - parses and validates guest expenses
  - inserts valid rows into Supabase
  - preserves normalized custom categories
  - switches authStatus to loggedIn

## Home Screen

- Uses shared ScreenHeader.
- Displays current month total.
- Registers daily local reminder scheduling through useDailyReminder.
- Quick actions:
  - Add Expense
  - Statistics
- Global search:
  - Search bar includes leading magnify icon and contextual clear button.
  - Filters by description, category, or amount.
  - During active typing/focus, results move to a floating panel above the keyboard.
- Recent Activity:
  - Default: latest 3 items
  - Show more: items from last 30 days
  - Show less: collapse back to latest 3
- Each item supports edit and delete.

## Add Expense Screen

- Uses shared ScreenHeader.
- Header back arrow returns to Home.
- Collapsible form opened by Add Expense button.
- Uses shared inputs/components.
- Form order is: Amount -> Category -> Description -> Date.
- Confirm adds expense and collapses form.
- Expense History list supports inline edit/delete.
- Category creation/deletion is handled via CategoryPicker modal flow.

## Update Expense Screen

- Uses shared ScreenHeader.
- Edit form order is: Amount -> Category -> Description -> Date.
- Defensive guard for invalid navigation payload.
- Supports same custom category create/delete flow.

## Statistics Screen

- Uses shared ScreenHeader.

Filters:

- Time: 7 Days, This Month, This Year, All Time, Custom
- Category: All + default categories + custom categories

Outputs:

- KPI cards: Total Spent, Daily Avg
- Bar chart: spending trend
  - Left-side value labels are fixed so amounts stay visible while scrolling through later bars.
- Pie chart: category distribution
- Transaction/top-category list based on selected category
- Budget progress section with expand/collapse and total-limit controls

Trend grouping:

- Groups by month for year/all filters.
- For custom range, groups by month if range > 30 days.

## Settings Screen

- Uses shared ScreenHeader.
- Currency picker (persisted to userCurrency).
- App Theme selector:
  - Midnight Emerald
  - Classic Dark
- Export Data to CSV button:
  - Builds CSV with Date, Description, Category, Amount
  - Escapes text fields for comma-safe CSV output
  - Exports file via native share sheet
- Guest-only cloud backup banner and signup modal.
- Danger zone action: Delete Account and Data
  - loggedIn: deletes cloud expenses, calls RPC delete_user, signs out
  - always clears local data via AsyncStorage and resets local session

## AsyncStorage Keys

- authStatus
- userCurrency
- userCountry
- userCategories
- savedExpenses
- shouldOpenInitialSetup
- userBudgets
- appTheme

## Navigation Structure

loggedOut:

- Stack
  - Login (header hidden)
  - Signup

guest / loggedIn:

- Drawer
  - Home
  - SettingsScreen
  - AddExpenseScreen (hidden from drawer list)
  - UpdateScreen (hidden)
  - StatisticsScreen (hidden)
  - InitialSetupScreen (hidden, header off)

Notes:

- Drawer default headers are disabled (headerShown: false).
- App screens render in-content headers through ScreenHeader.

## Runtime and Build Notes

- react-native-gesture-handler import is first in App.tsx.
- react-native-reanimated/plugin is present in babel.config.js.
- app.json:
  - orientation: portrait
  - newArchEnabled: true
  - experiments: typedRoutes and reactCompiler enabled
  - android package: com.ioanboghean.CheltuieliAppExpo
- EAS build profiles:
  - preview (apk)
  - preview2 (assembleRelease)
  - production

## Validation Status (Updated)

Latest verification in this scan:

- npm run lint -> pass (exit 0)
- npm test -> pass (8/8 suites, 12/12 tests)

## Getting Started

1. Install dependencies

```bash
npm install
```

2. Start the app

```bash
npx expo start
```

3. Build Android preview APK

```bash
eas build --profile preview --platform android
```
