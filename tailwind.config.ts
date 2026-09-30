import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "media",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        "paper-raised": "var(--paper-raised)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        muted: "var(--muted)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        highlight: "var(--highlight)",
        "highlight-soft": "var(--highlight-soft)",
        good: "var(--good)",
        "good-soft": "var(--good-soft)",
        "status-todo": "var(--status-todo)",
        "status-todo-soft": "var(--status-todo-soft)",
        "status-progress": "var(--status-progress)",
        "status-progress-soft": "var(--status-progress-soft)",
        "status-overdue": "var(--status-overdue)",
        "status-overdue-soft": "var(--status-overdue-soft)",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-public-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
