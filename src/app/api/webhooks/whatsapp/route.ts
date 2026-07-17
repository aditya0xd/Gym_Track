import { prisma } from "@/lib/prisma";

// GET: Meta's handshake verification
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// POST: actual status/message events
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Parse WhatsApp webhook payload structure
    // Meta sends: { entry: [{ changes: [{ value: { statuses: [...] } }] }] }
    const entries = body.entry;

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return new Response("OK", { status: 200 });
    }

    // Process status updates
    for (const entry of entries) {
      if (!entry.changes || !Array.isArray(entry.changes)) continue;

      for (const change of entry.changes) {
        const statuses = change.value?.statuses;
        if (!statuses || !Array.isArray(statuses) || statuses.length === 0) continue;

        for (const status of statuses) {
          // status can be: sent, delivered, read, failed
          const { id: messageId, status: deliveryStatus, timestamp } = status;

          // Map WhatsApp status to our ReminderStatus
          let reminderStatus: "SENT" | "DELIVERED" | "FAILED";
          if (deliveryStatus === "delivered" || deliveryStatus === "read") {
            reminderStatus = "DELIVERED";
          } else if (deliveryStatus === "failed") {
            reminderStatus = "FAILED";
          } else {
            reminderStatus = "SENT"; // sent, queued, etc.
          }

          // Update ReminderLog with delivery status using providerMessageId
          console.log(`WhatsApp message ${messageId} status: ${deliveryStatus} -> ${reminderStatus} at ${new Date(timestamp * 1000).toISOString()}`);

          await prisma.reminderLog.updateMany({
            where: { providerMessageId: messageId },
            data: { status: reminderStatus },
          });
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return new Response("Error processing webhook", { status: 500 });
  }
}
