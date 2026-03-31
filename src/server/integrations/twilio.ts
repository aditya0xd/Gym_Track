import twilio from "twilio";

type ReminderChannel = "WHATSAPP" | "SMS";

export async function sendTwilioReminder(params: {
  toPhone: string;
  message: string;
  channel: ReminderChannel;
}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const smsFrom = process.env.TWILIO_SMS_FROM;
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials are missing.");
  }

  const client = twilio(accountSid, authToken);

  const from =
    params.channel === "WHATSAPP"
      ? whatsappFrom
        ? `whatsapp:${whatsappFrom}`
        : undefined
      : smsFrom;

  const to =
    params.channel === "WHATSAPP"
      ? `whatsapp:${params.toPhone}`
      : params.toPhone;

  const payload: Parameters<typeof client.messages.create>[0] = {
    body: params.message,
    to,
  };

  if (messagingServiceSid) {
    payload.messagingServiceSid = messagingServiceSid;
  } else if (from) {
    payload.from = from;
  } else {
    throw new Error("Twilio sender config missing. Set TWILIO_SMS_FROM / TWILIO_WHATSAPP_FROM.");
  }

  const msg = await client.messages.create(payload);
  return { sid: msg.sid, status: msg.status ?? "queued" };
}
