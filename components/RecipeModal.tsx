
import React from 'react';
import { Recipe } from '../types';

interface RecipeModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent | null, recipe: Recipe) => void;
}

const RecipeModal: React.FC<RecipeModalProps> = ({ recipe, onClose, isFavorite, onToggleFavorite }) => {
  if (!recipe) return null;

  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = getYouTubeId(recipe.videoUrl || '');

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-ivory dark:bg-darkbg w-full max-w-5xl h-full md:h-auto md:max-h-[95vh] rounded-none md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-scaleUp border-none md:border border-white/10 relative transition-all duration-300">
        
        <button 
          onClick={onClose}
          className="md:hidden absolute top-4 right-4 z-[120] w-10 h-10 bg-white/90 dark:bg-darkcard/90 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center border border-gray-100 dark:border-darkborder"
          aria-label="Kapat"
        >
          <i className="fa-solid fa-xmark text-xl text-maroon"></i>
        </button>

        <div className="px-6 md:px-8 py-4 md:py-6 border-b border-gray-200 dark:border-darkborder flex justify-between items-center sticky top-0 bg-ivory dark:bg-darkbg z-20 shadow-sm">
          <div className="flex-1 pr-10 md:pr-0">
            <div className="flex items-center gap-3 md:gap-4">
              <h2 className="text-xl md:text-2xl font-black text-maroon dark:text-red-500 leading-tight">{recipe.title}</h2>
              <button 
                onClick={() => onToggleFavorite(null, recipe)}
                className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all shadow-sm flex-shrink-0 ${
                  isFavorite ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-darkcard text-gray-400 dark:text-gray-500 hover:text-red-500'
                }`}
              >
                <i className={`fa-${isFavorite ? 'solid' : 'regular'} fa-heart`}></i>
              </button>
            </div>
            <div className="flex gap-2 md:gap-3 mt-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
               <span className="text-[9px] md:text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest bg-gray-100 dark:bg-darkcard px-2.5 py-1 rounded shadow-sm">{recipe.category || 'Genel'}</span>
               <span className="text-[9px] md:text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest bg-gray-100 dark:bg-darkcard px-2.5 py-1 rounded shadow-sm">{recipe.cookingTime}</span>
               <span className="text-[9px] md:text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest bg-gray-100 dark:bg-darkcard px-2.5 py-1 rounded shadow-sm">{recipe.difficulty}</span>
            </div>
          </div>
          <button onClick={onClose} className="hidden md:flex w-12 h-12 rounded-2xl hover:bg-gray-200/50 dark:hover:bg-darkborder items-center justify-center transition-all group ml-4">
            <i className="fa-solid fa-times text-2xl text-gray-400 group-hover:text-maroon transition-colors"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-8">
              {/* Video Bölümü */}
              {videoId && (
                <div className="bg-black rounded-3xl overflow-hidden shadow-2xl aspect-video border-4 border-white dark:border-darkcard">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title={`${recipe.title} Video`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              )}

              <div className="bg-white dark:bg-darkcard p-6 md:p-8 rounded-[2rem] border border-gray-100 dark:border-darkborder shadow-sm relative overflow-hidden transition-colors">
                <h3 className="font-black text-gray-900 dark:text-gray-100 mb-6 flex items-center text-lg">
                  <span className="w-9 h-9 rounded-xl bg-maroon/10 text-maroon flex items-center justify-center mr-3"><i className="fa-solid fa-list-ul"></i></span>
                  Malzemeler
                </h3>
                <ul className="space-y-4">
                  {recipe.ingredients.map((ing, idx) => (
                    <li key={idx} className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-darkborder pb-4 last:border-0 last:pb-0 gap-4">
                      <span className="text-gray-700 dark:text-gray-300 font-bold">{ing.name}</span>
                      <span className="bg-maroon/5 dark:bg-maroon/20 px-3 py-1.5 rounded-lg text-maroon dark:text-red-300 font-black text-[10px] tracking-wider uppercase whitespace-nowrap">{ing.amount}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {recipe.sources && recipe.sources.length > 0 && (
                <div className="bg-white dark:bg-darkcard p-6 md:p-8 rounded-[2rem] border border-gray-100 dark:border-darkborder shadow-sm transition-colors">
                  <h3 className="font-black text-gray-900 dark:text-gray-100 mb-5 flex items-center text-sm"><i className="fa-solid fa-earth-americas text-maroon dark:text-red-400 mr-2"></i> Kaynaklar</h3>
                  <div className="flex flex-wrap gap-2">
                    {recipe.sources.map((src, idx) => (
                      <a key={idx} href={src.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-maroon dark:text-red-400 bg-maroon/5 dark:bg-maroon/10 px-4 py-2 rounded-xl hover:bg-maroon hover:text-white dark:hover:bg-red-500 dark:hover:text-white transition-all shadow-sm">
                        {src.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="bg-white/40 dark:bg-darkcard/30 p-2 md:p-4 rounded-[2.5rem] border border-transparent dark:border-darkborder transition-colors">
              <h3 className="font-black text-gray-900 dark:text-gray-100 mb-8 flex items-center text-lg pl-2">
                <span className="w-9 h-9 rounded-xl bg-maroon/10 text-maroon flex items-center justify-center mr-3"><i className="fa-solid fa-kitchen-set"></i></span>
                Hazırlanış Adımları
              </h3>
              <div className="space-y-8">
                {recipe.instructions.map((step, idx) => (
                  <div key={idx} className="flex gap-4 md:gap-6 group/step">
                    <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-white dark:bg-darkcard border-2 border-maroon/10 dark:border-darkborder text-maroon dark:text-red-400 flex items-center justify-center font-black text-sm shadow-sm group-hover/step:bg-maroon group-hover/step:text-white dark:group-hover/step:bg-red-500 transition-all">
                      {idx + 1}
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-bold text-[14px] md:text-[15px] pt-2">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 dark:border-darkborder text-center text-[10px] text-gray-400 dark:text-gray-500 bg-white dark:bg-darkcard font-black uppercase tracking-[0.3em] transition-colors">AFİYET OLSUN</div>
      </div>
    </div>
  );
};

export default RecipeModal;
