import React from "react";
import { Theme as AstryxTheme } from "@astryxdesign/core/theme";
import { themes, defaultThemeSlug } from "../../../astryx-themes";
import { useTheme } from "../../contexts/ThemeContext";

/**
 * Bridges the app's ThemeContext ("light" | "dark") to Astryx's root Theme
 * provider so CSS light-dark() tokens (e.g. Dialog surfaces) follow app theme
 * toggles rather than staying pinned to OS preference ("system").
 */
export const AstryxThemeBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  return (
    <AstryxTheme theme={themes[defaultThemeSlug]} mode={theme}>
      {children}
    </AstryxTheme>
  );
};
