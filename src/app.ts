import Elysia from "elysia";
import cors from "@elysiajs/cors";
import { userRoute } from "./routes/userRoutes";
import { tenantRoute } from "./routes/tenantRoutes";
import { waterRoute } from "./routes/waterRoutes";
import { maintenanceRoute } from "./routes/maintenanceRoute";

export function App() {
  console.log("🚀 App() is initializing");

  const app = new Elysia();

  app.use(cors());

  // ✅ root route
  app.get("/", () => {
    console.log("📥 GET / called");
    return {
      message: "🦊 Hello from root route!",
    };
  });

  app.use(userRoute); 
  app.use(tenantRoute);
  app.use(waterRoute);
  app.use(maintenanceRoute);
  

  return app;
}
