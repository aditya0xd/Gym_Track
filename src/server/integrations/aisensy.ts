type ReminderChannel = "WHATSAPP" | "SMS";

type AiSensyResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
  [key: string]: unknown;
};

export async function sendAiSensyReminder(params: {
  toPhone: string;
  message: string;
  userName: string;
  channel: ReminderChannel;
  templateParams?: string[];
  tags?: string[];
  attributes?: Record<string, string>;
}) {
  const apiKey = process.env.AISENSY_API_KEY;
  const endpoint = process.env.AISENSY_CAMPAIGN_API_URL ?? "https://backend.aisensy.com/campaign/t1/api/v2";
  const source = process.env.AISENSY_SOURCE ?? "gymtrack-pro";
  const whatsappCampaignName = process.env.AISENSY_WHATSAPP_CAMPAIGN_NAME;
  const smsCampaignName = process.env.AISENSY_SMS_CAMPAIGN_NAME;
  const campaignName =
    params.channel === "WHATSAPP" ? whatsappCampaignName : smsCampaignName;

  if (!apiKey) {
    throw new Error("AISENSY_API_KEY is missing.");
  }
  if (!campaignName) {
    throw new Error(
      `AiSensy campaign name missing for ${params.channel}. Set ${
        params.channel === "WHATSAPP"
          ? "AISENSY_WHATSAPP_CAMPAIGN_NAME"
          : "AISENSY_SMS_CAMPAIGN_NAME"
      }.`,
    );
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      apiKey,
      campaignName,
      destination: params.toPhone,
      userName: params.userName,
      source,
      templateParams: params.templateParams ?? [params.message],
      tags: params.tags ?? ["gymtrack", params.channel.toLowerCase()],
      attributes: params.attributes ?? {},
    }),
  });

  const json = (await response.json().catch(() => ({}))) as AiSensyResponse;

  if (!response.ok || json.success === false) {
    throw new Error(
      (typeof json.message === "string" && json.message) ||
        `AiSensy ${params.channel} send failed.`,
    );
  }

  return {
    status: "queued",
    providerMessage: json.message ?? "queued",
  };
}
