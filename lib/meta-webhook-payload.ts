import { getWhatsAppPhoneId } from "@/lib/whatsapp-env";

/** Builds a Meta-shaped webhook body for tests and portal API. */
export function buildSimulatedMetaPayload(
  from: string,
  text: string,
  contactName: string
) {
  const phoneId = getWhatsAppPhoneId() || "0";
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "SIMULATED",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { phone_number_id: phoneId },
              contacts: [{ profile: { name: contactName } }],
              messages: [
                {
                  from: from.replace(/\D/g, ""),
                  id: `wamid.api.${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body: text },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}
