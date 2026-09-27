// src/lib/ai-gateway.server.ts
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { SupabaseClient } from "@supabase/supabase-js";
import { setReloadTimestamp } from "./set-reload-timestamp.functions"; // new import

/* ============================================================
 * BYOK AI GATEWAY & RESILIENT AI ENGINE
 * Zero dependência de créditos de plataforma (Lovable).
 * Suporte nativo a OpenAI Whisper (STT) e GPT-4o / GPT-4o-mini (Chat/Análise),
 * com roteamento automático, retentativas exponenciais e fallback.
 * ============================================================ */

export type AiProvider = "openai" | "lovable" | "ollama";

export interface ResolvedAiConfig {
  provider: AiProvider;
  openAiApiKey?: string;
  openAiBaseUrl: string;
  lovableApiKey?: string;
  chatModel: string;
  transcribeModel: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  hasByok: boolean;
}

/**
 * Resolve as credenciais de IA:
 * 1. Prioridade Máxima: OPENAI_API_KEY configurada no backend (.env / variáveis de ambiente do servidor / Supabase)
 * 2. Tabela system_settings (chave 'openai_api_key' configurada por SuperAdmin no painel)
 * 3. Fallback: LOVABLE_API_KEY
 * 4. Se nada, tenta usar Ollama local (se disponível)
 */
export async function getAiConfig(supabase?: SupabaseClient | null): Promise<ResolvedAiConfig> {
  const envOpenAiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const envOllamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1";
  const envOllamaModel = process.env.OLLAMA_MODEL || "llama3";
  const envLovableKey = process.env.LOVABLE_API_KEY?.trim() ?? "";
  const envBaseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

  let dbOpenAiKey = "";
  let dbChatModel = "";
  let dbTranscribeModel = "";

  if (supabase) {
    try {
      const { data } = await supabase
        .from("system_settings")
        .select("key, value")
        .in("key", ["openai_api_key", "openai_model_chat", "openai_model_transcribe"]);
      if (data) {
        for (const item of data) {
          if (item.key === "openai_api_key") dbOpenAiKey = item.value?.trim() ?? "";
          if (item.key === "openai_model_chat") dbChatModel = item.value?.trim() ?? "";
          if (item.key === "openai_model_transcribe") dbTranscribeModel = item.value?.trim() ?? "";
        }
      }
    } catch {
      // ignore errors if table does not exist yet
    }
  }

  const activeOpenAiKey = envOpenAiKey || dbOpenAiKey;
  const activeLovableKey = envLovableKey;

  // Provider selection hierarchy
  let provider: AiProvider = "openai";
  if (activeOpenAiKey) {
    provider = "openai";
  } else if (envOllamaBaseUrl) {
    provider = "ollama";
  } else if (activeLovableKey) {
    provider = "lovable";
  } else {
    provider = "openai"; // fallback – will error later if no key
  }

  return {
    provider,
    openAiApiKey: activeOpenAiKey || undefined,
    openAiBaseUrl: envBaseUrl.replace(/\\+$/,""),
    lovableApiKey: activeLovableKey || undefined,
    chatModel: dbChatModel || process.env.OPENAI_CHAT_MODEL || "gpt-4o",
    ollamaBaseUrl: envOllamaBaseUrl,
    ollamaModel: envOllamaModel,
    transcribeModel: dbTranscribeModel || process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1",
    hasByok: Boolean(activeOpenAiKey),
  };
}

/**
 * Utilitário de sleep para retentativas com backoff
 */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ============================================================
 * TRANSCRIÇÃO DE ÁUDIO (WHISPER NATIVO / FALLBACK)
 * ============================================================ */

export interface TranscribeAudioOptions {
  fileBlob: Blob;
  fileName?: string;
  mimeType?: string;
  language?: string;
  prompt?: string;
  supabase?: SupabaseClient | null;
  maxRetries?: number;
}

/**
 * Executa transcrição de áudio via OpenAI Whisper nativo ou Lovable Gateway como fallback.
 */
