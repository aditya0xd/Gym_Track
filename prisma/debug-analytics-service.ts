import "dotenv/config";
import { getOwnerAnalytics } from "../src/server/gym-owner/analytics.service";

async function run() {
  const ownerId = "99999999-9999-9999-9999-999999999999";
  const analytics = await getOwnerAnalytics(ownerId);
  console.log(JSON.stringify(analytics.retention, null, 2));
  console.log(JSON.stringify(analytics.summary, null, 2));
  console.log(JSON.stringify(analytics.revenueForecast, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
