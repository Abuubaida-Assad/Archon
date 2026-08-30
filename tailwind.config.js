/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080B10",
        surface: {
          DEFAULT: "#0F141C",
          elevated: "#151C27",
          border: "#1E293B",
          subtle: "#121822",
          hover: "#1B2433",
        },
        slate: {
          950: "#06080D",
          900: "#0B0F17",
          850: "#101622",
          800: "#161E2E",
          700: "#27354A",
          600: "#425570",
          500: "#64748B",
          400: "#94A3B8",
          300: "#CBD5E1",
          200: "#E2E8F0",
          100: "#F1F5F9",
        },
        cyan: {
          400: "#38BDF8",
          500: "#0EA5E9",
          600: "#0284C7",
        },
        emerald: {
          400: "#34D399",
          500: "#10B981",
        },
        amber: {
          400: "#FBBF24",
          500: "#F59E0B",
        },
        rose: {
          400: "#FB7185",
          500: "#F43F5E",
          600: "#E11D48",
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "Fira Code", "ui-monospace", "monospace"],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -5px rgba(56, 189, 248, 0.25)',
        'glow-rose': '0 0 20px -5px rgba(244, 63, 94, 0.25)',
        'glow-amber': '0 0 20px -5px rgba(245, 158, 11, 0.25)',
        'glow-emerald': '0 0 20px -5px rgba(16, 185, 129, 0.25)',
        'panel': '0 10px 30px -10px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.06)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        }
      }
    },
  },
  plugins: [],
};
