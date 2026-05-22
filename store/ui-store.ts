import { create } from "zustand";

interface UiState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  inboxPanel: "list" | "chat" | "details";
  setInboxPanel: (panel: "list" | "chat" | "details") => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  inboxPanel: "list",
  setInboxPanel: (inboxPanel) => set({ inboxPanel }),
}));
