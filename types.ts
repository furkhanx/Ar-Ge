
export interface Ingredient {
  name: string;
  amount: string;
}

export interface Source {
  uri: string;
  title: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string[];
  cookingTime: string;
  difficulty: 'Çok Kolay' | 'Kolay' | 'Orta' | 'Zor';
  videoUrl?: string; 
  imageUrl?: string;
  calories?: string;
  category?: string;
  dietaryTags?: string[];
  sources?: Source[];
  servings?: number;
  substitutions?: string[];
}

export type TabType = 'suggestions' | 'chef';

export interface FilterState {
  cuisine: string;
  mood: string;
  diet: string;
  // Yeni Filtreler
  mealType: string;      // Hangi Öğün
  cookingMethod: string; // Pişirme Türü
  prepTime: string;      // Hazırlama Süresi
  specialOccasion: string; // Özel Durumlar
}
