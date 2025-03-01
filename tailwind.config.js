/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // System colors
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        
        // Theme colors
        "bg-primary": "#212020",
        "bg-secondary": "#2A2A2A",
        "bg-tertiary": "#3A3A3A",
        
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        
        // Semantic colors
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
        
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        
        // Header and component colors
        "header-bg": "#646464",
        "component-bg": "#444444",
        "darkest": "#212529",
        "highlight-red": "#ff0000",
        "highlight-yellow": "#ffff00",
        "white": "#ffffff",
        "menu-border-outer": "#646464",
      },
      fontFamily: {
        orbitron: ["Orbitron", "sans-serif"],
        oxanium: ["Oxanium", "sans-serif"],
      },
      animation: {
        twinkle: "twinkle 21s ease-in-out infinite",
      },
      keyframes: {
        twinkle: {
          "0%, 70%": { opacity: 0.3 },
          "50%": { opacity: 1 },
        },
      },
      zIndex: {
        1: "1",
        2: "2",
        3: "3",
        40: "40",
        50: "50",
        100: "100",
        101: "101",
      },
    },
  },
  plugins: [],
}

