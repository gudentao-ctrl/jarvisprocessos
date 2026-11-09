import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const uploadMentoriaAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        mentoriaId: z.string().uuid(),
        fileName: z.string().min(1),
        fileType: z.string().optional().default("application/octet-stream"),
        base64Data: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const bucketName = "mentoria-docs";

    // Garantir criação do bucket se ainda não existir
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const exists = (buckets || []).some((b: any) => b.id === bucketName);
      if (!exists) {
        await supabaseAdmin.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: "25MB",
        });
      }
    } catch (bErr) {
      console.warn("Aviso ao verificar bucket mentoria-docs:", bErr);
    }

    // Limpar o prefixo data:mime;base64,
    const base64Clean = data.base64Data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64Clean, "base64");

    // Sanitizar o nome do arquivo para o storage
    const sanitizedName = data.fileName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    const filePath = `${data.mentoriaId}/${Date.now()}_${sanitizedName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: data.fileType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Erro ao enviar arquivo para o storage: ${uploadError.message}`);
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
      name: data.fileName,
      size: buffer.byteLength,
      type: data.fileType,
    };
  });
