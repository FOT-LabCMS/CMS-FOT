import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.jsx";
import { INVENTORY_REFRESH_EVENT } from "./api/axiosInstance.js";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchInterval: 30000,
      refetchIntervalInBackground: false,
    },
  },
});

if (typeof window !== "undefined") {
  window.addEventListener(INVENTORY_REFRESH_EVENT, () => {
    [
      ["chemicals"],
      ["deactivatedChemicals"],
      ["publicChemicals"],
      ["publicLocationTree"],
      ["chemicalsWithSds"],
      ["notifications"],
      ["notificationCount"],
      ["chemicalStats"],
      ["batchStats"],
      ["usageTrend"],
    ].forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey });
    });
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
