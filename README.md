# CheltuieliAppExpo — Expense Tracker

A React Native (Expo) mobile application for tracking personal expenses, with support for both **guest mode** (local storage) and **authenticated mode** (Supabase cloud sync).

---

## Tech Stack

- **Framework:** React Native with Expo SDK 54
- **Language:** TypeScript (strict mode)
- **Navigation:** React Navigation (Drawer + Stack navigators)
- **Backend/Auth:** Supabase (PostgreSQL + Auth)
- **Local Storage:** AsyncStorage
- **Global State:** Zustand (`src/store/useAppStore.ts`)
- **Charts:** react-native-chart-kit (BarChart, PieChart)
- **Icons:** @expo/vector-icons (MaterialCommunityIcons)
- **Animations:** react-native-reanimated (Babel plugin required)
- **Date Picker:** @react-native-community/datetimepicker
- **Dropdown Picker:** @react-native-picker/picker

---

## Project Structure

```
App.tsx                     — Root: auth state, navigation (Stack for login, Drawer for app)
index.js                    — Entry point (registerRootComponent)
src/
  lib/
    supabaseClient.ts       — Supabase client config (uses AsyncStorage for session)
  store/
    useAppStore.ts          — Global app state (authStatus, currency, expenses, customCategories)
  screens/
    LoginScreen.tsx          — Email/password login + "Continue as Guest" button
    SignupScreen.tsx          — Account creation with auto-login
    InitialSetupScreen.tsx   — First-launch country + currency selection (required before Home)
    HomeScreen.tsx            — Dashboard: monthly total, recent activity (edit/delete, 30-day expand), quick actions
    AddExpenseScreen.tsx      — Collapsible add form + full expense history list (edit/delete)
    UpdateScreen.tsx          — Edit an existing expense (amount, description, category, date)
    StatisticsScreen.tsx      — Charts, filters, KPIs (total, daily average, trend, pie)
    SettingsScreen.tsx        — Currency picker + "Delete Account & Data" danger zone
constants/
  theme.ts                   — Color palette (light/dark) and font definitions
```

---

## Authentication Flow

The app has **3 auth states** managed globally via Zustand (`useAppStore`) and consumed in `App.tsx`:

| State       | Storage                  | Description                                |
| ----------- | ------------------------ | ------------------------------------------ |
| `loggedOut` | —                        | Shows Login/Signup Stack                   |
| `guest`     | AsyncStorage only        | All data stored locally on device          |
| `loggedIn`  | Supabase (cloud) + local | Data synced with Supabase `expenses` table |

**Rules to respect:**

- Auth status is **persisted** in AsyncStorage (survives app restart)
- Auth status is loaded on app start with a loading screen
- Both `guest` and `loggedIn` users see the **Drawer navigator**
- `loggedOut` users see the **Stack navigator** (Login → Signup)

---

## Initial Setup Flow

- On first use (or after data clear), the user **must** select country and currency before accessing Home
- `HomeScreen` checks if `userCurrency` exists in AsyncStorage — if not, navigates to `InitialSetupScreen`
- Currency is saved with key `"userCurrency"` in AsyncStorage
- Country is saved with key `"userCountry"` in AsyncStorage
- The app includes a broad world-country/currency list (not limited to only 4 currencies)

## Signup Behavior

- Signup uses Supabase `auth.signUp(...)`
- On success, user is auto-logged-in immediately by setting global `authStatus` to `"loggedIn"`
- Current flow does not wait for email-confirmation before entering the app

---

## Expense Data Model

```typescript
type Expense = {
  id: string;
  amount: number;
  description: string;
  date: Date;
  category: string;
};
```

**Supabase table:** `expenses` — columns include `id`, `amount`, `description`, `date`, `category`, `user_id`

---

## Categories (Predefined — Do NOT change order without updating icons/colors)

| Category      | Icon (MaterialCommunityIcons) | Color   |
| ------------- | ----------------------------- | ------- |
| Food          | food-variant                  | #FF6384 |
| Transport     | car                           | #36A2EB |
| Bills         | file-document-outline         | #FFCE56 |
| Entertainment | gamepad-variant               | #4BC0C0 |
| Shopping      | shopping                      | #9966FF |
| Health        | heart-pulse                   | #FF9F40 |
| Other         | dots-horizontal-circle        | #C9CBCF |

Default categories are exported from `DEFAULT_CATEGORIES` in `src/store/useAppStore.ts`.

---

## Custom Categories

- Users can create custom categories directly from:
  - `AddExpenseScreen` (while adding expenses)
  - `UpdateScreen` (while editing expenses)
