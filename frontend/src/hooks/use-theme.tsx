import { createContext, useContext, useState, useEffect, useCallback } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  isDark: true,
});

export const dark = {
  pageBg: "bg-[#0a1018]",
  panelBg: "bg-[#0e1620]",
  panelBg2: "bg-[#121a24]",
  cardBg: "bg-[#1a2a3a]",
  border: "border-[#1e2e3e]",
  borderSubtle: "border-[#1a2530]",
  borderAccent: "border-[#2a3a4a]",
  hoverBg: "hover:bg-[#1a2a3a]",
  activeBg: "bg-[#1a2a3a]",
  selectedBg: "bg-[#1a2a3a]",
  textPrimary: "text-gray-200",
  textSecondary: "text-gray-300",
  textMuted: "text-gray-400",
  textDim: "text-gray-500",
  textFaint: "text-gray-600",
  inputBg: "bg-[#121a24]",
  treeLine: "#2a3a4a",
  checkboxBorder: "border-[#2a3a4a]",
  separatorBg: "bg-[#1e2e3e]",
};

export const light = {
  pageBg: "bg-[#f3f4f6]",
  panelBg: "bg-white",
  panelBg2: "bg-[#f9fafb]",
  cardBg: "bg-[#f3f4f6]",
  border: "border-[#e5e7eb]",
  borderSubtle: "border-[#f3f4f6]",
  borderAccent: "border-[#d1d5db]",
  hoverBg: "hover:bg-[#f9fafb]",
  activeBg: "bg-[#eff6ff]",
  selectedBg: "bg-[#eff6ff]",
  textPrimary: "text-[#1f2937]",
  textSecondary: "text-[#374151]",
  textMuted: "text-[#6b7280]",
  textDim: "text-[#9ca3af]",
  textFaint: "text-[#d1d5db]",
  inputBg: "bg-[#f9fafb]",
  treeLine: "#d1d5db",
  checkboxBorder: "border-[#d1d5db]",
  separatorBg: "bg-[#e5e7eb]",
};

export type ThemeTokens = typeof dark;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("navori-theme") as Theme) || "dark";
    }
    return "dark";
  });

  useEffect(() => {
    localStorage.setItem("navori-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  const tokens = ctx.isDark ? dark : light;
  return { ...ctx, t: tokens };
}
