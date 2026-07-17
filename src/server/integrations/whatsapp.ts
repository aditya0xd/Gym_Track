type WhatsAppMessageResponse = {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
};

type WhatsAppErrorResponse = {
  error: {
    message: string;
    type: string;
    code: number;
    error_data: {
      messaging_product: string;
      details: string;
    };
  };
};

export async function sendWhatsAppMessage(params: {
  toPhone: string;
  message: string;
  templateName?: string;
  templateParams?: string[];
}) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v18.0";

  if (!accessToken) {
    throw new Error("WHATSAPP_ACCESS_TOKEN is missing.");
  }
  if (!phoneNumberId) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID is missing.");
  }

  // Normalize phone number to format required by WhatsApp API
  const toPhone = params.toPhone.replace(/[^\d]/g, "");
  const formattedPhone = toPhone.startsWith("91") ? toPhone : `91${toPhone}`;

  let body: Record<string, unknown>;

  if (params.templateName && params.templateParams) {
    // Send template message
    body = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "template",
      template: {
        name: params.templateName,
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: params.templateParams.map((param) => ({
              type: "text",
              text: param,
            })),
          },
        ],
      },
    };
  } else {
    // Send simple text message
    body = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "text",
      text: {
        body: params.message,
      },
    };
  }

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    },
  );

  const json = (await response.json()) as WhatsAppMessageResponse | WhatsAppErrorResponse;

  if (!response.ok) {
    const error = json as WhatsAppErrorResponse;
    throw new Error(
      `WhatsApp API error: ${error.error.message} (code: ${error.error.code})`,
    );
  }

  const success = json as WhatsAppMessageResponse;
  const messageId = success.messages[0]?.id;

  return {
    status: "queued",
    providerMessageId: messageId,
    providerMessage: "Message queued successfully",
  };
}
