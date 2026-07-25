import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPortalSettings,
  updatePortalSettings,
  regeneratePortalToken,
} from "@/lib/public-portal.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, ExternalLink, RefreshCw, Globe, Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const BUCKET = "portal-logos";

function LogoUpload({
  label,
  companyId,
  path,
  onChange,
}: {
  label: string;
  companyId: string;
  path: string;
  onChange: (path: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!path) {
        setPreview(null);
        return;
      }
      if (/^https?:\/\//i.test(path)) {
        setPreview(path);
        return;
      }
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
      if (alive) setPreview(data?.signedUrl ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [path]);

  async function pick(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Envie um arquivo de imagem (PNG, JPG ou SVG)");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 2 MB)");
      return;
    }
    setBusy(true);
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const key = `${companyId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(key, file, { contentType: file.type, upsert: true });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onChange(key);
    toast.success("Logotipo enviado — salve para aplicar");
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3 rounded-md border p-3">
        <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
          {preview ? (
            <img src={preview} alt={label} className="max-h-16 max-w-24 object-contain" />
          ) : (
            <span className="text-[10px] text-muted-foreground">sem logo</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="mr-1 h-3.5 w-3.5" />
            )}
            {path ? "Substituir" : "Enviar imagem"}
          </Button>
          {path && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onChange("")}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Remover
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pick(f);
            e.target.value = "";
          }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">PNG, JPG ou SVG até 2 MB.</p>
    </div>
  );
}


export function PortalPublicoDialog({
  companyId,
  companyName,
  open,
  onOpenChange,
}: {
  companyId: string;
  companyName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const get = useServerFn(getPortalSettings);
  const upd = useServerFn(updatePortalSettings);
  const regen = useServerFn(regeneratePortalToken);

  const { data, isLoading } = useQuery({
    queryKey: ["portal-settings", companyId],
    queryFn: () => get({ data: { company_id: companyId } }),
    enabled: open,
  });

  const [title, setTitle] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [consultancyLogo, setConsultancyLogo] = useState("");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (data) {
      setTitle(data.public_title || "");
      setCompanyLogo(data.public_company_logo_url || "");
      setConsultancyLogo(data.public_consultancy_logo_url || "");
      setEnabled(!!data.public_enabled);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      upd({
        data: {
          company_id: companyId,
          public_enabled: enabled,
          public_title: title,
          public_company_logo_url: companyLogo,
          public_consultancy_logo_url: consultancyLogo,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-settings", companyId] });
      toast.success("Configurações salvas");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });

  const regenerate = useMutation({
    mutationFn: () => regen({ data: { company_id: companyId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-settings", companyId] });
      toast.success("Novo link gerado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao regenerar"),
  });

  const url =
    data?.public_token && typeof window !== "undefined"
      ? `${window.location.origin}/dashboard/${data.public_token}`
      : "";

  async function copy() {
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" /> Página pública — {companyName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Portal ativo</p>
                <p className="text-xs text-muted-foreground">
                  Quando desativado, o link retorna “página indisponível”.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="space-y-2">
              <Label>Link exclusivo</Label>
              <div className="flex gap-2">
                <Input readOnly value={url} className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={copy} title="Copiar">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" asChild title="Abrir">
                  <a href={url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Regenerar o link? O link anterior deixará de funcionar.")) {
                    regenerate.mutate();
                  }
                }}
                disabled={regenerate.isPending}
                className="text-xs"
              >
                <RefreshCw className="mr-1 h-3 w-3" /> Regenerar token
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Título exibido no portal</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={companyName}
              />
            </div>

            <LogoUpload
              label="Logotipo da empresa"
              companyId={companyId}
              path={companyLogo}
              onChange={setCompanyLogo}
            />

            <LogoUpload
              label="Logotipo da consultoria"
              companyId={companyId}
              path={consultancyLogo}
              onChange={setConsultancyLogo}
            />


            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                Salvar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
