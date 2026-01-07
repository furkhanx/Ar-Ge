
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Recipe, TabType, FilterState } from './types';
import { 
  generateRecipesFromIngredients, 
  generateChefRecommendations, 
  checkApiKey, 
  openApiKeySelector,
  analyzeIngredientsFromImage
} from './services/geminiService';
import RecipeCard from './components/RecipeCard';
import RecipeModal from './components/RecipeModal';

// "Sizden Gelenler" çıkarıldı.
const CATEGORIES = [
  "Airfryer Tarifleri", "Akşam Yemeği Tarifleri", "Atıştırmalık", "Bakliyat", "Balık", "Bebek Tarifleri", "Börek", 
  "Cheesecake", "Çikolatalı Tatlı", "Çocuk Yemekleri", "Çorba", "Çörek", "Deniz Ürünleri", "Diyet", "Diyet Tatlı", 
  "Dolma Sarma", "Dondurma", "Dünya Mutfağı", "Ekmek", "Et", "Fırın Yemekleri", "Glutensiz", "Hamburger", "Hamur İşi", 
  "Helva", "Hızlı Yemekler", "İçecek", "Kahvaltılık", "Kebap", "Kek", "Kış Hazırlıkları", "Kızartma", "Köfte", 
  "Kurabiye", "Makarna", "Mantı", "MasterChef", "Mevsiminde", "Meyveli Tatlı", "Meze", "Özel Beslenme", "Pasta", 
  "Pide", "Pilav", "Pizza", "Poğaça", "Ramazan", "Raw Food", "Reçel", "Sakatat", "Salata", "Sandviç", "Sebze", 
  "Sos", "Sulu Yemek", "Sütlü Tatlı", "Şerbetli Tatlı", "Tatlı", "Tatlı Atıştırmalık", "Tatlı Kek", 
  "Tatlı Kurabiye", "Tavuk", "Tost", "Turşu", "Tuzlu Atıştırmalık", "Tuzlu Kek", "Tuzlu Kurabiye", "Vegan", 
  "Vejetaryen", "Yerel Üreticilerden", "Yöresel Yemekler", "Zeytinyağlı"
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('suggestions');
  const [chefCategory, setChefCategory] = useState<'meal' | 'dessert' | 'savory'>('meal');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tüm Kategoriler');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [chefRecipes, setChefRecipes] = useState<Recipe[]>([]);
  const [chefDesserts, setChefDesserts] = useState<Recipe[]>([]);
  const [chefSavory, setChefSavory] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [searchHistory, setSearchHistory] = useState<{date: string, items: string[]}[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [scanningImage, setScanningImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<'favorites' | 'history'>('favorites');
  const [searchTitle, setSearchTitle] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchMode, setSearchMode] = useState<'strict' | 'flexible' | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Advanced Filters State
  const [filters, setFilters] = useState<FilterState>({
    cuisine: 'all',
    mood: 'all',
    diet: 'all',
    mealType: 'all',
    cookingMethod: 'all',
    prepTime: 'all',
    specialOccasion: 'all'
  });
  
  // Eski Gelişmiş filtre butonu artık yeni bar ile değiştiği için showFilters state'i farklı amaçla kullanılabilir veya kaldırılabilir.
  // Ancak eski yapıyı bozmadan yeni yapıyı entegre edelim.
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedMode = localStorage.getItem('yemektarifleri_darkmode');
    const savedLogin = localStorage.getItem('yemektarifleri_loggedin');
    
    if (savedMode === 'true') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }

    if (savedLogin === 'true') {
        setIsLoggedIn(true);
    }

    const savedFavs = localStorage.getItem('yemektarifleri_favorites');
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (e) {
        setFavorites([]);
      }
    }

    const savedHistory = localStorage.getItem('yemektarifleri_history');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        setSearchHistory([]);
      }
    }
    checkApiKey().then(setIsApiKeySet);
  }, []);

  useEffect(() => {
    localStorage.setItem('yemektarifleri_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('yemektarifleri_history', JSON.stringify(searchHistory));
  }, [searchHistory]);

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

  const handleLogin = () => {
      setIsLoggedIn(true);
      localStorage.setItem('yemektarifleri_loggedin', 'true');
      setIsProfileOpen(true);
  };

  const handleLogout = () => {
      setIsLoggedIn(false);
      localStorage.removeItem('yemektarifleri_loggedin');
      setIsProfileOpen(false);
  };

  const startVoiceRecognition = () => {
    // Standart SpeechRecognition ve Webkit öneki kontrolü
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'tr-TR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
            alert("Mikrofon hatası: " + event.error);
        };
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setCurrentInput(prev => prev ? `${prev} ${transcript}` : transcript);
        };
        recognition.start();
    } else {
        alert("Tarayıcınız sesli komutu desteklemiyor. Lütfen Chrome, Edge veya Safari kullanın.");
    }
  };

  const resetFilters = () => {
      setFilters({ 
          cuisine: 'all', mood: 'all', diet: 'all',
          mealType: 'all', cookingMethod: 'all', prepTime: 'all', specialOccasion: 'all'
      });
      setDifficultyFilter('all');
      setSelectedCategory('Tüm Kategoriler');
  };

  useEffect(() => {
    if (activeTab === 'chef') {
      fetchChefData();
    }
  }, [activeTab, chefCategory, filters]); 

  const fetchChefData = async (append = false) => {
    if (!append && chefCategory === 'meal' && chefRecipes.length > 0 && filters.cuisine === 'all') return;

    const count = append ? 4 : 8;
    if (append) setLoadingMore(true);
    else {
      setLoading(true);
      let title = 'Günün Yemekleri';
      if (chefCategory === 'dessert') title = 'Günün Tatlıları';
      if (chefCategory === 'savory') title = 'Günün Tuzluları';
      setSearchTitle(title);
      if (!append) {
          setChefRecipes([]); setChefDesserts([]); setChefSavory([]);
      }
    }
    
    setError(null);
    try {
      const data = await generateChefRecommendations(chefCategory, filters, count);
      if (chefCategory === 'meal') {
        setChefRecipes(prev => append ? [...prev, ...data] : data);
      } else if (chefCategory === 'dessert') {
        setChefDesserts(prev => append ? [...prev, ...data] : data);
      } else {
        setChefSavory(prev => append ? [...prev, ...data] : data);
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

  const currentRecipeList = useMemo(() => {
    if (activeTab === 'suggestions') return recipes;
    if (chefCategory === 'meal') return chefRecipes;
    if (chefCategory === 'dessert') return chefDesserts;
    return chefSavory;
  }, [activeTab, recipes, chefCategory, chefRecipes, chefDesserts, chefSavory]);

  const filteredRecipes = useMemo(() => {
    let list = [...currentRecipeList];
    if (difficultyFilter !== 'all') {
      list = list.filter(r => r.difficulty === difficultyFilter);
    }
    const difficultyOrder = { 'Çok Kolay': 0, 'Kolay': 1, 'Orta': 2, 'Zor': 3 };
    return list.sort((a, b) => (difficultyOrder[a.difficulty] ?? 4) - (difficultyOrder[b.difficulty] ?? 4));
  }, [currentRecipeList, difficultyFilter]);

  const findRecipes = async (mode: 'strict' | 'flexible', append = false) => {
    if (mode === 'strict' && ingredients.length === 0) return;
    if (mode === 'flexible' && ingredients.length === 0 && selectedCategory === 'Tüm Kategoriler') return;
    
    if (!append) {
      const itemDesc = ingredients.length > 0 ? ingredients.join(', ') : selectedCategory;
      const newItem = { date: new Date().toLocaleDateString('tr-TR'), items: [itemDesc] };
      setSearchHistory(prev => [newItem, ...prev].slice(0, 20));
    }

    const count = append ? 4 : 8;
    if (append) setLoadingMore(true);
    else {
      setLoading(true);
      setRecipes([]);
      setSearchMode(mode);
      let title = mode === 'strict' ? 'Evdeki malzemelerle tarifler' : 'Esnek Tarifler';
      if (selectedCategory !== 'Tüm Kategoriler') title += ` (${selectedCategory})`;
      setSearchTitle(title);
    }
    
    setError(null);
    try {
      const results = await generateRecipesFromIngredients(ingredients, mode, filters, selectedCategory, count);
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
      <header className="relative mb-8 pt-2 flex items-center justify-center">
        {/* Sol üst Profil İkonu */}
        <button 
          onClick={() => setIsProfileOpen(true)}
          className="absolute top-0 left-0 md:-top-2 w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white dark:bg-darkcard shadow-lg flex items-center justify-center text-base md:text-lg transition-all hover:scale-110 active:scale-90 border border-gray-100 dark:border-darkborder text-maroon dark:text-gray-300"
          aria-label="Profilim"
        >
          {isLoggedIn ? <img src="https://ui-avatars.com/api/?name=User&background=800000&color=fff" className="rounded-lg w-full h-full" alt="User" /> : <i className="fa-solid fa-user"></i>}
        </button>

        <div className="flex flex-col items-center">
          <div className="flex flex-row items-center justify-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-12 md:h-12 bg-maroon text-white rounded-lg md:rounded-xl flex items-center justify-center text-base md:text-2xl shadow-xl rotate-3 flex-shrink-0">
              <i className="fa-solid fa-utensils"></i>
            </div>
            <h1 className="text-xl md:text-4xl font-black text-gray-900 dark:text-white text-center leading-tight">
              Bugün Ne <span className="text-maroon">Yemek</span> Yapsam?
            </h1>
          </div>
          <div className="mt-1 md:mt-2 w-12 md:w-16 h-1 bg-maroon/20 rounded-full"></div>
        </div>
        
        <div className="absolute top-0 right-0 md:-top-2 flex gap-2">
            {!isLoggedIn && (
                <button 
                onClick={handleLogin}
                className="hidden md:flex h-10 px-3 rounded-xl bg-white dark:bg-darkcard shadow-lg items-center justify-center gap-2 text-xs font-bold border border-gray-100 dark:border-darkborder hover:bg-gray-50 transition-colors"
                >
                <i className="fa-brands fa-google text-red-500"></i> Giriş Yap
                </button>
            )}
            <button 
            onClick={toggleDarkMode}
            className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white dark:bg-darkcard shadow-lg flex items-center justify-center text-base md:text-lg transition-all hover:scale-110 active:scale-90 border border-gray-100 dark:border-darkborder"
            aria-label="Tema Değiştir"
            >
            {isDarkMode ? <i className="fa-solid fa-sun text-yellow-400"></i> : <i className="fa-solid fa-moon text-maroon"></i>}
            </button>
        </div>
      </header>

      <nav className="flex justify-center mb-8 md:mb-10 gap-2 p-1 bg-white/70 dark:bg-darkcard/70 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-lg border border-gray-100 dark:border-darkborder max-w-[260px] md:max-w-xs mx-auto">
        <button 
          onClick={() => { setActiveTab('suggestions'); setRecipes([]); setSearchTitle(null); setSearchMode(null); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 md:py-2.5 rounded-lg md:rounded-xl font-black transition-all text-[10px] md:text-xs ${activeTab === 'suggestions' ? 'bg-maroon text-white shadow-xl' : 'text-gray-500 dark:text-gray-400 hover:text-maroon dark:hover:text-maroon'}`}
        >
          <i className="fa-solid fa-wand-magic-sparkles"></i> Tarif Bul
        </button>
        <button 
          onClick={() => { setActiveTab('chef'); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 md:py-2.5 rounded-lg md:rounded-xl font-black transition-all text-[10px] md:text-xs ${activeTab === 'chef' ? 'bg-maroon text-white shadow-xl' : 'text-gray-500 dark:text-gray-400 hover:text-maroon dark:hover:text-maroon'}`}
        >
          <i className="fa-solid fa-chef-hat"></i> Şefin Tavsiyesi
        </button>
      </nav>

      <main>
        {activeTab === 'suggestions' && (
          <div className="space-y-8 md:space-y-10 animate-fadeIn">
            <div className="bg-white dark:bg-darkcard p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-xl border border-gray-50 dark:border-darkborder w-full max-w-4xl mx-auto">
              <h2 className="text-base md:text-lg font-black mb-4 md:mb-5 flex items-center text-gray-800 dark:text-gray-100">
                <span className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-maroon/10 text-maroon flex items-center justify-center mr-3">
                  <i className="fa-solid fa-basket-shopping"></i>
                </span>
                Malzemelerinizi Ekleyin
              </h2>
              <div className="flex flex-col gap-0">
                <form onSubmit={handleAddIngredient} className="flex flex-col sm:flex-row gap-2 relative z-10">
                  
                  {/* Kategori Seçimi - Daraltılmış */}
                  <div className="relative min-w-[140px] md:min-w-[160px] max-w-[180px]">
                      <select 
                        value={selectedCategory} 
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full appearance-none py-3 px-4 rounded-lg bg-gray-100 dark:bg-darkbg border border-gray-200 dark:border-darkborder focus:border-maroon focus:outline-none transition-all font-bold text-gray-700 dark:text-gray-200 text-sm cursor-pointer h-full"
                      >
                          <option>Tüm Kategoriler</option>
                          {CATEGORIES.map((cat, idx) => (
                              <option key={idx} value={cat}>{cat}</option>
                          ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                        <i className="fa-solid fa-chevron-down text-xs"></i>
                      </div>
                  </div>

                  {/* Arama Input - Genişletilmiş */}
                  <div className="flex-1 relative flex">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                         <i className="fa-solid fa-magnifying-glass"></i>
                      </div>
                      <input 
                        type="text" 
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        placeholder="Tarif veya evdeki malzemelerle arayın"
                        className="flex-1 py-3 pl-12 pr-10 rounded-lg bg-gray-50 dark:bg-darkbg border-2 border-transparent focus:border-maroon focus:outline-none transition-all font-bold text-gray-900 dark:text-white shadow-inner text-sm md:text-base h-full"
                      />
                      <button 
                        type="button"
                        onClick={startVoiceRecognition}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full transition-all ${isListening ? 'text-red-500 bg-red-100 animate-pulse' : 'text-gray-400 hover:text-maroon'}`}
                      >
                        <i className="fa-solid fa-microphone"></i>
                      </button>
                  </div>
                  
                  <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()} 
                        className="bg-white dark:bg-gray-800 border border-maroon/20 dark:border-gray-600 text-maroon dark:text-gray-200 w-12 flex items-center justify-center rounded-lg hover:bg-maroon hover:text-white dark:hover:bg-gray-700 transition-all shadow-sm flex-shrink-0 h-full"
                        aria-label="Fotoğraf Çek"
                      >
                        {scanningImage ? <i className="fa-solid fa-circle-notch animate-spin text-sm"></i> : <i className="fa-solid fa-camera text-sm md:text-base"></i>}
                      </button>
                      <button 
                        type="submit" 
                        className="bg-maroon text-white px-6 rounded-lg font-black hover:shadow-lg transition-all active:scale-95 shadow-md text-sm uppercase tracking-wide whitespace-nowrap h-full"
                      >
                        EKLE
                      </button>
                  </div>
                </form>

                {/* Yeni Turuncu Filtre Barı */}
                <div className="bg-orange-400 p-3 rounded-b-xl flex flex-col md:flex-row items-center gap-3 md:gap-4 mt-2 shadow-inner">
                    <span className="text-white font-bold text-sm whitespace-nowrap border-r border-white/30 pr-4 h-full flex items-center">
                        Sonuçları Filtreleyin:
                    </span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
                         <select 
                            value={filters.mealType} 
                            onChange={(e) => setFilters({...filters, mealType: e.target.value})}
                            className="w-full bg-white text-gray-700 text-xs font-bold py-2 px-3 rounded focus:outline-none"
                         >
                             <option value="all">Hangi Öğün</option>
                             <option value="Kahvaltı">Kahvaltı</option>
                             <option value="Öğle Yemeği">Öğle Yemeği</option>
                             <option value="Akşam Yemeği">Akşam Yemeği</option>
                             <option value="Ara Öğün">Ara Öğün</option>
                             <option value="Çay Saati">Çay Saati</option>
                         </select>

                         <select 
                            value={filters.cookingMethod} 
                            onChange={(e) => setFilters({...filters, cookingMethod: e.target.value})}
                            className="w-full bg-white text-gray-700 text-xs font-bold py-2 px-3 rounded focus:outline-none"
                         >
                             <option value="all">Pişirme Türü</option>
                             <option value="Fırında">Fırında</option>
                             <option value="Tencere">Tencere</option>
                             <option value="Kızartma">Kızartma</option>
                             <option value="Haşlama">Haşlama</option>
                             <option value="Izgara">Izgara</option>
                             <option value="Airfryer">Airfryer</option>
                         </select>

                         <select 
                            value={filters.prepTime} 
                            onChange={(e) => setFilters({...filters, prepTime: e.target.value})}
                            className="w-full bg-white text-gray-700 text-xs font-bold py-2 px-3 rounded focus:outline-none"
                         >
                             <option value="all">Hazırlama Süresi</option>
                             <option value="15 dk altı">15 dk altı</option>
                             <option value="30 dk altı">30 dk altı</option>
                             <option value="1 saat altı">1 saat altı</option>
                             <option value="Uzun süreli">Uzun süreli</option>
                         </select>

                         <select 
                            value={filters.specialOccasion} 
                            onChange={(e) => setFilters({...filters, specialOccasion: e.target.value})}
                            className="w-full bg-white text-gray-700 text-xs font-bold py-2 px-3 rounded focus:outline-none"
                         >
                             <option value="all">Özel Durumlar</option>
                             <option value="Misafir">Misafir</option>
                             <option value="Pratik">Pratik</option>
                             <option value="Ekonomik">Ekonomik</option>
                             <option value="Diyet">Diyet</option>
                             <option value="Çocuklar İçin">Çocuklar İçin</option>
                         </select>
                    </div>
                </div>
                
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                
                {ingredients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 md:gap-2 p-2.5 md:p-3 bg-gray-50/50 dark:bg-white/5 rounded-lg md:rounded-xl border border-dashed border-gray-200 dark:border-gray-800 mt-4">
                    {ingredients.map(ing => (
                      <div key={ing} className="bg-white dark:bg-darkcard text-maroon dark:text-red-400 px-2.5 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg font-bold text-[10px] md:text-xs flex items-center gap-1.5 md:gap-2 border border-maroon/10 shadow-sm transition-all hover:border-maroon/30 group">
                        {ing}
                        <button onClick={() => setIngredients(ingredients.filter(i => i !== ing))} className="text-gray-300 group-hover:text-red-500 transition-colors"><i className="fa-solid fa-circle-xmark"></i></button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 mt-4">
                  <button onClick={() => findRecipes('strict')} disabled={(ingredients.length === 0 && selectedCategory === 'Tüm Kategoriler') || loading} className="py-2.5 md:py-3 px-4 bg-white dark:bg-darkbg border border-maroon/20 text-maroon dark:text-red-400 font-black text-[10px] md:text-xs rounded-lg md:rounded-xl hover:border-maroon transition-all disabled:opacity-50 shadow-sm flex items-center justify-center gap-2">
                    <i className="fa-solid fa-filter"></i> Sadece Bunlarla
                  </button>
                  <button onClick={() => findRecipes('flexible')} disabled={(ingredients.length === 0 && selectedCategory === 'Tüm Kategoriler') || loading} className="py-2.5 md:py-3 px-4 bg-maroon text-white font-black text-[10px] md:text-xs rounded-lg md:rounded-xl shadow-lg hover:shadow-maroon/20 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
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
                  <select 
                    value={difficultyFilter} 
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                    className="py-2 px-3 md:px-4 rounded-lg bg-white dark:bg-darkcard border border-gray-100 dark:border-darkborder text-[10px] md:text-xs font-bold focus:outline-none text-gray-900 dark:text-gray-100 cursor-pointer shadow-sm"
                  >
                    <option value="all">Zorluk Seviyesi</option>
                    <option value="Çok Kolay">Çok Kolay</option>
                    <option value="Kolay">Kolay</option>
                    <option value="Orta">Orta</option>
                    <option value="Zor">Zor</option>
                  </select>
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
              <div className="inline-flex p-1 bg-white/60 dark:bg-darkcard/60 rounded-xl border border-gray-100 dark:border-darkborder mb-6 shadow-sm overflow-x-auto max-w-full">
                <button onClick={() => setChefCategory('meal')} className={`px-4 md:px-6 py-2 rounded-lg text-[10px] md:text-xs font-black transition-all whitespace-nowrap ${chefCategory === 'meal' ? 'bg-maroon text-white shadow-md' : 'text-gray-500 dark:text-gray-400'}`}>Yemekler</button>
                <button onClick={() => setChefCategory('savory')} className={`px-4 md:px-6 py-2 rounded-lg text-[10px] md:text-xs font-black transition-all whitespace-nowrap ${chefCategory === 'savory' ? 'bg-maroon text-white shadow-md' : 'text-gray-500 dark:text-gray-400'}`}>Tuzlular</button>
                <button onClick={() => setChefCategory('dessert')} className={`px-4 md:px-6 py-2 rounded-lg text-[10px] md:text-xs font-black transition-all whitespace-nowrap ${chefCategory === 'dessert' ? 'bg-maroon text-white shadow-md' : 'text-gray-500 dark:text-gray-400'}`}>Tatlılar</button>
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
                   <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)} className="py-2 px-3 md:px-4 rounded-lg bg-white dark:bg-darkcard border border-gray-100 dark:border-darkborder text-[10px] md:text-xs font-bold text-gray-900 dark:text-gray-100 cursor-pointer shadow-sm">
                      <option value="all">Zorluk Seç</option>
                      <option value="Çok Kolay">Çok Kolay</option>
                      <option value="Kolay">Kolay</option>
                      <option value="Orta">Orta</option>
                      <option value="Zor">Zor</option>
                    </select>
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

      {/* Profil Paneli */}
      <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ${isProfileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setIsProfileOpen(false)}></div>
        <div className={`absolute top-0 left-0 w-full max-w-sm h-full bg-ivory dark:bg-darkbg shadow-2xl transition-transform duration-500 transform ${isProfileOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
          <div className="p-5 border-b border-gray-200 dark:border-darkborder flex justify-between items-center bg-white dark:bg-darkcard shadow-sm">
            <h2 className="text-lg font-black flex items-center gap-3 text-gray-900 dark:text-gray-100">
               {isLoggedIn ? (
                   <>
                    <img src="https://ui-avatars.com/api/?name=User&background=800000&color=fff" className="rounded-full w-8 h-8" alt="User" />
                    <span>Kullanıcı Profili</span>
                   </>
               ) : (
                   <><i className="fa-solid fa-user text-maroon dark:text-gray-300"></i> Profilim</>
               )}
            </h2>
            <button onClick={() => setIsProfileOpen(false)} className="w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-darkborder flex items-center justify-center text-gray-700 dark:text-gray-300 transition-colors">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          
          {!isLoggedIn && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 m-4 rounded-xl border border-yellow-100 dark:border-yellow-900/30 flex flex-col gap-2">
                  <p className="text-xs font-bold text-yellow-700 dark:text-yellow-400">Tariflerinizi kaydetmek için giriş yapın.</p>
                  <button onClick={handleLogin} className="bg-white dark:bg-darkcard py-2 rounded-lg font-bold text-xs shadow-sm flex items-center justify-center gap-2"><i className="fa-brands fa-google text-red-500"></i> Google ile Giriş</button>
              </div>
          )}

          {isLoggedIn && (
              <div className="px-4 py-2">
                  <button onClick={handleLogout} className="text-xs text-red-500 font-bold hover:underline">Çıkış Yap</button>
              </div>
          )}
          
          <div className="flex p-2 gap-2 border-b border-gray-100 dark:border-darkborder bg-white/50 dark:bg-darkcard/50">
            <button onClick={() => setProfileTab('favorites')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${profileTab === 'favorites' ? 'bg-maroon text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-darkborder'}`}>Favoriler</button>
            <button onClick={() => setProfileTab('history')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${profileTab === 'history' ? 'bg-maroon text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-darkborder'}`}>Geçmiş</button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
            {profileTab === 'favorites' ? (
                favorites.length === 0 ? (
                  <div className="text-center py-20 text-gray-400 dark:text-gray-700">
                    <i className="fa-solid fa-heart-crack text-3xl mb-4 opacity-20"></i>
                    <p className="font-bold text-sm">Henüz favori tarif yok.</p>
                  </div>
                ) : (
                  favorites.map(recipe => (
                    <div key={recipe.id} onClick={() => { setSelectedRecipe(recipe); setIsProfileOpen(false); }} className="bg-white dark:bg-darkcard p-3 rounded-xl border border-gray-100 dark:border-darkborder shadow-sm cursor-pointer hover:shadow-md transition-all flex items-center gap-3 group">
                      <div className="w-8 h-8 bg-maroon/5 dark:bg-maroon/20 rounded-lg flex items-center justify-center text-maroon dark:text-red-400 group-hover:bg-maroon group-hover:text-white transition-all text-xs"><i className="fa-solid fa-utensils"></i></div>
                      <div className="flex-1">
                        <h4 className="font-bold line-clamp-1 text-sm text-gray-900 dark:text-gray-100">{recipe.title}</h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{recipe.cookingTime}</p>
                      </div>
                      <button onClick={(e) => toggleFavorite(e, recipe)} className="text-red-500 hover:scale-110 transition-transform text-sm"><i className="fa-solid fa-heart"></i></button>
                    </div>
                  ))
                )
            ) : (
                searchHistory.map((item, idx) => (
                    <div key={idx} onClick={() => { setIngredients(item.items); setIsProfileOpen(false); setActiveTab('suggestions'); }} className="bg-white dark:bg-darkcard p-3 rounded-xl border border-gray-100 dark:border-darkborder shadow-sm cursor-pointer hover:shadow-md transition-all flex flex-col gap-1 group">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-gray-400 font-bold">{item.date}</span>
                            <i className="fa-solid fa-arrow-right text-[10px] text-gray-300 group-hover:text-maroon transition-colors"></i>
                        </div>
                        <p className="font-bold text-xs text-gray-800 dark:text-gray-200 line-clamp-1">{item.items.join(', ')}</p>
                    </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