export async function transcribeAudioAi(
  options: TranscribeAudioOptions,
): Promise<{ text: string; provider: string }> {
  const {
    fileBlob,
    fileName = "audio.mp3",
    mimeType = "audio/mpeg",
    language = "pt",
    prompt,
    supabase,
    maxRetries = 3,
  } = options;

  const config = await getAiConfig(supabase);

  // ---------- OpenAI Whisper (BYOK) ----------
  if (config.openAiApiKey) {
    let lastError: any = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const formData = new FormData();
        const file = new File([fileBlob], fileName, { type: mimeType });
        formData.append("file", file);
        formData.append("model", config.transcribeModel || "whisper-1");
        if (language) formData.append("language", language);
        if (prompt) formData.append("prompt", prompt);

        const res = await fetch(`${config.openAiBaseUrl}/audio/transcriptions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.openAiApiKey}`,
          },
          body: formData,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          if (res.status === 429 && attempt < maxRetries) {
            await sleep(attempt * 2000);
            continue;
          }
          throw new Error(`OpenAI Whisper falhou (${res.status}): ${errText.slice(0, 300)}`);
        }

        const json = (await res.json()) as { text?: string };
        const text = (json.text ?? "").trim();

        if (supabase) {
          const now = new Date().toISOString();
          await supabase
            .from("system_settings")
            .upsert({ key: "ui_reload_timestamp", value: now }, { onConflict: "key" });
        }

        return { text, provider: "openai" };
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries) await sleep(attempt * 1500);
      }
    }
    if (!config.lovableApiKey) {
      throw lastError || new Error("Falha na transcrição de áudio com OpenAI Whisper.");
    }
  }

  // ---------- Lovable Fallback ----------
  if (config.lovableApiKey) {
    let lastError: any = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const formData = new FormData();
        const file = new File([fileBlob], fileName, { type: mimeType });
        formData.append("file", file);
        formData.append("model", "openai/whisper-1");
        if (language) formData.append("language", language);
        if (prompt) formData.append("prompt", prompt);

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.lovableApiKey}`,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: formData,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          if (res.status === 402) {
            throw new Error(
              "Créditos de IA esgotados na plataforma Lovable. Adicione uma chave própria OPENAI_API_KEY no painel para continuar transcrevendo.",
            );
          }
          if (res.status === 429 && attempt < maxRetries) {
            await sleep(attempt * 2000);
            continue;
          }
          throw new Error(`Falha na transcrição (${res.status}): ${errText.slice(0, 200)}`);
        }

        const json = (await res.json()) as { text?: string };
        const text = (json.text ?? "").trim();

        if (supabase) {
          const now = new Date().toISOString();
          await supabase
            .from("system_settings")
            .upsert({ key: "ui_reload_timestamp", value: now }, { onConflict: "key" });
        }

        return { text, provider: "lovable" };
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries && !/Créditos de IA esgotados/.test(err?.message ?? "")) {
          await sleep(attempt * 1500);
        } else {
          throw err;
        }
      }
    }
    throw lastError || new Error("Falha na transcrição de áudio via Lovable.");
  }

  throw new Error(
    "Nenhuma chave de IA configurada para transcrição. Defina OPENAI_API_KEY nas variáveis de ambiente ou no painel SuperAdmin.",
  );
}

/* ============================================================
 * CHAT & ANÁLISE ESTRUTURADA (GPT-4o / FALLBACK)
 * ============================================================ */

export interface ChatAiOptions {
  messages: Array<{ role: "system" | "user" | "assistant" | "developer"; content: string }>;
  model?: string;
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
  supabase?: SupabaseClient | null;
  maxRetries?: number;
}

/**
 * Executa chamadas de Chat / Análise utilizando prioritariamente OpenAI GPT (BYOK).
 * Inclui auto-retry e fallback automático. Suporta string direta ou objeto ChatAiOptions.
 */
export async function chatAi(prompt: string): Promise<string>;
export async function chatAi(options: ChatAiOptions): Promise<{ content: string; provider: string }>;
export async function chatAi(
  optionsOrPrompt: ChatAiOptions | string,
): Promise<{ content: string; provider: string } | string> {
  const isString = typeof optionsOrPrompt === "string";
  const options: ChatAiOptions = isString
    ? { messages: [{ role: "user", content: optionsOrPrompt }] }
    : optionsOrPrompt;

  const {
    messages,
    model,
    jsonMode = false,
    temperature = 0.2,
    maxTokens,
    supabase,
    maxRetries = 3,
  } = options;

  const config = await getAiConfig(supabase);

  // ---------- OpenAI (BYOK) ----------
  if (config.openAiApiKey) {
    const chosenModel = model || config.chatModel || "gpt-4o";
    let lastError: any = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const body: Record<string, any> = {
          model: chosenModel,
          messages: messages.map((m) => ({
            role: m.role === "developer" ? "system" : m.role,
            content: m.content,
          })),
          temperature,
        };
        if (jsonMode) body.response_format = { type: "json_object" };
        if (maxTokens) body.max_tokens = maxTokens;

        const res = await fetch(`${config.openAiBaseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.openAiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          if (res.status === 429 && attempt < maxRetries) {
            await sleep(attempt * 2000);
            continue;
          }
          throw new Error(`OpenAI Chat falhou (${res.status}): ${errText.slice(0, 300)}`);
        }

        const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = json.choices?.[0]?.message?.content ?? "";
        // Atualiza timestamp para recarregar UI
        if (supabase) {
          const now = new Date().toISOString();
          await supabase.from("system_settings").upsert({ key: "ui_reload_timestamp", value: now }, { onConflict: "key" });
        }
        return isString ? (content.trim() as any) : { content: content.trim(), provider: "openai" };
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries) await sleep(attempt * 1500);
      }
    }
    if (!config.lovableApiKey) throw lastError || new Error("Falha na chamada de IA com OpenAI.");
  }

  // ---------- Ollama ----------
  if (config.provider === "ollama" && config.ollamaBaseUrl && config.ollamaModel) {
    const chosenModel = model || config.ollamaModel;
    let lastError: any = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const body: Record<string, any> = {
          model: chosenModel,
          messages: messages.map((m) => ({
            role: m.role === "developer" ? "system" : m.role,
            content: m.content,
          })),
          temperature,
        };
        if (jsonMode) body.response_format = { type: "json_object" };
        if (maxTokens) body.max_tokens = maxTokens;

        const res = await fetch(`${config.ollamaBaseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          if (res.status === 429 && attempt < maxRetries) {
            await sleep(attempt * 2000);
            continue;
          }
          throw new Error(`Ollama Chat falhou (${res.status}): ${errText.slice(0, 300)}`);
        }

        const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = json.choices?.[0]?.message?.content ?? "";
        if (supabase) {
          const now = new Date().toISOString();
          await supabase.from("system_settings").upsert({ key: "ui_reload_timestamp", value: now }, { onConflict: "key" });
        }
        return isString ? (content.trim() as any) : { content: content.trim(), provider: "ollama" };
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries) await sleep(attempt * 1500);
      }
    }
    if (!config.lovableApiKey) throw lastError || new Error("Falha na chamada de IA com Ollama.");
  }

  // ---------- Lovable fallback ----------
  if (config.lovableApiKey) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.lovableApiKey}`,
        "Content-Type": "application/json",
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: model ? (model.includes("/") ? model : `openai/${model}`) : "google/gemini-3-flash-preview",
        messages,
        response_format: jsonMode ? { type: "json_object" } : undefined,
        temperature,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (res.status === 402) {
        throw new Error(
          "Créditos de IA esgotados na plataforma Lovable. Configure uma chave própria OPENAI_API_KEY no painel para operação contínua e ilimitada.",
        );
      }
      throw new Error(`Falha na IA Lovable (${res.status}): ${errText.slice(0, 300)}`);
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "";
    if (supabase) {
      const now = new Date().toISOString();
      await supabase.from("system_settings").upsert({ key: "ui_reload_timestamp", value: now }, { onConflict: "key" });
    }
    return isString ? (content.trim() as any) : { content: content.trim(), provider: "lovable" };
  }

  throw new Error(
    "Nenhuma chave de IA configurada. Defina OPENAI_API_KEY nas variáveis de ambiente do backend ou no painel SuperAdmin.",
  );
}

