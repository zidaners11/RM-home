
import { GoogleGenAI } from "@google/genai";

/**
 * NEXUS API KEY BRIDGE
 * Intenta obtener la clave de múltiples fuentes para máxima compatibilidad en Docker.
 */
const getApiKey = () => {
  // 1. Prioridad: Ajustes manuales guardados por el usuario en la web
  const manualKey = localStorage.getItem('nexus_manual_api_key');
  if (manualKey) return manualKey;

  // 2. Prioridad: Inyección dinámica de Docker (window.NEXUS_CONFIG)
  const runtimeKey = (window as any).NEXUS_CONFIG?.API_KEY;
  if (runtimeKey) return runtimeKey;

  // 3. Prioridad: Variables de entorno de Vite (Compilación)
  // @ts-ignore
  const viteKey = import.meta.env?.VITE_API_KEY;
  if (viteKey) return viteKey;

  // 4. Prioridad: Proceso de node (Fallback)
  const buildTimeKey = process.env.API_KEY;
  
  return buildTimeKey;
};

export async function getGlobalNexusStatus(homeData: any) {
  const apiKey = getApiKey();
  
  if (!apiKey || apiKey === "undefined" || apiKey.length < 10) {
    console.warn("[NEXUS AI] API_KEY no configurada o inválida.");
    return { 
      text: "ERROR DE PROTOCOLO: El Núcleo Estratégico no tiene una API_KEY válida. Revisa la configuración del contenedor o los Ajustes de la web.", 
      sources: [] 
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `Eres el RM Home Strategic Core. 
    Tu misión es proporcionar un informe ejecutivo de 360 grados.
    Debes incluir:
    1. Un resumen del estado del hogar (alarmas, alertas, energía solar).
    2. Las noticias más importantes del día en España.
    3. Resultados o noticias clave de La Liga española de fútbol.
    
    Usa un tono sofisticado, futurista y muy conciso (máximo 120 palabras).
    Estructura la respuesta con breves titulares.`;

    const prompt = `Analiza los siguientes datos internos: ${JSON.stringify(homeData)}.
    Utiliza tus herramientas de búsqueda para obtener las noticias de hoy en España y la actualidad de La Liga.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return {
      text: response.text || "Enlace establecido, pero la respuesta ha sido interceptada.",
      sources: sources
    };
  } catch (error: any) {
    console.error("RM Home AI Error:", error);
    let errorMsg = "Protocolos de comunicación externa limitados.";
    if (error.message?.includes('API_KEY_INVALID')) errorMsg = "ERROR: La API_KEY proporcionada no es válida.";
    if (error.message?.includes('quota')) errorMsg = "ALERTA: Cuota de IA agotada para este minuto.";
    
    return { 
      text: errorMsg,
      sources: [] 
    };
  }
}

export async function getHomeInsights(data: any) {
  const apiKey = getApiKey();
  if (!apiKey) return "Sistemas desconectados. Error de autenticación.";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `Actúa como el cerebro de RM Home. 
    Analiza la telemetría actual y la configuración personalizada del usuario.
    Sé carismático, sofisticado y breve (máximo 60 palabras).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Datos de telemetría: ${JSON.stringify(data)}`,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
      },
    });

    return response.text;
  } catch (error) {
    return "Sistemas de análisis en recalibración.";
  }
}

export async function getFinanceInsights(financeData: any) {
  const apiKey = getApiKey();
  if (!apiKey) return "Análisis financiero offline.";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `Actúa como el RM Home Financial Advisor.
    Analiza datos financieros con precisión. Sé extremadamente conciso (máximo 80 palabras).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analiza este informe: ${JSON.stringify(financeData)}`,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text;
  } catch (error) {
    return "Error al procesar flujos de capital.";
  }
}
