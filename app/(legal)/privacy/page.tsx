import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME } from "@/constants";
import {
  PRIVACY_LAST_UPDATED,
  PRIVACY_SECTIONS,
} from "@/content/privacy-policy";

export const metadata: Metadata = {
  title: `Privacy Policy — ${APP_NAME}`,
  description: `Privacy Policy for ${APP_NAME} WhatsApp AI assistant platform, including Supabase, Meta WhatsApp, and OpenRouter.`,
};

export default function PrivacyPolicyPage() {
  return (
    <article className="prose prose-slate max-w-none prose-headings:scroll-mt-20">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Privacy Policy
      </h1>
      <p className="text-slate-600">
        <strong>{APP_NAME}</strong> — WhatsApp AI assistant for businesses
      </p>
      <p className="text-sm text-slate-500">Last updated: {PRIVACY_LAST_UPDATED}</p>

      <nav
        aria-label="Table of contents"
        className="not-prose my-8 rounded-xl border border-slate-200 bg-white p-5"
      >
        <p className="mb-3 text-sm font-semibold text-slate-900">On this page</p>
        <ol className="list-inside list-decimal space-y-1 text-sm text-slate-600">
          {PRIVACY_SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-brand hover:opacity-80">
                {s.title.replace(/^\d+\.\s*/, "")}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {PRIVACY_SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
          {section.paragraphs.map((p, i) => (
            <p key={i} className="mt-3 text-slate-700 leading-relaxed">
              {p}
            </p>
          ))}
        </section>
      ))}

      <div className="not-prose mt-12 rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">
          Ready to use the Service?{" "}
          <Link href="/login" className="text-brand font-medium hover:opacity-80">
            Sign in to {APP_NAME}
          </Link>
        </p>
      </div>
    </article>
  );
}
