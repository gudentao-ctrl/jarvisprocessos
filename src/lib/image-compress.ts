// Reduz fotos (inclusive as tiradas pelo celular) antes de salvar, para que
// carreguem rápido no site e no aplicativo do celular.
export const MAX_ORIGINAL_IMAGE_BYTES = 25 * 1024 * 1024;

export async function compressImageFile(file: File, maxSide = 1280, quality = 0.8): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Selecione um arquivo de imagem.");
  if (file.size > MAX_ORIGINAL_IMAGE_BYTES) throw new Error("A imagem ultrapassa 25MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Não foi possível ler esta imagem. Tente uma foto em JPG ou PNG."));
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível processar a imagem.");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
