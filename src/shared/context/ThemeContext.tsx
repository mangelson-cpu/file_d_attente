import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../api/supabaseClient";

interface ThemeColors {
  primaryColor: string;
  secondaryColor: string;
}

interface ThemeContextType {
  colors: ThemeColors;
  updateColors: (colors: ThemeColors) => Promise<{ success: boolean; error?: string }>;
  applyColorsLocally: (colors: ThemeColors) => void;
  loading: boolean;
}

const DEFAULT_COLORS: ThemeColors = {
  primaryColor: "#8b5cf6",
  secondaryColor: "#d4145a",
};

const ThemeContext = createContext<ThemeContextType>({
  colors: DEFAULT_COLORS,
  updateColors: async () => ({ success: false }),
  applyColorsLocally: () => { },
  loading: true,
});

export const useTheme = () => useContext(ThemeContext);


function setCSSVariables(colors: ThemeColors) {
  const root = document.documentElement;
  root.style.setProperty("--primary-color", colors.primaryColor);
  root.style.setProperty("--secondary-color", colors.secondaryColor);


  root.style.setProperty("--primary-color-rgb", hexToRgb(colors.primaryColor));
  root.style.setProperty("--secondary-color-rgb", hexToRgb(colors.secondaryColor));
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "139, 92, 246";
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colors, setColors] = useState<ThemeColors>(DEFAULT_COLORS);
  const [loading, setLoading] = useState(true);

  const fetchColors = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["primary_color", "secondary_color"]);

      if (error) {
        console.error("Erreur chargement thème:", error);
        return;
      }

      if (data && data.length > 0) {
        const newColors = { ...DEFAULT_COLORS };
        for (const row of data) {
          if (row.key === "primary_color") newColors.primaryColor = row.value;
          if (row.key === "secondary_color") newColors.secondaryColor = row.value;
        }
        setColors(newColors);
        setCSSVariables(newColors);
      } else {
        setCSSVariables(DEFAULT_COLORS);
      }
    } catch (err) {
      console.error("Exception thème:", err);
      setCSSVariables(DEFAULT_COLORS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchColors();

    const channel = supabase
      .channel("app_settings_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        () => {
          fetchColors();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchColors]);


  const applyColorsLocally = useCallback((newColors: ThemeColors) => {
    setCSSVariables(newColors);
  }, []);


  const updateColors = useCallback(async (newColors: ThemeColors): Promise<{ success: boolean; error?: string }> => {
    try {
      const updates = [
        { key: "primary_color", value: newColors.primaryColor, updated_at: new Date().toISOString() },
        { key: "secondary_color", value: newColors.secondaryColor, updated_at: new Date().toISOString() },
      ];

      const { error } = await supabase
        .from("app_settings")
        .upsert(updates, { onConflict: "key" });

      if (error) {
        return { success: false, error: error.message };
      }

      setColors(newColors);
      setCSSVariables(newColors);
      return { success: true };
    } catch (err) {
      const error = err as Error;
      return { success: false, error: error.message };
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ colors, updateColors, applyColorsLocally, loading }}>
      {children}
    </ThemeContext.Provider>
  );
};
