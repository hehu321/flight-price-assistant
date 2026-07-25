import { theme } from "ant-design-vue";
import type { ThemeConfig } from "ant-design-vue/es/config-provider/context";

/**
 * Keep Ant Design in the same mode as the extension shell.  CSS variables alone
 * cannot restyle overlay components (Select, Segmented, Drawer, etc.), because
 * Ant Design renders them from its token theme.
 */
export function createSidepanelAntdTheme(mode: "dark" | "light"): ThemeConfig {
  const light = mode === "light";
  return {
    algorithm: light ? theme.defaultAlgorithm : theme.darkAlgorithm,
    token: {
      colorPrimary: "#4f7cff",
      colorInfo: "#4f7cff",
      colorSuccess: "#22c55e",
      colorWarning: "#f59e0b",
      colorError: "#ef4444",
      colorBgBase: light ? "#f8fafc" : "#0f1729",
      colorBgContainer: light ? "#ffffff" : "#1a2332",
      colorBgElevated: light ? "#ffffff" : "#222d3f",
      colorText: light ? "#0f172a" : "#f8fafc",
      colorTextSecondary: light ? "#475569" : "#94a3b8",
      colorTextPlaceholder: light ? "#94a3b8" : "#64748b",
      colorBorder: light ? "#e2e8f0" : "#2e3a4e",
      borderRadius: 8,
      controlHeight: 42,
      fontSize: 14,
    },
  };
}
