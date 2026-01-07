
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, Source, FilterState } from "../types";

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
        description: "Zorluk seviyesi: 'Çok Kolay', 'Kolay', 'Orta' veya 'Zor'."
      },
      calories: { type: Type.STRING },
      category: { type: Type.STRING },
      dietaryTags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Alerjen ve diyet bilgileri."
      },
      videoUrl: { 
        type: Type.STRING, 
        description: "Yemeğin YouTube'daki 'nasıl yapılır' videosunun linki."
      },
      imageUrl: {
        type: Type.STRING,
        description: "Yemeğin gerçek sunum fotoğrafı linki. Google Search aracı kullanılarak bulunmalıdır."
      },
      servings: {
        type: Type.NUMBER,
        description: "Bu tarifin kaç kişilik olduğu (varsayılan sayı)."
      },
      substitutions: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Eksik malzemeler için alternatif öneriler (örn: 'Soğan yerine pırasa kullanabilirsiniz')."
      },
      ingredients: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            amount: { 
              type: Type.STRING,
              description: "Miktar ve birim. Sayı ile başlamalıdır (örn: '2 adet', '500 gr')." 
            }
          },
          required: ["name", "amount"]
        }
      },
      instructions: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Tarifin hazırlanış adımları. Her adım çok detaylı, açıklayıcı ve püf noktalarıyla birlikte yazılmalıdır."
      }
    },
    required: ["id", "title", "description", "ingredients", "instructions", "cookingTime", "difficulty", "calories", "videoUrl", "dietaryTags", "servings"]
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
            { inlineData: { data: base64Image, mimeType: mimeType } },
            { text: "Bu fotoğraftaki yiyecek malzemelerini tespit et. Sadece malzeme isimlerini virgülle ayırarak tek bir satırda yaz." }
          ]
        }
      ]
    });
    const text = response.text || "";
    return text.split(',').map(item => item.trim()).filter(item => item.length > 0);
  });
};

export const generateRecipesFromIngredients = async (ingredients: string[], mode: 'strict' | 'flexible', filters: FilterState, category: string, count: number = 8): Promise<Recipe[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let contextPrompt = "";
    // Eski filtreler (fallback)
    if (filters.cuisine && filters.cuisine !== 'all') contextPrompt += ` Mutfak Kültürü: ${filters.cuisine}.`;
    if (filters.mood && filters.mood !== 'all') contextPrompt += ` Mod/Durum: ${filters.mood}.`;
    if (filters.diet && filters.diet !== 'all') contextPrompt += ` Diyet/Tercih: ${filters.diet}.`;
    
    // Yeni detaylı filtreler
    if (filters.mealType && filters.mealType !== 'all') contextPrompt += ` Öğün: ${filters.mealType}.`;
    if (filters.cookingMethod && filters.cookingMethod !== 'all') contextPrompt += ` Pişirme Yöntemi: ${filters.cookingMethod}.`;
    if (filters.prepTime && filters.prepTime !== 'all') contextPrompt += ` Hazırlama Süresi: ${filters.prepTime}.`;
    if (filters.specialOccasion && filters.specialOccasion !== 'all') contextPrompt += ` Özel Durum: ${filters.specialOccasion}.`;

    if (category && category !== 'Tüm Kategoriler') contextPrompt += ` ÖNEMLİ: Sadece '${category}' kategorisine uygun tarifler üret.`;

    const searchPrompt = mode === 'strict' 
      ? `HIZLI & GÜNCEL: SADECE şu malzemelerle yapılabilecek ${count} tarif bul: ${ingredients.join(', ')}.${contextPrompt} Popüler YouTube kanallarını tara ve çalışan link ekle. Google Search aracını kullanarak bu yemeğe ait GERÇEK bir fotoğraf URL'si bul ve 'imageUrl' alanına ekle (stok fotoğraf olmasın). Porsiyon bilgisini (sayı olarak) ekle. Hazırlanış adımlarını (instructions) maddeler halinde, çok detaylı, püf noktalarıyla ve kıvam bilgileriyle birlikte uzun uzun, açıklayıcı şekilde yaz. Eksik malzeme varsa 'substitutions' alanında alternatif öner. JSON dön.`
      : `HIZLI & GÜNCEL: Şu malzemeleri içeren en popüler ${count} tarifi bul: ${ingredients.join(', ')}.${contextPrompt} Mutlaka çalışan YouTube linki ekle. Google Search aracını kullanarak bu yemeğe ait GERÇEK bir fotoğraf URL'si bul ve 'imageUrl' alanına ekle. Porsiyon bilgisini (sayı olarak) ekle. Hazırlanış adımlarını (instructions) maddeler halinde, çok detaylı, püf noktalarıyla ve kıvam bilgileriyle birlikte uzun uzun, açıklayıcı şekilde yaz. Eksik malzeme varsa 'substitutions' alanında alternatif öner. JSON dön.`;

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

export const generateChefRecommendations = async (type: 'meal' | 'dessert' | 'savory', filters: FilterState, count: number = 8): Promise<Recipe[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let categoryName = '';
    
    switch(type) {
        case 'meal': categoryName = 'Ana Yemek'; break;
        case 'dessert': categoryName = 'Tatlı'; break;
        case 'savory': categoryName = 'Tuzlu Atıştırmalık/Börek/Poğaça'; break;
    }

    let contextPrompt = "";
    if (filters.cuisine && filters.cuisine !== 'all') contextPrompt += ` Mutfak Kültürü: ${filters.cuisine}.`;
    if (filters.mood && filters.mood !== 'all') contextPrompt += ` Mod/Durum: ${filters.mood}.`;
    if (filters.diet && filters.diet !== 'all') contextPrompt += ` Diyet/Tercih: ${filters.diet}.`;
    
    const prompt = `HIZLI & GÜNCEL: Bugün için ${categoryName} kategorisinde ${count} trend tarif önerisi bul.${contextPrompt} YouTube videolarını ekle. Google Search aracını kullanarak her yemeğe ait GERÇEK bir fotoğraf URL'si bul ve 'imageUrl' alanına ekle. Porsiyon bilgisini ekle. Hazırlanış adımlarını (instructions) maddeler halinde, çok detaylı, püf noktalarıyla ve kıvam bilgileriyle birlikte uzun uzun, açıklayıcı şekilde yaz. JSON dön.`;

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
