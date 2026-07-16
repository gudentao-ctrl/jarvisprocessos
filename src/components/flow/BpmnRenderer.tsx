import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Crosshair,
  Download,
  Grid3x3,
  Maximize2,
  Minimize2,
  Presentation,
  RefreshCw,
  Rows3,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { buildBpmnXml } from "@/lib/flow-to-bpmn";
import type { FlowActivity, FlowConnection, FlowDecision } from "./FlowEditor";
import { BpmnLegend } from "./BpmnLegend";

/* Renderer BPMN 2.0 profissional — read-only.
 * bpmn-js NavigatedViewer + minimapa + roteamento ortogonal já embutido no XML.
 * Bloco 2: toolbar completa, re-layout automático em mutações (via props),
 * cache do XML por hash do FlowGraph e debounce 150ms. */

export type BpmnRendererProps = {
  activities: FlowActivity[];
  connections: FlowConnection[];
  decisions: FlowDecision[];
  processName?: string;
  companyName?: string;
};

/* hash rápido determinístico do input (djb2). */
function hashInput(
  activities: FlowActivity[],
  connections: FlowConnection[],
  decisions: FlowDecision[],
  processName?: string,
): string {
  const parts: string[] = [processName ?? ""];
  for (const a of activities) {
    parts.push(`A:${a.id}:${a.type}:${a.ordering ?? 0}:${a.responsible ?? ""}:${a.name ?? ""}`);
  }
  for (const c of connections) {
    parts.push(`C:${c.id}:${c.from_activity_id}:${c.to_activity_id}:${c.type ?? ""}:${c.order_index ?? 0}:${c.label ?? ""}`);
  }
  for (const d of decisions) {
    parts.push(`D:${d.activity_id}:${d.question ?? ""}`);
  }
  const s = parts.join("|");
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return String(h);
}

const xmlCache = new Map<string, { xml: string; used: Set<string> }>();

export function BpmnRenderer({
  activities,
  connections,
  decisions,
  processName,
  companyName,
}: BpmnRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const lastXmlRef = useRef<string>("");
  const debounceRef = useRef<number | null>(null);

  const [usedEls, setUsedEls] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showLanes, setShowLanes] = useState(true);
  const [presentation, setPresentation] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const inputHash = useMemo(
    () => hashInput(activities, connections, decisions, processName),
    [activities, connections, decisions, processName],
  );

  async function ensureViewer() {
    if (viewerRef.current || !hostRef.current) return;
    const [{ default: Viewer }, minimapMod] = await Promise.all([
      import("bpmn-js/lib/NavigatedViewer"),
      import("diagram-js-minimap"),
    ]);
    const MinimapModule = (minimapMod as any).default ?? minimapMod;
    viewerRef.current = new (Viewer as any)({
      container: hostRef.current,
      additionalModules: [MinimapModule],
    });
    try { viewerRef.current.get("minimap").open(); } catch { /* ignore */ }
  }

  async function render(force = false) {
    if (!hostRef.current) return;
    if (activities.length === 0) return;
    try {
      let cached = xmlCache.get(inputHash);
      if (!cached) {
        const { xml, usedElements } = buildBpmnXml(activities, connections, decisions, {
          processName, companyName, direction: "LR",
        });
        cached = { xml, used: usedElements };
        xmlCache.set(inputHash, cached);
      }
      setUsedEls(cached.used);
      await ensureViewer();
      if (force || cached.xml !== lastXmlRef.current) {
        await viewerRef.current.importXML(cached.xml);
        lastXmlRef.current = cached.xml;
        centralizar();
      }
      setError(null);
    } catch (e: any) {
      console.error("[BpmnRenderer]", e);
      setError(e?.message ?? "Falha ao renderizar BPMN");
    }
  }

  // Re-layout automático em mutações do fluxo, com debounce de 150ms.
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => { render(); }, 150);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputHash]);

  useEffect(() => {
    return () => {
      try { viewerRef.current?.destroy(); } catch { /* ignore */ }
      viewerRef.current = null;
      lastXmlRef.current = "";
    };
  }, []);

  // Fullscreen listener
  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  function zoom(delta: number) {
    const canvas: any = viewerRef.current?.get("canvas");
    if (!canvas) return;
    canvas.zoom(canvas.zoom() + delta);
  }
  function centralizar() {
    const canvas: any = viewerRef.current?.get("canvas");
    canvas?.zoom("fit-viewport", "auto");
  }

  async function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      try { await el.requestFullscreen(); } catch { /* ignore */ }
    } else {
      try { await document.exitFullscreen(); } catch { /* ignore */ }
    }
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
      const scale = 3;
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

  const hostClasses = [
    "bpmn-host rounded-lg border bg-background transition-colors",
    showGrid ? "bpmn-host--grid" : "",
    !showLanes ? "bpmn-host--no-lanes" : "",
    presentation ? "bpmn-host--presentation" : "",
  ].filter(Boolean).join(" ");

  return (
    <div ref={containerRef} className="space-y-2 bg-background">
      {!presentation && (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => render(true)} title="Reorganizar diagrama">
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
          <Button
            size="sm"
            variant={showGrid ? "default" : "outline"}
            onClick={() => setShowGrid((v) => !v)}
            title="Alternar grade"
          >
            <Grid3x3 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant={showLanes ? "default" : "outline"}
            onClick={() => setShowLanes((v) => !v)}
            title="Mostrar/ocultar raias"
          >
            <Rows3 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant={presentation ? "default" : "outline"}
            onClick={() => setPresentation((v) => !v)}
            title="Modo apresentação"
          >
            <Presentation className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={toggleFullscreen}
            title={fullscreen ? "Sair de tela cheia" : "Tela cheia"}
          >
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
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
      )}
      {presentation && (
        <div className="flex items-center justify-end">
          <Button size="sm" variant="outline" onClick={() => setPresentation(false)}>
            Sair da apresentação
          </Button>
        </div>
      )}
      <div
        ref={hostRef}
        className={hostClasses}
        style={{ height: fullscreen ? "calc(100vh - 60px)" : presentation ? "85vh" : "70vh" }}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!presentation && <BpmnLegend used={usedEls} />}
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
