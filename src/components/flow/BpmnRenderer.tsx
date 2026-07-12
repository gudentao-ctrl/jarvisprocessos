import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Crosshair, Download, Maximize2, RefreshCw, ZoomIn, ZoomOut } from "lucide-react";
import { buildBpmnXml } from "@/lib/flow-to-bpmn";
import type { FlowActivity, FlowConnection, FlowDecision } from "./FlowEditor";
import { BpmnLegend } from "./BpmnLegend";

/* Renderer BPMN 2.0 profissional — read-only.
 * bpmn-js NavigatedViewer + minimapa + roteamento ortogonal já embutido no XML. */

export type BpmnRendererProps = {
  activities: FlowActivity[];
  connections: FlowConnection[];
  decisions: FlowDecision[];
  processName?: string;
  companyName?: string;
};

export function BpmnRenderer({
  activities,
  connections,
  decisions,
  processName,
  companyName,
}: BpmnRendererProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [usedEls, setUsedEls] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function render() {
    if (!hostRef.current) return;
    if (activities.length === 0) return;
    try {
      const { xml, usedElements } = buildBpmnXml(activities, connections, decisions, {
        processName, companyName, direction: "LR",
      });
      setUsedEls(usedElements);
      if (!viewerRef.current) {
        const [{ default: Viewer }, minimapMod] = await Promise.all([
          import("bpmn-js/lib/NavigatedViewer"),
          import("diagram-js-minimap"),
        ]);
        const MinimapModule = (minimapMod as any).default ?? minimapMod;
        viewerRef.current = new (Viewer as any)({
          container: hostRef.current,
          additionalModules: [MinimapModule],
        });
        // abre o minimapa
        try { viewerRef.current.get("minimap").open(); } catch { /* ignore */ }
      }
      await viewerRef.current.importXML(xml);
      centralizar();
      setError(null);
    } catch (e: any) {
      console.error("[BpmnRenderer]", e);
      setError(e?.message ?? "Falha ao renderizar BPMN");
    }
  }

  useEffect(() => {
    render();
    return () => {
      try { viewerRef.current?.destroy(); } catch { /* ignore */ }
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, connections, decisions]);

  function zoom(delta: number) {
    const canvas: any = viewerRef.current?.get("canvas");
    if (!canvas) return;
    canvas.zoom(canvas.zoom() + delta);
  }
  function centralizar() {
    const canvas: any = viewerRef.current?.get("canvas");
    canvas?.zoom("fit-viewport", "auto");
  }

  async function exportSvg() {
    try {
      const { svg } = await viewerRef.current.saveSVG();
      downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${processName ?? "processo"}.svg`);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao exportar SVG");
    }
  }

  async function exportPng() {
    try {
      const { svg } = await viewerRef.current.saveSVG();
      const { Canvg } = await import("canvg");
      const scale = 3; // ~300dpi visualmente
      const parser = new DOMParser().parseFromString(svg, "image/svg+xml");
      const svgEl = parser.documentElement;
      const w = parseFloat(svgEl.getAttribute("width") || "1600");
      const h = parseFloat(svgEl.getAttribute("height") || "900");
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      const v = await Canvg.from(ctx, svg);
      await v.render();
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, `${processName ?? "processo"}.png`);
      }, "image/png");
    } catch (e: any) {
      setError(e?.message ?? "Erro ao exportar PNG");
    }
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhuma atividade no fluxo. Adicione atividades na aba <b>Fluxo</b>.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={render} title="Reorganizar diagrama">
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Organizar
        </Button>
        <Button size="sm" variant="outline" onClick={() => zoom(0.15)} title="Zoom +">
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => zoom(-0.15)} title="Zoom -">
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" onClick={centralizar} title="Ajustar à tela">
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" onClick={centralizar} title="Centralizar processo">
          <Crosshair className="h-3.5 w-3.5 mr-1" /> Centralizar
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={exportSvg}>
            <Download className="h-3.5 w-3.5 mr-1" /> SVG
          </Button>
          <Button size="sm" variant="outline" onClick={exportPng}>
            <Download className="h-3.5 w-3.5 mr-1" /> PNG
          </Button>
        </div>
      </div>
      <div
        ref={hostRef}
        className="bpmn-host rounded-lg border bg-background"
        style={{ height: "70vh" }}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <BpmnLegend used={usedEls} />
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* Gera SVG do BPMN off-screen para uso em exportação PDF. */
export async function renderBpmnSvg(
  activities: FlowActivity[],
  connections: FlowConnection[],
  decisions: FlowDecision[],
  processName?: string,
  companyName?: string,
): Promise<string> {
  const host = document.createElement("div");
  host.style.position = "absolute";
  host.style.left = "-99999px";
  host.style.width = "2400px";
  host.style.height = "1400px";
  document.body.appendChild(host);
  try {
    const mod = await import("bpmn-js/lib/NavigatedViewer");
    const Viewer = (mod.default ?? mod) as any;
    const viewer = new Viewer({ container: host });
    const { xml } = buildBpmnXml(activities, connections, decisions, {
      processName, companyName, direction: "LR",
    });
    await viewer.importXML(xml);
    const canvas: any = viewer.get("canvas");
    canvas.zoom("fit-viewport", 0);
    const { svg } = await viewer.saveSVG();
    viewer.destroy();
    return svg;
  } finally {
    document.body.removeChild(host);
  }
}
