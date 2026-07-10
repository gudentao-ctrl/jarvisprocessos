import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useActiveCompany } from "@/lib/active-company";
import { getTemplateForCompany, saveTemplate } from "@/lib/document-templates.functions";

export const Route = createFileRoute("/_authenticated/template-documentos")({
  component: TemplateDocumentosPage,
});

type Form = {
  id?: string;
  name: string;
  consultancy_logo_url: string;
  client_logo_url: string;
  header_html: string;
  footer_html: string;
  primary_color: string;
  accent_color: string;
  font_family: string;
  code_prefix: string;
  numbering_seed: number;
};

const EMPTY: Form = {
  name: "Template padrão",
  consultancy_logo_url: "",
  client_logo_url: "",
  header_html: "",
  footer_html: "Confidencial · uso interno",
  primary_color: "#0f172a",
  accent_color: "#3b82f6",
  font_family: "Inter, system-ui, sans-serif",
  code_prefix: "DOC",
  numbering_seed: 1,
};

function TemplateDocumentosPage() {
  const { companyId, company } = useActiveCompany();
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    getTemplateForCompany({ data: { company_id: companyId } })
      .then((t) => {
        if (t) {
          setForm({
            id: t.id,
            name: t.name,
            consultancy_logo_url: t.consultancy_logo_url ?? "",
            client_logo_url: t.client_logo_url ?? "",
            header_html: t.header_html ?? "",
            footer_html: t.footer_html ?? "",
            primary_color: t.primary_color,
            accent_color: t.accent_color,
            font_family: t.font_family,
            code_prefix: t.code_prefix,
            numbering_seed: t.numbering_seed,
          });
        } else {
          setForm(EMPTY);
        }
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  async function save() {
    setBusy(true);
    try {
      const saved = await saveTemplate({
        data: {
          id: form.id,
          company_id: companyId,
          name: form.name,
          consultancy_logo_url: form.consultancy_logo_url || null,
          client_logo_url: form.client_logo_url || null,
          header_html: form.header_html,
          footer_html: form.footer_html,
          primary_color: form.primary_color,
          accent_color: form.accent_color,
          font_family: form.font_family,
          code_prefix: form.code_prefix,
          numbering_seed: form.numbering_seed,
        },
      });
      setForm((f) => ({ ...f, id: saved.id }));
      toast.success("Template salvo");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold">Template de documentos</h1>
        <p className="text-sm text-muted-foreground">
          Branding unificado para PDFs {company ? `da empresa "${company.name}"` : "(padrão global)"}.
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <div>
          <Label>Nome do template</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Logo consultoria (URL)</Label>
            <Input value={form.consultancy_logo_url} onChange={(e) => setForm({ ...form, consultancy_logo_url: e.target.value })} placeholder="https://…/logo.png" />
          </div>
          <div>
            <Label>Logo cliente (URL)</Label>
            <Input value={form.client_logo_url} onChange={(e) => setForm({ ...form, client_logo_url: e.target.value })} placeholder="https://…/cliente.png" />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>Cor primária</Label>
            <div className="flex gap-2">
              <Input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="w-14 p-1" />
              <Input value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Cor de destaque</Label>
            <div className="flex gap-2">
              <Input type="color" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} className="w-14 p-1" />
              <Input value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Fonte (CSS)</Label>
            <Input value={form.font_family} onChange={(e) => setForm({ ...form, font_family: e.target.value })} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Prefixo de código</Label>
            <Input value={form.code_prefix} onChange={(e) => setForm({ ...form, code_prefix: e.target.value })} placeholder="PRC" />
          </div>
          <div>
            <Label>Numeração inicial</Label>
            <Input type="number" value={form.numbering_seed} onChange={(e) => setForm({ ...form, numbering_seed: Number(e.target.value) || 1 })} />
          </div>
        </div>

        <div>
          <Label>Cabeçalho (texto ou HTML simples)</Label>
          <Textarea rows={2} value={form.header_html} onChange={(e) => setForm({ ...form, header_html: e.target.value })} placeholder="Ex: Consultoria XYZ · Processos & Melhoria Contínua" />
        </div>
        <div>
          <Label>Rodapé (texto ou HTML simples)</Label>
          <Textarea rows={2} value={form.footer_html} onChange={(e) => setForm({ ...form, footer_html: e.target.value })} placeholder="Confidencial · página {page}/{total}" />
          <p className="text-[11px] text-muted-foreground mt-1">Use <code>{"{page}"}</code> e <code>{"{total}"}</code> para numeração.</p>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar template
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-2">
        <h2 className="text-sm font-semibold">Prévia</h2>
        <div
          className="rounded border p-4"
          style={{ fontFamily: form.font_family, borderColor: form.primary_color }}
        >
          <div className="flex items-center justify-between border-b pb-2 mb-3" style={{ borderColor: form.primary_color }}>
            <div className="flex items-center gap-2">
              {form.consultancy_logo_url && <img src={form.consultancy_logo_url} alt="" className="h-8 object-contain" />}
              <span className="text-xs" style={{ color: form.primary_color }}>{form.header_html || "Cabeçalho"}</span>
            </div>
            {form.client_logo_url && <img src={form.client_logo_url} alt="" className="h-8 object-contain" />}
          </div>
          <div style={{ color: form.primary_color }}>
            <div className="text-lg font-bold">Nome do processo</div>
            <div className="text-xs" style={{ color: form.accent_color }}>{form.code_prefix}-{String(form.numbering_seed).padStart(4, "0")}</div>
          </div>
          <div className="mt-4 text-[11px] text-muted-foreground border-t pt-2">
            {form.footer_html.replace("{page}", "1").replace("{total}", "1") || "Rodapé"}
          </div>
        </div>
      </Card>
    </div>
  );
}
