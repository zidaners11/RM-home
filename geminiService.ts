
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getGlobalNexusStatus(homeData: any) {
  try {
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
      text: response.text,
      sources: sources
    };
  } catch (error) {
    console.error("RM Home AI Error:", error);
    return { text: "Protocolos de comunicación externa limitados. RM Home está operando en modo local seguro." };
  }
}

export async function getHomeInsights(data: any) {
  try {
    const systemInstruction = `Actúa como el cerebro de RM Home. 
    Analiza la telemetría actual y la configuración personalizada del usuario.
    Sé carismático, sofisticado y breve (máximo 60 palabras).
    Usa un tono que encaje con una estética celestial/espacial.`;

    const prompt = `Datos de telemetría: ${JSON.stringify(data)}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
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
  try {
    const systemInstruction = `Actúa como el RM Home Financial Advisor.
    Analiza datos financieros con precisión. Sé extremadamente conciso y directo (máximo 100 palabras).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analiza estos datos financieros: ${JSON.stringify(financeData)}`,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    return response.text;
  } catch (error) {
    return "Protocolos financieros bajo mantenimiento.";
  }
}
