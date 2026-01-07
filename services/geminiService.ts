
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, Source } from "../types";

const MAX_RETRIES = 1; 
const INITIAL_RETRY_DELAY = 500;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES, delay = INITIAL_RETRY_DELAY): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error?.message?.includes('429') || error?.status === 429 || error?.message?.includes('RESOURCE_EXHAUSTED');
    if (isRateLimit && retries > 0) {
      await sleep(delay);
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const checkApiKey = async (): Promise<boolean> => {
  if (typeof window !== 'undefined' && (window as any).aistudio) {
    return await (window as any).aistudio.hasSelectedApiKey();
  }
  return false;
};

export const openApiKeySelector = async () => {
  if (typeof window !== 'undefined' && (window as any).aistudio) {
    await (window as any).aistudio.openSelectKey();
  }
};

const RECIPE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      cookingTime: { type: Type.STRING },
      difficulty: { 
        type: Type.STRING,
        description: "Zorluk seviyesi: 'Çok Kolay', 'Kolay', 'Orta' veya 'Zor' değerlerinden biri olmalı."
      },
      calories: { type: Type.STRING },
      category: { type: Type.STRING },
      videoUrl: { 
        type: Type.STRING, 
        description: "Yemeğin YouTube'daki en popüler ve kaliteli 'nasıl yapılır' videosunun linki. Mutlaka geçerli bir youtube.com veya youtu.be linki olmalı."
      },
      ingredients: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            amount: { type: Type.STRING }
          },
          required: ["name", "amount"]
        }
      },
      instructions: {
        type: Type.ARRAY,
        items: { 
          type: Type.STRING,
          description: "Hazırlanış adımları: Aşırı detaylı, püf noktaları içeren, teknikleri açıklayan profesyonel şef anlatımı."
        }
      }
    },
    required: ["id", "title", "description", "ingredients", "instructions", "cookingTime", "difficulty", "calories", "videoUrl"]
  }
};

const extractSources = (response: any): Source[] => {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return chunks
    .filter((chunk: any) => chunk.web && chunk.web.uri)
    .map((chunk: any) => ({
      uri: chunk.web.uri,
      title: chunk.web.title || "Kaynak"
    }));
};

export const analyzeIngredientsFromImage = async (base64Image: string, mimeType: string): Promise<string[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType
              }
            },
            {
              text: "Bu fotoğraftaki yiyecek malzemelerini tespit et. Sadece malzeme isimlerini virgülle ayırarak tek bir satırda yaz. Örn: Domates, Salatalık, Tavuk göğsü"
            }
          ]
        }
      ]
    });

    const text = response.text || "";
    return text.split(',').map(item => item.trim()).filter(item => item.length > 0);
  });
};

export const generateRecipesFromIngredients = async (ingredients: string[], mode: 'strict' | 'flexible', count: number = 8): Promise<Recipe[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const searchPrompt = mode === 'strict' 
      ? `HIZLI & GÜNCEL: SADECE şu malzemelerle yapılabilecek ${count} tarif bul: ${ingredients.join(', ')}. Popüler YouTube kanallarını ve yemek sitelerini tara. Her tarif için mutlaka çalışan bir YouTube video linki bul. JSON formatında dön.`
      : `HIZLI & GÜNCEL: Şu malzemeleri içeren en popüler ${count} tarifi bul: ${ingredients.join(', ')}. İnternetteki güncel ve sevilen YouTube videolarını ve tariflerini getir. Her tarif için mutlaka çalışan bir YouTube video linki bul. JSON formatında dön.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: searchPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: RECIPE_SCHEMA,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    const recipes: Recipe[] = JSON.parse(response.text || "[]");
    const sources = extractSources(response);
    
    return recipes.map(r => ({ ...r, sources }));
  });
};

export const generateChefRecommendations = async (type: 'meal' | 'dessert', count: number = 8): Promise<Recipe[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const categoryName = type === 'meal' ? 'Ana Yemek' : 'Tatlı';
    
    const prompt = `HIZLI & GÜNCEL: Türk mutfağından bugün için ${categoryName} kategorisinde ${count} trend tarif önerisi bul. YouTube üzerinde en çok izlenen ve beğenilen videoları referans alarak videoUrl kısmına linklerini ekle. JSON formatında dön.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: RECIPE_SCHEMA,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    const recipes: Recipe[] = JSON.parse(response.text || "[]");
    const sources = extractSources(response);
    
    return recipes.map(r => ({ ...r, sources }));
  });
};
