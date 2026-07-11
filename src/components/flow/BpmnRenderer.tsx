import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Maximize2, RefreshCw, ZoomIn, ZoomOut } from "lucide-react";
import { buildBpmnXml } from "@/lib/flow-to-bpmn";
import type { FlowActivity, FlowConnection, FlowDecision } from "./FlowEditor";
import { BpmnLegend } from "./BpmnLegend";

/* Renderer BPMN 2.0 profissional — read-only.
 * Utiliza bpmn-js Viewer + XML gerado a partir do Fluxo mestre com raias.
 * bpmn-js é carregado dinamicamente (window-dependente) para não quebrar SSR. */

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
        const mod = await import("bpmn-js/lib/NavigatedViewer");
        const Viewer = (mod.default ?? mod) as any;
        viewerRef.current = new Viewer({ container: hostRef.current });
      }
      await viewerRef.current.importXML(xml);
      const canvas: any = viewerRef.current.get("canvas");
      canvas.zoom("fit-viewport", "auto");
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
  function fit() {
    const canvas: any = viewerRef.current?.get("canvas");
    canvas?.zoom("fit-viewport", "auto");
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
        <Button size="sm" variant="outline" onClick={render}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Auto organizar
        </Button>
        <Button size="sm" variant="outline" onClick={() => zoom(0.15)}>
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => zoom(-0.15)}>
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" onClick={fit}>
          <Maximize2 className="h-3.5 w-3.5 mr-1" /> Ajustar
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          BPMN 2.0 · raias por responsável
        </span>
      </div>
      <div
        ref={hostRef}
        className="bpmn-host rounded-lg border bg-background"
        style={{ height: "70vh" }}
      />
      {error && (
        <p className="text-xs text-destructive">
          {error}
        </p>
      )}
      <BpmnLegend used={usedEls} />
    </div>
  );
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
