
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
  calories?: string;
  category?: string;
  sources?: Source[];
}

export type TabType = 'suggestions' | 'chef';