- Custom categories are persisted in AsyncStorage under key `"userCategories"`
- Custom categories are managed globally in Zustand (`customCategories`, `addCustomCategory`)
- Custom categories are available everywhere categories are used:
  - Add expense category picker
  - Update expense category picker
  - Statistics category filter chips

---

## Guest vs Logged-In Data Storage

| Operation  | Guest (AsyncStorage)                   | Logged-In (Supabase)                                   |
| ---------- | -------------------------------------- | ------------------------------------------------------ |
| **Load**   | Read from key `"savedExpenses"`        | `supabase.from("expenses").select("*")`                |
| **Add**    | Prepend to array, save to AsyncStorage | `supabase.from("expenses").insert(...)` with `user_id` |
| **Update** | Map array, replace matching id, save   | `supabase.from("expenses").update(...).eq("id", id)`   |
| **Delete** | Filter array, save                     | `supabase.from("expenses").delete().eq("id", id)`      |

---

## Recent Activity (Home)

- Shows latest 3 expenses by default
- `Show more` expands to expenses from last 30 days
- `Show less` collapses back to latest 3
- Each row supports inline edit (pencil) and delete (trash)

---

## Add Expense Screen Behavior

- Initial state shows only one primary button: `Add Expense`
- Tapping it expands the form fields (amount, description, category, date)
- The expanded form includes a `New category` field and `Add` action for custom categories
- Confirm adds the expense and collapses the form
- Expense History rows use inline edit/delete actions (pencil/trash)

---

## Statistics Screen — Filters

**Time filters:** 7 Days, This Month, This Year, All Time, Custom (date range picker)
**Category filter:** Dynamic — `All` + default categories + user-created custom categories

- Bar chart groups by **days** (≤30 day range) or **months** (>30 days)
- KPI cards show **Total Spent** and **Daily Average**
- Pie chart shows spending breakdown by category
- When a specific category is selected, shows transaction list; when "All", shows top categories

---

## Navigation Structure

```
loggedOut:
  Stack Navigator
    ├── Login (headerShown: false)
    └── Signup

loggedIn / guest:
  Drawer Navigator
    ├── Home                    (visible in drawer)
    ├── Settings                (visible in drawer)
    ├── AddExpenseScreen        (hidden from drawer menu)
    ├── UpdateScreen            (hidden from drawer menu)
    ├── StatisticsScreen        (hidden from drawer menu)
    └── InitialSetupScreen      (hidden from drawer, no header)
```

- Drawer has a custom content component that adds a **Logout** button for both guest and loggedIn users
- Header style: centered title, bold, blue tint (`#007AAF`), white background

---

## UI / Design Rules

- **Dark theme** throughout the app (background: `#1E1E1E`, cards: `#333`)
- Login/Signup screens use **light theme** (white background)
- Primary action color: `#007AFF` (blue)
- Accent color: `#4BC0C0` (teal — hero card, total spent)
- Negative/expense color: `#FF6384` (red-pink)
- All monetary values displayed with **2 decimal places** (`.toFixed(2)`)
- Currency label shown next to amounts everywhere
- Dates displayed using `toLocaleDateString("ro-RO")` in forms, `"en-US"` in expense lists

---

## Important Rules & Constraints

1. **`react-native-gesture-handler` must be the first import** in `App.tsx`
2. **`react-native-reanimated/plugin`** must be in `babel.config.js` plugins
3. **AsyncStorage keys used:**
   - `"authStatus"` — persisted auth state (`"guest"`, `"loggedIn"`, `"loggedOut"`)
   - `"userCurrency"` — selected currency string (e.g. `"RON"`)

- `"userCountry"` — selected country string (e.g. `"Romania"`)
- `"userCategories"` — JSON array of user-created custom categories
- `"savedExpenses"` — JSON array of guest expenses

4. **Supabase config** is in `src/lib/supabaseClient.ts` — uses `AsyncStorage` for session persistence
5. **Supabase RPC `delete_user`** is called for account deletion (server-side function)
6. **EAS Build** is configured — `preview` profile builds APK, `production` for store
7. **Orientation** is locked to **portrait** in `app.json`
8. **Android package:** `com.ioanboghean.CheltuieliAppExpo`
9. **New Architecture** is enabled (`newArchEnabled: true`)
10. **React Compiler** experiment is enabled in `app.json`
11. **Typed routes** experiment is enabled

---

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the app:

   ```bash
   npx expo start
   ```

3. Build APK (preview):
   ```bash
   eas build --profile preview --platform android
   ```
