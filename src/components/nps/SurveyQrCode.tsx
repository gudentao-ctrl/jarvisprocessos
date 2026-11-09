import { useEffect, useState } from "react";
import { Copy, Download, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function SurveyQrCode({ url, title, active }: { url: string; title: string; active: boolean }) {
  const [image, setImage] = useState("");
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setImage("");
    setFailed(false);
    import("qrcode").then((qr) => qr.toDataURL(url, {
      width: 768, margin: 4, errorCorrectionLevel: "M",
    })).then((value) => { if (!cancelled) setImage(value); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [url]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success("Link da pesquisa copiado."); }
    catch { toast.error("Não foi possível copiar o link."); }
  };
  const download = () => {
    if (!image) return;
    const link = document.createElement("a");
    link.href = image;
    link.download = `QR-${title.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 80)}.png`;
    link.click();
  };
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title, url });
      else await copy();
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) toast.error("Não foi possível compartilhar.");
    }
  };

  return <>
    <div className="flex items-center gap-3 border-t pt-3">
      <Button variant="outline" className="h-24 w-24 shrink-0 p-0" aria-label={`Ampliar QR Code de ${title}`} title="Ampliar QR Code" onClick={() => setOpen(true)} disabled={!image}>
        {image ? <img src={image} alt={`QR Code da pesquisa ${title}`} width={96} height={96} className="h-24 w-24 rounded-md" /> : failed ? <span className="px-2 text-xs">QR indisponível</span> : <Loader2 className="size-5 animate-spin" />}
      </Button>
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-medium">QR Code da pesquisa</p>
        {!active && <p className="text-xs text-muted-foreground">Pesquisa inativa</p>}
        <div className="flex flex-wrap gap-1">
          <Button variant="ghost" size="icon" onClick={download} disabled={!image} aria-label={`Baixar QR Code de ${title}`} title="Baixar QR Code"><Download className="size-4" /></Button>
          <Button variant="ghost" size="icon" onClick={share} aria-label={`Compartilhar pesquisa ${title}`} title="Compartilhar pesquisa"><Share2 className="size-4" /></Button>
        </div>
      </div>
    </div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>QR Code da pesquisa</DialogTitle><DialogDescription className="break-words">{title}{!active && " · Inativa"}</DialogDescription></DialogHeader>
        {image && <img src={image} alt={`QR Code da pesquisa ${title}`} width={256} height={256} className="mx-auto aspect-square w-64 max-w-full rounded-md" />}
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={copy}><Copy className="size-4" /> Link</Button>
          <Button variant="outline" onClick={download} disabled={!image}><Download className="size-4" /> Baixar</Button>
          <Button onClick={share}><Share2 className="size-4" /> Compartilhar</Button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}