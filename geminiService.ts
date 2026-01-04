
import { GoogleGenAI } from "@google/genai";

// Se utiliza exclusivamente process.env.API_KEY para la inicialización según las directrices.
// El cliente se instancia dentro de cada función para garantizar el uso de la clave más reciente (p. ej., tras un cambio en el selector).

export async function getGlobalNexusStatus(homeData: any) {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined") {
    return { 
      text: "ERROR: No se ha detectado una API Key activa. Por favor, selecciona una clave de un proyecto con facturación activa para habilitar el núcleo estratégico.", 
      sources: [],
      needsKey: true 
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    // Usamos Flash para el estado general por mayor velocidad
    const modelName = 'gemini-3-flash-preview'; 
    
    const systemInstruction = `Eres RM Home Strategic Core, una IA integrada en un entorno de hogar inteligente con estética de nebulosa espacial.
    Analiza los datos y responde con autoridad, elegancia y brevedad (máx 100 palabras).
    Resumen de estado + 1 dato clave de La Liga o noticias de España.`;

    const prompt = `Telemetría actual: ${JSON.stringify(homeData)}. Escanea noticias actuales y fútbol en España.`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return {
      text: response.text || "Enlace establecido. Sistemas nominales.",
      sources: sources,
      needsKey: false
    };
  } catch (error: any) {
    console.error("RM Home AI Error Details:", error);
    
    let userMessage = "Error de enlace con el núcleo de IA.";
    const isAuthError = error.message?.includes('API_KEY') || 
                       error.message?.includes('403') || 
                       error.message?.includes('Requested entity was not found');
    
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      userMessage = "El modelo solicitado no está disponible en tu región o clave.";
    } else if (error.message?.includes('API_KEY_INVALID')) {
      userMessage = "La API Key proporcionada es inválida o ha expirado.";
    } else if (error.message?.includes('quota')) {
      userMessage = "Límite de peticiones alcanzado. Reintentando en 60s...";
    } else {
      userMessage = `Interrupción de protocolo: ${error.message.substring(0, 50)}...`;
    }
    
    return { 
      text: userMessage, 
      sources: [],
      needsKey: isAuthError
    };
  }
}

export async function getHomeInsights(data: any) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "Sistema en modo offline.";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analiza esta telemetría y da un consejo breve: ${JSON.stringify(data)}`,
      config: {
        systemInstruction: "Eres el cerebro táctico de una base espacial. Sé breve y carismático.",
        temperature: 0.8,
      },
    });
    return response.text;
  } catch (error) {
    return "Analizando flujos de datos...";
  }
}

// Fix: Implementación y exportación de getFinanceInsights para corregir el error de importación en FinanceView.tsx
export async function getFinanceInsights(financeData: any) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "Análisis financiero offline.";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analiza estos datos financieros: ${JSON.stringify(financeData)}`,
      config: {
        systemInstruction: "Eres un analista financiero avanzado de la estación RM Home. Proporciona una visión táctica sobre los presupuestos, gastos y ahorros. Sé breve, directo y futurista.",
        temperature: 0.7,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Finance AI Insight Error:", error);
    return "Error en la matriz de análisis financiero.";
  }
}
