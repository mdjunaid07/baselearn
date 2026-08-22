import "dotenv/config";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { seedDemoData, seedDemoTeacher } from "./data/seedDemoData.js";

const PORT = process.env.PORT || 4000;

async function main() {
  await connectDatabase();
  await seedDemoData();
  await seedDemoTeacher();

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Foundational Learning API listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
