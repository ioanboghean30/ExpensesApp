export type ThemeName = "midnightEmerald" | "classicDark";

export type AppTheme = {
  background: string;
  surface: string;
  primary: string;
  danger: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
};

export const midnightEmerald: AppTheme = {
  background: "#0B132B",
  surface: "#1C2541",
  primary: "#47E5BC",
  danger: "#FF5A5F",
  textPrimary: "#FFFFFF",
  textSecondary: "#8D99AE",
  border: "#2A3654",
};

export const classicDark: AppTheme = {
  background: "#1E1E1E",
  surface: "#2A2A2A",
  primary: "#4BC0C0",
  danger: "#FF6384",
  textPrimary: "#FFFFFF",
  textSecondary: "#A0A0A0",
  border: "#444444",
};

export const THEMES: Record<ThemeName, AppTheme> = {
  midnightEmerald,
  classicDark,
};
