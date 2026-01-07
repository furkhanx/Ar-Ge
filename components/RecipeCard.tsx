
import React from 'react';
import { Recipe } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: (recipe: Recipe) => void;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent, recipe: Recipe) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick, isFavorite, onToggleFavorite }) => {
  const getDifficultyColor = (difficulty: string) => {
    const d = difficulty.toLowerCase();
    if (d.includes('çok kolay') || d === 'kolay') return 'text-green-500 dark:text-green-400';
    if (d === 'orta') return 'text-yellow-500 dark:text-yellow-400';
    if (d === 'zor') return 'text-red-500 dark:text-red-400';
    return 'text-gray-400 dark:text-gray-500';
  };

  // Güvenilir bir kaynaktan (LoremFlickr) rastgele yemek fotoğrafı çek
  // HATA DÜZELTME: Title yerine Category kullanıyoruz. Çünkü karmaşık yemek isimleri (örn: Yoğurtlu Kebap)
  // LoremFlickr'da alakasız sonuç döndürebiliyor. Kategori (örn: Kebap, Tavuk, Tatlı) daha güvenli.
  const fallbackKeyword = recipe.category ? recipe.category.split(' ')[0] : 'food';
  const imageSrc = recipe.imageUrl || `https://loremflickr.com/800/600/${encodeURIComponent(fallbackKeyword)},food`;

  return (
    <div 
      onClick={() => onClick(recipe)}
      className="bg-white dark:bg-darkcard rounded-[1.5rem] shadow-md overflow-hidden border border-gray-100 dark:border-darkborder transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer group flex flex-col h-full"
    >
      {/* Görsel Alanı - Kartın Üst Kısmı */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
        <img 
            src={imageSrc} 
            alt={recipe.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={(e) => {
                // Fallback zinciri: Önce Unsplash source dene, olmazsa statik resim
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('images.unsplash.com')) {
                     target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop';
                }
            }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
        
        {/* Üstte Kategori ve Kalori Etiketleri */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {recipe.category && (
                <span className="backdrop-blur-md bg-white/30 text-white px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm">
                {recipe.category}
                </span>
            )}
        </div>
        
        {/* Süre ve Zorluk - Görsel Üzerinde */}
        <div className="absolute bottom-3 left-3 flex gap-3 text-white text-xs font-bold drop-shadow-md">
             <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg">
                <i className="fa-regular fa-clock text-white"></i>
                <span>{recipe.cookingTime}</span>
             </div>
             <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg">
                <i className={`fa-solid fa-signal ${getDifficultyColor(recipe.difficulty).replace('text-', 'text-')}`}></i>
                <span>{recipe.difficulty}</span>
             </div>
        </div>
      </div>

      {/* İçerik Alanı */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex-1">
             <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 leading-tight mb-2 group-hover:text-maroon dark:group-hover:text-red-400 transition-colors">
                {recipe.title}
            </h3>
            
            <div className="flex flex-wrap gap-2 mt-2">
                {recipe.calories && (
                    <span className="text-[10px] font-bold text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
                    <i className="fa-solid fa-fire-flame-curved mr-1"></i> {recipe.calories}
                    </span>
                )}
            </div>
        </div>
        
        {/* Alt Aksiyon Barı */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100 dark:border-darkborder">
             {/* Sol Alt: Favori Butonu */}
             <button 
                onClick={(e) => onToggleFavorite(e, recipe)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm border ${
                  isFavorite 
                    ? 'bg-red-500 text-white border-red-500' 
                    : 'bg-gray-50 dark:bg-darkbg text-gray-400 dark:text-gray-500 border-gray-200 dark:border-darkborder hover:text-red-500 hover:border-red-200'
                }`}
                aria-label="Favorilere Ekle"
              >
                <i className={`fa-${isFavorite ? 'solid' : 'regular'} fa-heart text-lg`}></i>
              </button>

             {/* Sağ Alt: Tarifi İncele */}
             <div className="flex items-center gap-2 group/btn">
                <span className="text-maroon dark:text-red-400 font-black text-xs uppercase tracking-widest group-hover/btn:underline">Tarifi İncele</span>
                <div className="w-8 h-8 rounded-full bg-maroon/10 dark:bg-maroon/20 flex items-center justify-center text-maroon dark:text-red-400 group-hover/btn:bg-maroon group-hover/btn:text-white transition-all">
                    <i className="fa-solid fa-arrow-right text-xs"></i>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