/* ============================================================
 * PIPELINE DE ENTREGÁVEIS COMPLETOS (PÓS-ENTREVISTA)
 * ============================================================ */

export async function runAiPipeline(options: { systemPrompt: string; userPrompt: string; supabase?: SupabaseClient | null }): Promise<string> {
  const { systemPrompt, userPrompt, supabase } = options;
  const config = await getAiConfig(supabase);

  // Se OpenAI disponível, executa diretamente no GPT-4o com contexto completo de 128k tokens
  if (config.openAiApiKey) {
    const { content } = await chatAi({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "gpt-4o",
      jsonMode: true,
      temperature: 0.1,
      supabase,
    });
    return content;
  }

  // Fallback: endpoint de respostas Lovable
  if (config.lovableApiKey) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Lovable-API-Key": config.lovableApiKey,
        "Content-Type": "application/json",
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        reasoning: { effort: "medium", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        input: [
          { role: "developer", content: [{ type: "input_text", text: systemPrompt }] },
          { role: "user", content: [{ type: "input_text", text: userPrompt }] },
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (res.status === 402) {
        throw new Error(
          "Créditos de IA esgotados na plataforma Lovable. Adicione sua chave OPENAI_API_KEY para gerar entregáveis sem interrupções.",
        );
      }
      throw new Error(`Falha IA (${res.status}): ${txt.slice(0, 300)}`);
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "";
    return content;
  }

  throw new Error("Nenhuma chave de IA configurada para pipeline.");
}
