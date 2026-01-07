
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Recipe, TabType } from './types';
import { 
  generateRecipesFromIngredients, 
  generateChefRecommendations, 
  checkApiKey, 
  openApiKeySelector,
  analyzeIngredientsFromImage
} from './services/geminiService';
import RecipeCard from './components/RecipeCard';
import RecipeModal from './components/RecipeModal';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('suggestions');
  const [chefCategory, setChefCategory] = useState<'meal' | 'dessert'>('meal');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [chefRecipes, setChefRecipes] = useState<Recipe[]>([]);
  const [chefDesserts, setChefDesserts] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [scanningImage, setScanningImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [isFavPanelOpen, setIsFavPanelOpen] = useState(false);
  const [searchTitle, setSearchTitle] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchMode, setSearchMode] = useState<'strict' | 'flexible' | null>(null);
  
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedMode = localStorage.getItem('yemektarifleri_darkmode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedMode === 'true' || (savedMode === null && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }

    const saved = localStorage.getItem('yemektarifleri_favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        setFavorites([]);
      }
    }
    checkApiKey().then(setIsApiKeySet);
  }, []);

  useEffect(() => {
    localStorage.setItem('yemektarifleri_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('yemektarifleri_darkmode', String(newMode));
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    if (activeTab === 'chef') {
      fetchChefData();
    }
  }, [activeTab, chefCategory]);

  const fetchChefData = async (append = false) => {
    if (!append && chefCategory === 'meal' && chefRecipes.length > 0) return;
    if (!append && chefCategory === 'dessert' && chefDesserts.length > 0) return;

    const count = append ? 4 : 8;
    if (append) setLoadingMore(true);
    else {
      setLoading(true);
      setSearchTitle(chefCategory === 'meal' ? 'Günün Yemekleri' : 'Günün Tatlıları');
    }
    
    setError(null);
    try {
      const data = await generateChefRecommendations(chefCategory, count);
      if (chefCategory === 'meal') {
        setChefRecipes(prev => append ? [...prev, ...data] : data);
      } else {
        setChefDesserts(prev => append ? [...prev, ...data] : data);
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleError = (err: any) => {
    const isRateLimit = err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED');
    if (isRateLimit) {
      setError("Şu an çok yoğunluk var. Lütfen biraz bekleyip tekrar deneyin.");
    } else {
      setError("Bir hata oluştu. Lütfen bağlantınızı kontrol edin.");
    }
  };

  const handleAddIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInput.trim()) return;
    const parts = currentInput.split(/[\s,]+/).map(p => p.trim()).filter(p => p && !ingredients.includes(p));
    setIngredients([...ingredients, ...parts]);
    setCurrentInput('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanningImage(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const identified = await analyzeIngredientsFromImage(base64String, file.type);
        if (identified.length > 0) {
          setIngredients(prev => [...new Set([...prev, ...identified])]);
        } else {
          setError("Malzeme tespit edilemedi.");
        }
        setScanningImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      handleError(err);
      setScanningImage(false);
    }
  };

  const isRecipeFavorite = (recipe: Recipe) => {
    return favorites.some(f => f.id === recipe.id || f.title.toLowerCase() === recipe.title.toLowerCase());
  };

  const toggleFavorite = (e: React.MouseEvent | null, recipe: Recipe) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
      const isAlreadyFav = prev.some(f => f.id === recipe.id || f.title.toLowerCase() === recipe.title.toLowerCase());
      if (isAlreadyFav) {
        return prev.filter(f => f.id !== recipe.id && f.title.toLowerCase() !== recipe.title.toLowerCase());
      } else {
        return [...prev, recipe];
      }
    });
  };

  const currentRecipeList = activeTab === 'suggestions' ? recipes : (chefCategory === 'meal' ? chefRecipes : chefDesserts);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    currentRecipeList.forEach(r => { if (r.category) cats.add(r.category); });
    return Array.from(cats);
  }, [currentRecipeList]);

  const filteredRecipes = useMemo(() => {
    let list = [...currentRecipeList];
    if (difficultyFilter !== 'all') {
      list = list.filter(r => r.difficulty === difficultyFilter);
    }
    if (categoryFilter !== 'all') {
      list = list.filter(r => r.category === categoryFilter);
    }
    const difficultyOrder = { 'Çok Kolay': 0, 'Kolay': 1, 'Orta': 2, 'Zor': 3 };
    return list.sort((a, b) => (difficultyOrder[a.difficulty] ?? 4) - (difficultyOrder[b.difficulty] ?? 4));
  }, [currentRecipeList, difficultyFilter, categoryFilter]);

  const findRecipes = async (mode: 'strict' | 'flexible', append = false) => {
    if (ingredients.length === 0) return;
    
    const count = append ? 4 : 8;
    if (append) setLoadingMore(true);
    else {
      setLoading(true);
      setRecipes([]);
      setSearchMode(mode);
      setSearchTitle(mode === 'strict' ? 'Evdeki malzemelerle tarifler' : 'Esnek Tarifler');
    }
    
    setError(null);
    try {
      const results = await generateRecipesFromIngredients(ingredients, mode, count);
      setRecipes(prev => append ? [...prev, ...results] : results);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (activeTab === 'suggestions' && searchMode) {
      findRecipes(searchMode, true);
    } else if (activeTab === 'chef') {
      fetchChefData(true);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-32 transition-all duration-400 min-h-screen">
      <header className="relative mb-10 pt-2">
        <div className="flex flex-row items-center justify-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-12 md:h-12 bg-maroon text-white rounded-lg md:rounded-xl flex items-center justify-center text-base md:text-2xl shadow-xl rotate-3 flex-shrink-0">
            <i className="fa-solid fa-utensils"></i>
          </div>
          <h1 className="text-xl md:text-4xl font-black text-gray-900 dark:text-white text-center leading-tight">
            Bugün Ne <span className="text-maroon">Yemek</span> Yapsam?
          </h1>
        </div>
        <div className="flex justify-center mt-1 md:mt-2">
          <div className="w-12 md:w-16 h-1 bg-maroon/20 rounded-full"></div>
        </div>
        
        <button 
          onClick={toggleDarkMode}
          className="absolute top-0 right-0 md:-top-2 w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white dark:bg-darkcard shadow-lg flex items-center justify-center text-base md:text-lg transition-all hover:scale-110 active:scale-90 border border-gray-100 dark:border-darkborder"
          aria-label="Tema Değiştir"
        >
          {isDarkMode ? <i className="fa-solid fa-sun text-yellow-400"></i> : <i className="fa-solid fa-moon text-maroon"></i>}
        </button>
      </header>

      <nav className="flex justify-center mb-8 md:mb-10 gap-2 p-1 bg-white/70 dark:bg-darkcard/70 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-lg border border-gray-100 dark:border-darkborder max-w-[240px] md:max-w-xs mx-auto">
        <button 
          onClick={() => { setActiveTab('suggestions'); setRecipes([]); setSearchTitle(null); setSearchMode(null); setDifficultyFilter('all'); setCategoryFilter('all'); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 md:py-2.5 rounded-lg md:rounded-xl font-black transition-all text-[10px] md:text-xs ${activeTab === 'suggestions' ? 'bg-maroon text-white shadow-xl' : 'text-gray-500 dark:text-gray-400 hover:text-maroon dark:hover:text-maroon'}`}
        >
          <i className="fa-solid fa-wand-magic-sparkles"></i> Tarif Bul
        </button>
        <button 
          onClick={() => { setActiveTab('chef'); setDifficultyFilter('all'); setCategoryFilter('all'); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 md:py-2.5 rounded-lg md:rounded-xl font-black transition-all text-[10px] md:text-xs ${activeTab === 'chef' ? 'bg-maroon text-white shadow-xl' : 'text-gray-500 dark:text-gray-400 hover:text-maroon dark:hover:text-maroon'}`}
        >
          <i className="fa-solid fa-chef-hat"></i> Şef
        </button>
      </nav>

      <main>
        {activeTab === 'suggestions' && (
          <div className="space-y-8 md:space-y-10 animate-fadeIn">
            <div className="bg-white dark:bg-darkcard p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-xl border border-gray-50 dark:border-darkborder max-w-sm md:max-w-lg mx-auto">
              <h2 className="text-base md:text-lg font-black mb-4 md:mb-5 flex items-center text-gray-800 dark:text-gray-100">
                <span className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-maroon/10 text-maroon flex items-center justify-center mr-3">
                  <i className="fa-solid fa-basket-shopping"></i>
                </span>
                Malzemelerinizi Ekleyin
              </h2>
              <div className="flex flex-col gap-4 md:gap-5">
                <form onSubmit={handleAddIngredient} className="flex gap-1.5 md:gap-2">
                  <input 
                    type="text" 
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    placeholder="Örn: Tavuk, Krema..."
                    className="flex-1 py-2.5 px-4 md:py-3 md:px-5 rounded-lg md:rounded-xl bg-gray-50 dark:bg-darkbg border-2 border-transparent focus:border-maroon focus:outline-none transition-all font-bold text-gray-900 dark:text-white shadow-inner text-sm md:text-base"
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="bg-white dark:bg-darkbg border border-maroon/20 text-maroon w-10 md:w-12 flex items-center justify-center rounded-lg md:rounded-xl hover:bg-maroon hover:text-white transition-all shadow-sm"
                  >
                    {scanningImage ? <i className="fa-solid fa-circle-notch animate-spin text-sm"></i> : <i className="fa-solid fa-camera text-sm md:text-base"></i>}
                  </button>
                  <button 
                    type="submit" 
                    className="bg-maroon text-white px-4 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl font-black hover:shadow-lg transition-all active:scale-95 shadow-md text-xs md:text-sm uppercase tracking-wide"
                  >
                    EKLE
                  </button>
                </form>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                
                {ingredients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 md:gap-2 p-2.5 md:p-3 bg-gray-50/50 dark:bg-white/5 rounded-lg md:rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                    {ingredients.map(ing => (
                      <div key={ing} className="bg-white dark:bg-darkcard text-maroon dark:text-red-400 px-2.5 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg font-bold text-[10px] md:text-xs flex items-center gap-1.5 md:gap-2 border border-maroon/10 shadow-sm transition-all hover:border-maroon/30 group">
                        {ing}
                        <button onClick={() => setIngredients(ingredients.filter(i => i !== ing))} className="text-gray-300 group-hover:text-red-500 transition-colors"><i className="fa-solid fa-circle-xmark"></i></button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 mt-1">
                  <button onClick={() => findRecipes('strict')} disabled={ingredients.length === 0 || loading} className="py-2.5 md:py-3 px-4 bg-white dark:bg-darkbg border border-maroon/20 text-maroon dark:text-red-400 font-black text-[10px] md:text-xs rounded-lg md:rounded-xl hover:border-maroon transition-all disabled:opacity-50 shadow-sm flex items-center justify-center gap-2">
                    <i className="fa-solid fa-filter"></i> Sadece Bunlarla
                  </button>
                  <button onClick={() => findRecipes('flexible')} disabled={ingredients.length === 0 || loading} className="py-2.5 md:py-3 px-4 bg-maroon text-white font-black text-[10px] md:text-xs rounded-lg md:rounded-xl shadow-lg hover:shadow-maroon/20 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    <i className="fa-solid fa-wand-magic-sparkles"></i> Esnek Tarifler
                  </button>
                </div>
              </div>
            </div>

            {loading && !loadingMore && (
              <div className="flex flex-col items-center py-12 md:py-20">
                <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-maroon border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-black text-maroon animate-pulse text-sm md:text-base">Hazırlanıyor...</p>
              </div>
            )}

            {recipes.length > 0 && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                  <h3 className="text-lg md:text-xl font-black border-l-4 border-maroon pl-3 text-gray-900 dark:text-gray-100">{searchTitle}</h3>
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <select 
                      value={difficultyFilter} 
                      onChange={(e) => setDifficultyFilter(e.target.value)}
                      className="flex-1 md:flex-none py-2 px-3 md:px-4 rounded-lg bg-white dark:bg-darkcard border border-gray-100 dark:border-darkborder text-[10px] md:text-xs font-bold focus:outline-none text-gray-900 dark:text-gray-100 cursor-pointer shadow-sm"
                    >
                      <option value="all">Zorluk</option>
                      <option value="Çok Kolay">Çok Kolay</option>
                      <option value="Kolay">Kolay</option>
                      <option value="Orta">Orta</option>
                      <option value="Zor">Zor</option>
                    </select>
                    <select 
                      value={categoryFilter} 
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="flex-1 md:flex-none py-2 px-3 md:px-4 rounded-lg bg-white dark:bg-darkcard border border-gray-100 dark:border-darkborder text-[10px] md:text-xs font-bold focus:outline-none text-gray-900 dark:text-gray-100 cursor-pointer shadow-sm"
                    >
                      <option value="all">Kategori</option>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {filteredRecipes.map(recipe => (
                    <RecipeCard key={recipe.id} recipe={recipe} onClick={setSelectedRecipe} isFavorite={isRecipeFavorite(recipe)} onToggleFavorite={toggleFavorite} />
                  ))}
                </div>
                <div className="flex justify-center pt-6 pb-10">
                   <button 
                    onClick={handleLoadMore}
                    disabled={loadingMore || loading}
                    className="flex items-center gap-2 px-8 md:px-10 py-2.5 md:py-3 bg-white dark:bg-darkcard border-2 border-maroon/10 dark:border-darkborder text-maroon dark:text-red-400 font-black rounded-xl hover:bg-maroon hover:text-white transition-all shadow-lg text-xs md:text-sm disabled:opacity-50"
                   >
                     {loadingMore ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-plus"></i>}
                     Daha Fazla
                   </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'chef' && (
          <div className="space-y-8 md:space-y-10 animate-fadeIn">
            <div className="flex flex-col items-center">
              <div className="inline-flex p-1 bg-white/60 dark:bg-darkcard/60 rounded-xl border border-gray-100 dark:border-darkborder mb-6 shadow-sm">
                <button onClick={() => setChefCategory('meal')} className={`px-5 md:px-6 py-2 rounded-lg text-[10px] md:text-xs font-black transition-all ${chefCategory === 'meal' ? 'bg-maroon text-white shadow-md' : 'text-gray-500 dark:text-gray-400'}`}>Yemekler</button>
                <button onClick={() => setChefCategory('dessert')} className={`px-5 md:px-6 py-2 rounded-lg text-[10px] md:text-xs font-black transition-all ${chefCategory === 'dessert' ? 'bg-maroon text-white shadow-md' : 'text-gray-500 dark:text-gray-400'}`}>Tatlılar</button>
              </div>
            </div>

            {loading && !loadingMore ? (
              <div className="flex flex-col items-center py-12 md:py-20">
                <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-maroon border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-black text-maroon animate-pulse text-sm md:text-base">Seçiliyor...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                  <h3 className="text-lg md:text-xl font-black border-l-4 border-maroon pl-3 text-gray-900 dark:text-gray-100">{searchTitle}</h3>
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)} className="py-2 px-3 md:px-4 rounded-lg bg-white dark:bg-darkcard border border-gray-100 dark:border-darkborder text-[10px] md:text-xs font-bold text-gray-900 dark:text-gray-100 cursor-pointer shadow-sm">
                      <option value="all">Zorluk Seç</option>
                      <option value="Çok Kolay">Çok Kolay</option>
                      <option value="Kolay">Kolay</option>
                      <option value="Orta">Orta</option>
                      <option value="Zor">Zor</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {filteredRecipes.map(recipe => (
                    <RecipeCard key={recipe.id} recipe={recipe} onClick={setSelectedRecipe} isFavorite={isRecipeFavorite(recipe)} onToggleFavorite={toggleFavorite} />
                  ))}
                </div>
                <div className="flex justify-center pt-6 pb-10">
                   <button 
                    onClick={handleLoadMore}
                    disabled={loadingMore || loading}
                    className="flex items-center gap-2 px-8 md:px-10 py-2.5 md:py-3 bg-white dark:bg-darkcard border-2 border-maroon/10 dark:border-darkborder text-maroon dark:text-red-400 font-black rounded-xl hover:bg-maroon hover:text-white transition-all shadow-lg text-xs md:text-sm disabled:opacity-50"
                   >
                     {loadingMore ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-plus"></i>}
                     Daha Fazla
                   </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <RecipeModal 
        recipe={selectedRecipe} 
        onClose={() => setSelectedRecipe(null)} 
        isFavorite={selectedRecipe ? isRecipeFavorite(selectedRecipe) : false}
        onToggleFavorite={toggleFavorite}
      />

      <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ${isFavPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setIsFavPanelOpen(false)}></div>
        <div className={`absolute top-0 right-0 w-full max-w-sm h-full bg-ivory dark:bg-darkbg shadow-2xl transition-transform duration-500 transform ${isFavPanelOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
          <div className="p-5 border-b border-gray-200 dark:border-darkborder flex justify-between items-center bg-white dark:bg-darkcard shadow-sm">
            <h2 className="text-lg font-black flex items-center gap-3 text-gray-900 dark:text-gray-100">
              <i className="fa-solid fa-heart text-red-500"></i> Kaydedilenler
            </h2>
            <button onClick={() => setIsFavPanelOpen(false)} className="w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-darkborder flex items-center justify-center text-gray-700 dark:text-gray-300 transition-colors">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
            {favorites.length === 0 ? (
              <div className="text-center py-20 text-gray-400 dark:text-gray-700">
                <i className="fa-solid fa-heart-crack text-3xl mb-4 opacity-20"></i>
                <p className="font-bold text-sm">Tarif yok.</p>
              </div>
            ) : (
              favorites.map(recipe => (
                <div key={recipe.id} onClick={() => { setSelectedRecipe(recipe); setIsFavPanelOpen(false); }} className="bg-white dark:bg-darkcard p-3 rounded-xl border border-gray-100 dark:border-darkborder shadow-sm cursor-pointer hover:shadow-md transition-all flex items-center gap-3 group">
                  <div className="w-8 h-8 bg-maroon/5 dark:bg-maroon/20 rounded-lg flex items-center justify-center text-maroon dark:text-red-400 group-hover:bg-maroon group-hover:text-white transition-all text-xs"><i className="fa-solid fa-utensils"></i></div>
                  <div className="flex-1">
                    <h4 className="font-bold line-clamp-1 text-sm text-gray-900 dark:text-gray-100">{recipe.title}</h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{recipe.cookingTime}</p>
                  </div>
                  <button onClick={(e) => toggleFavorite(e, recipe)} className="text-red-500 hover:scale-110 transition-transform text-sm"><i className="fa-solid fa-heart"></i></button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <button onClick={() => setIsFavPanelOpen(true)} className="fixed bottom-6 right-6 z-[40] w-12 h-12 bg-red-500 text-white rounded-full shadow-2xl flex items-center justify-center text-lg transition-all hover:scale-110 active:scale-95 shadow-red-500/20" aria-label="Kaydedilenler">
        <i className="fa-solid fa-heart"></i>
        {favorites.length > 0 && <span className="absolute -top-1 -right-1 bg-white dark:bg-red-500 text-red-500 dark:text-white w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-red-500 shadow-sm">{favorites.length}</span>}
      </button>
    </div>
  );
};

export default App;
