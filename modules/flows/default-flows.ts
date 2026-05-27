import type { FlowDefinition } from "@/types/flow";

export const DEFAULT_WELCOME_FLOW: {
  slug: string;
  name: string;
  triggers: string[];
  priority: number;
  definition: FlowDefinition;
} = {
  slug: "welcome",
  name: "Welcome flow",
  triggers: ["hi", "hello", "hey", "start", "help"],
  priority: 10,
  definition: {
    version: 1,
    steps: [
      {
        id: "welcome_msg",
        type: "message",
        text: "Welcome! Thanks for messaging us.",
        nextStepId: "main_menu",
      },
      {
        id: "main_menu",
        type: "buttons",
        text: "How can we help you today?",
        buttons: [
          { id: "pricing", label: "Pricing", nextStepId: "pricing_info" },
          { id: "support", label: "Support", nextStepId: "support_info" },
          { id: "order", label: "Order", nextStepId: "order_input" },
        ],
        defaultNextStepId: "goodbye",
      },
      {
        id: "pricing_info",
        type: "message",
        text: "Our team will share pricing details with you shortly.",
        nextStepId: "goodbye",
      },
      {
        id: "support_info",
        type: "message",
        text: "Support will contact you soon. Please describe your issue if you haven't already.",
        nextStepId: "goodbye",
      },
      {
        id: "order_input",
        type: "input",
        prompt: "What would you like to order? Please type your request.",
        collectKey: "order_request",
        nextStepId: "order_confirm",
      },
      {
        id: "order_confirm",
        type: "message",
        text: "Got it! We've noted your request and will confirm shortly.",
        nextStepId: "goodbye",
      },
      {
        id: "goodbye",
        type: "end",
        text: "Thank you for chatting with us. Send *hi* anytime to start again.",
      },
    ],
  },
};

export const DEFAULT_THANKS_FLOW: {
  slug: string;
  name: string;
  triggers: string[];
  priority: number;
  definition: FlowDefinition;
} = {
  slug: "thanks_fallback",
  name: "Thanks acknowledgement",
  triggers: ["*"],
  priority: 9999,
  definition: {
    version: 1,
    steps: [
      {
        id: "thanks",
        type: "end",
        text: "Thanks for reaching out! A team member will follow up shortly.",
      },
    ],
  },
};
