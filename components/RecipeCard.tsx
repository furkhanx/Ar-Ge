
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

  return (
    <div 
      onClick={() => onClick(recipe)}
      className="bg-white dark:bg-darkcard rounded-2xl shadow-md overflow-hidden border border-gray-100 dark:border-darkborder transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer group relative flex flex-col h-full"
    >
      <button 
        onClick={(e) => onToggleFavorite(e, recipe)}
        className={`absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md ${
          isFavorite ? 'bg-red-500 text-white' : 'bg-white/80 dark:bg-darkbg/80 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 backdrop-blur-sm'
        }`}
        aria-label="Favori"
      >
        <i className={`fa-${isFavorite ? 'solid' : 'regular'} fa-heart`}></i>
      </button>

      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-2 pr-10">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-maroon dark:group-hover:text-red-400 transition-colors line-clamp-1">
            {recipe.title}
          </h3>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-2">
          {recipe.category && (
            <span className="inline-block px-2 py-0.5 bg-maroon/5 dark:bg-maroon/20 text-maroon dark:text-red-300 text-[10px] font-bold rounded uppercase tracking-wider">
              {recipe.category}
            </span>
          )}
          {recipe.calories && (
            <span className="inline-block px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300 text-[10px] font-bold rounded uppercase tracking-wider">
              <i className="fa-solid fa-fire-flame-curved mr-1"></i>
              {recipe.calories}
            </span>
          )}
        </div>

        <p className="hidden md:block text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2">
          {recipe.description}
        </p>
        
        <div className="flex items-center gap-4 text-xs font-medium text-gray-400 dark:text-gray-500 mt-auto">
          <div className="flex items-center gap-1.5">
            <i className="fa-regular fa-clock text-maroon dark:text-red-400"></i>
            <span>{recipe.cookingTime}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <i className={`fa-solid fa-signal ${getDifficultyColor(recipe.difficulty)}`}></i>
            <span>{recipe.difficulty}</span>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 dark:bg-black/20 px-5 py-3 border-t border-gray-100 dark:border-darkborder flex justify-between items-center mt-auto">
        <span className="text-maroon dark:text-red-400 font-bold text-xs uppercase tracking-widest group-hover:underline">Tarifi İncele</span>
        <i className="fa-solid fa-arrow-right-long text-maroon dark:text-red-400 text-xs transition-transform group-hover:translate-x-1"></i>
      </div>
    </div>
  );
};

export default RecipeCard;
