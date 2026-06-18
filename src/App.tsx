// src/App.tsx
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import AppRoutes from "./routes";

function App() {
  return (
    <>
      <AppRoutes />
      <SpeedInsights />
      <Analytics />
    </>
  );
}

export default App;
