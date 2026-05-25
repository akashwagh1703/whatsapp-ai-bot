import type { AiTone } from "@/types";

export type ReplyLanguageCode =
  | "auto"
  | "en"
  | "hi"
  | "mr"
  | "ta"
  | "te"
  | "bn"
  | "gu";

export const REPLY_LANGUAGES: { value: ReplyLanguageCode; label: string }[] = [
  { value: "auto", label: "Match customer (recommended)" },
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "mr", label: "Marathi" },
  { value: "ta", label: "Tamil" },
  { value: "te", label: "Telugu" },
  { value: "bn", label: "Bengali" },
  { value: "gu", label: "Gujarati" },
];

export interface IndustryPreset {
  id: string;
  label: string;
  description: string;
  replyLanguage: ReplyLanguageCode;
  tone: AiTone;
  prompt: string;
  businessKnowledge: string;
  welcomeMessage: string;
  keywordReplies: { keyword: string; reply: string }[];
}

export const INDUSTRY_PRESETS: IndustryPreset[] = [
  {
    id: "general",
    label: "General business",
    description: "Shops, services, and mixed enquiries",
    replyLanguage: "auto",
    tone: "professional",
    prompt:
      "You are the WhatsApp assistant for our business. Answer clearly and help customers with timings, services, and next steps.",
    businessKnowledge:
      "Add your business name, address, hours, phone, and price range here.",
    welcomeMessage:
      "Hello! Thanks for messaging us. How can we help you today?",
    keywordReplies: [
      { keyword: "price", reply: "Please share what you need — we'll send pricing shortly." },
      { keyword: "location", reply: "Share your city and we'll confirm the nearest option." },
    ],
  },
  {
    id: "restaurant",
    label: "Restaurant / café",
    description: "Menu, hours, delivery, table booking",
    replyLanguage: "auto",
    tone: "friendly",
    prompt:
      "You are a friendly restaurant WhatsApp assistant. Help with menu, timings, delivery, and table reservations.",
    businessKnowledge:
      "Cuisine: [e.g. North Indian]\nHours: [e.g. 11am–11pm]\nDelivery: [Yes/No, areas]\nAddress: [full address]\nPopular items: [list 3–5 dishes]",
    welcomeMessage:
      "Hi! Welcome to our restaurant. Ask about today's specials, menu, or table booking.",
    keywordReplies: [
      { keyword: "menu", reply: "Here's our menu: [paste link or top items]. What would you like to order?" },
      { keyword: "booking", reply: "For table booking, please share date, time, and number of guests." },
    ],
  },
  {
    id: "clinic",
    label: "Clinic / salon",
    description: "Appointments, fees, location",
    replyLanguage: "auto",
    tone: "professional",
    prompt:
      "You are a clinic/salon assistant. Help with appointments, services, fees, and location. Do not give medical diagnoses — suggest speaking to our team for clinical questions.",
    businessKnowledge:
      "Services: [list]\nConsultation fee: [amount]\nHours: [Mon–Sat timings]\nAddress: [location + landmark]\nBooking: [phone or online link]",
    welcomeMessage:
      "Hello! Thank you for contacting us. How can we assist you — appointment, fees, or directions?",
    keywordReplies: [
      { keyword: "appointment", reply: "Please share preferred date, time, and service. Our team will confirm shortly." },
      { keyword: "fee", reply: "Consultation starts at [amount]. Share the service you need for exact pricing." },
    ],
  },
  {
    id: "real_estate",
    label: "Real estate",
    description: "Projects, site visits, brochures",
    replyLanguage: "auto",
    tone: "sales",
    prompt:
      "You are a real estate sales assistant. Qualify leads (budget, location, BHK), share project highlights, and offer site visits.",
    businessKnowledge:
      "Projects: [names + areas]\nPrice range: [from–to]\nPossession: [timeline]\nAmenities: [list]\nSite visit: [days/times]",
    welcomeMessage:
      "Hi! Looking for a home or investment? Tell us your preferred location and budget — we'll suggest matching projects.",
    keywordReplies: [
      { keyword: "visit", reply: "Site visits are available [days]. Share your preferred date and project name." },
      { keyword: "brochure", reply: "We'll send the brochure shortly. Which project are you interested in?" },
    ],
  },
  {
    id: "coaching",
    label: "Coaching / courses",
    description: "Batches, fees, demos",
    replyLanguage: "auto",
    tone: "friendly",
    prompt:
      "You help prospective students with course details, batch timings, fees, and demo class booking.",
    businessKnowledge:
      "Courses: [list]\nNext batch: [date]\nFees: [amount + EMI if any]\nMode: [online/offline]\nDemo class: [how to book]",
    welcomeMessage:
      "Hello! Interested in our courses? Ask about syllabus, fees, or the next batch start date.",
    keywordReplies: [
      { keyword: "fee", reply: "Course fees start at [amount]. Which program are you interested in?" },
      { keyword: "demo", reply: "Free demo available [days]. Share your name and preferred time slot." },
    ],
  },
];

export function getLanguageInstruction(code: ReplyLanguageCode): string {
  if (code === "auto") {
    return "Reply in the same language the customer uses (English, Hindi, Marathi, or other). If they mix languages, mirror their style politely.";
  }
  const names: Record<Exclude<ReplyLanguageCode, "auto">, string> = {
    en: "English",
    hi: "Hindi",
    mr: "Marathi",
    ta: "Tamil",
    te: "Telugu",
    bn: "Bengali",
    gu: "Gujarati",
  };
  return `Always reply in ${names[code]}. If the customer writes in another language, politely continue in ${names[code]} unless they explicitly ask to switch.`;
}
