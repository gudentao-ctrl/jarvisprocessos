declare module "bpmn-auto-layout" {
  export function layoutProcess(xml: string): Promise<string>;
  const _default: { layoutProcess: (xml: string) => Promise<string> };
  export default _default;
}
