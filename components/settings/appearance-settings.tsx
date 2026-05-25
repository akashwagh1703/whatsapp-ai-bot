"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, ImagePlus, Loader2, RotateCcw, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useBranding } from "@/components/providers/branding-provider";
import {
  applyBrandingToDocument,
  DEFAULT_BRANDING,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  LOGO_ACCEPT,
  LOGO_BUCKET,
  LOGO_MAX_BYTES,
  normalizeHexColor,
} from "@/lib/branding";
import {
  buildThemeExport,
  parseThemeImport,
  writeBrandingCache,
} from "@/lib/branding-cache";

export function AppearanceSettings() {
  const queryClient = useQueryClient();
  const { refresh } = useBranding();
  const fileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    logoUrl: "",
    primaryColor: DEFAULT_PRIMARY_COLOR,
    secondaryColor: DEFAULT_SECONDARY_COLOR,
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    applyBrandingToDocument({
      appName: form.name.trim() || DEFAULT_BRANDING.appName,
      logoUrl: logoPreview,
      primaryColor: normalizeHexColor(form.primaryColor, DEFAULT_PRIMARY_COLOR),
      secondaryColor: normalizeHexColor(
        form.secondaryColor,
        DEFAULT_SECONDARY_COLOR
      ),
    });
  }, [form.name, form.primaryColor, form.secondaryColor, logoPreview]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data: biz } = await supabase.from("businesses").select("*").maybeSingle();
      if (biz) {
        const loaded = {
          name: biz.name ?? "",
          logoUrl: biz.logo_url ?? "",
          primaryColor: normalizeHexColor(
            biz.primary_color ?? "",
            DEFAULT_PRIMARY_COLOR
          ),
          secondaryColor: normalizeHexColor(
            biz.secondary_color ?? "",
            DEFAULT_SECONDARY_COLOR
          ),
        };
        setForm(loaded);
        setLogoPreview(biz.logo_url);
        writeBrandingCache({
          appName: loaded.name || DEFAULT_BRANDING.appName,
          logoUrl: biz.logo_url,
          primaryColor: loaded.primaryColor,
          secondaryColor: loaded.secondaryColor,
        });
      }
      setLoading(false);
    }
    void load();
  }, []);

  function onLogoPick(file: File | null) {
    if (!file) return;
    if (file.size > LOGO_MAX_BYTES) {
      setError("Logo must be 2 MB or smaller.");
      return;
    }
    setError(null);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function resetColors() {
    setForm((f) => ({
      ...f,
      primaryColor: DEFAULT_PRIMARY_COLOR,
      secondaryColor: DEFAULT_SECONDARY_COLOR,
    }));
  }

  function exportTheme() {
    const payload = buildThemeExport({
      appName: form.name.trim() || DEFAULT_BRANDING.appName,
      primaryColor: normalizeHexColor(form.primaryColor, DEFAULT_PRIMARY_COLOR),
      secondaryColor: normalizeHexColor(
        form.secondaryColor,
        DEFAULT_SECONDARY_COLOR
      ),
      logoUrl: logoPreview,
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${payload.appName.replace(/\s+/g, "-").toLowerCase()}-theme.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Theme exported. Share this file to reuse on another device.");
  }

  async function importTheme(file: File) {
    setError(null);
    try {
      const parsed = parseThemeImport(JSON.parse(await file.text()));
      if (!parsed) {
        setError("Invalid theme file. Use a JSON export from this page.");
        return;
      }
      const primaryColor = normalizeHexColor(
        parsed.primaryColor,
        DEFAULT_PRIMARY_COLOR
      );
      const secondaryColor = normalizeHexColor(
        parsed.secondaryColor,
        DEFAULT_SECONDARY_COLOR
      );
      setForm({
        name: parsed.appName || DEFAULT_BRANDING.appName,
        logoUrl: parsed.logoUrl ?? "",
        primaryColor,
        secondaryColor,
      });
      setLogoPreview(parsed.logoUrl);
      setLogoFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setMessage("Theme imported. Click Save appearance to persist to your account.");
    } catch {
      setError("Could not read theme file.");
    }
  }

  async function uploadLogo(businessId: string): Promise<string | null> {
    if (!logoFile) return form.logoUrl.trim() || null;

    const supabase = createClient();
    const ext = logoFile.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${businessId}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(path, logoFile, { upsert: true, contentType: logoFile.type });

    if (uploadError) {
      throw new Error(
        `Logo upload failed: ${uploadError.message}. Run supabase/branding-migration.sql in Supabase, or paste a Logo URL instead.`
      );
    }

    const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();
      const { data: biz } = await supabase.from("businesses").select("id").maybeSingle();
      if (!biz) {
        setError("No business workspace found. Sign in again.");
        return;
      }

      const name = form.name.trim() || DEFAULT_BRANDING.appName;
      const primaryColor = normalizeHexColor(
        form.primaryColor,
        DEFAULT_PRIMARY_COLOR
      );
      const secondaryColor = normalizeHexColor(
        form.secondaryColor,
        DEFAULT_SECONDARY_COLOR
      );

      let logoUrl = form.logoUrl.trim() || null;
      if (logoFile) {
        logoUrl = await uploadLogo(biz.id);
      }

      const { error: updateError } = await supabase
        .from("businesses")
        .update({
          name,
          logo_url: logoUrl,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
        })
        .eq("id", biz.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setForm((f) => ({
        ...f,
        name,
        logoUrl: logoUrl ?? "",
        primaryColor,
        secondaryColor,
      }));
      setLogoPreview(logoUrl);
      setLogoFile(null);
      if (fileRef.current) fileRef.current.value = "";

      await queryClient.invalidateQueries({ queryKey: ["business"] });
      writeBrandingCache({
        appName: name,
        logoUrl,
        primaryColor,
        secondaryColor,
      });
      refresh();
      setMessage(
        "Appearance saved. Colors and logo apply across the app and login page."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading appearance…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Live preview</CardTitle>
          <CardDescription>
            How your brand looks on buttons and accents after you save.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <div
            className="brand-preview-bar h-14 min-w-[200px] flex-1 rounded-xl px-4 shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${form.primaryColor}, ${form.secondaryColor})`,
            }}
          />
          <Button type="button">Primary button</Button>
          <span className="badge-brand rounded-full px-3 py-1 text-xs font-semibold">
            Accent badge
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project identity</CardTitle>
          <CardDescription>
            Project name, logo, and colors are stored in your database and apply
            across the dashboard (sidebar, buttons, badges, highlights).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              className="mt-2"
              placeholder="FlowChat AI"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              Shown in the sidebar, browser tab title, and header.
            </p>
          </div>

          <div>
            <Label>Logo</Label>
            <div className="mt-2 flex flex-wrap items-start gap-4">
              <div className="brand-logo-box flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImagePlus className="h-8 w-8 text-slate-300" />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept={LOGO_ACCEPT}
                  className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
                  onChange={(e) => onLogoPick(e.target.files?.[0] ?? null)}
                />
                <Input
                  placeholder="Or paste logo URL (https://…)"
                  value={form.logoUrl}
                  onChange={(e) => {
                    setLogoFile(null);
                    setForm((f) => ({ ...f, logoUrl: e.target.value }));
                    setLogoPreview(e.target.value || null);
                  }}
                />
                <p className="text-xs text-slate-500">
                  PNG, JPG, WebP, or SVG — max 2 MB. Upload requires Supabase
                  bucket <code className="text-[11px]">business-assets</code> (
                  see <code className="text-[11px]">supabase/branding-migration.sql</code>
                  ).
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="primary-color">Primary color</Label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  id="primary-color"
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, primaryColor: e.target.value }))
                  }
                  className="h-11 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                />
                <Input
                  value={form.primaryColor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, primaryColor: e.target.value }))
                  }
                  className="font-mono text-sm"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Main buttons, active nav, and key highlights.
              </p>
            </div>
            <div>
              <Label htmlFor="secondary-color">Secondary color</Label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  id="secondary-color"
                  type="color"
                  value={form.secondaryColor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, secondaryColor: e.target.value }))
                  }
                  className="h-11 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                />
                <Input
                  value={form.secondaryColor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, secondaryColor: e.target.value }))
                  }
                  className="font-mono text-sm"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Gradients, accents, and secondary UI touches.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save appearance"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={resetColors}>
              <RotateCcw className="h-4 w-4" />
              Reset colors to default
            </Button>
          </div>

          {message && (
            <p className="text-brand text-sm font-medium">{message}</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export / import theme</CardTitle>
          <CardDescription>
            Backup your branding or apply a preset. Imported themes update the
            form — save to store in the database. Login page uses the last saved
            theme from this browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={exportTheme}>
            <Download className="h-4 w-4" />
            Export theme (.json)
          </Button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importTheme(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => importRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Import theme
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact details</CardTitle>
          <CardDescription>Optional — for your records only.</CardDescription>
        </CardHeader>
        <ContactFields />
      </Card>
    </div>
  );
}

function ContactFields() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: biz } = await supabase
        .from("businesses")
        .select("email, phone")
        .maybeSingle();
      if (biz) {
        setEmail(biz.email ?? "");
        setPhone(biz.phone ?? "");
      }
    }
    void load();
  }, []);

  async function saveContact() {
    setSaving(true);
    setMsg(null);
    const supabase = createClient();
    const { data: biz } = await supabase.from("businesses").select("id").maybeSingle();
    if (!biz) return;
    await supabase
      .from("businesses")
      .update({ email: email || null, phone: phone || null })
      .eq("id", biz.id);
    setSaving(false);
    setMsg("Contact details saved.");
  }

  return (
    <CardContent className="space-y-4">
      <div>
        <Label>Email</Label>
        <Input
          className="mt-2"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <Label>Phone</Label>
        <Input
          className="mt-2"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <Button variant="outline" onClick={saveContact} disabled={saving}>
        Save contact details
      </Button>
      {msg && <p className="text-brand text-sm">{msg}</p>}
    </CardContent>
  );
}
