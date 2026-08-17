import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Food, searchFoodsApi } from '../services/api';
import { LogFoodModal } from '../components/LogFoodModal';
import { 
  Search, 
  ArrowLeft, 
  Flame, 
  Plus, 
  Loader2, 
  BookOpen, 
  Info
} from 'lucide-react';

export default function FoodDatabasePage(): React.JSX.Element {
  const { token } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [foods, setFoods] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFoodForLog, setSelectedFoodForLog] = useState<Food | null>(null);

  const fetchFoods = async (query: string = '') => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await searchFoodsApi(token, query, 50);
      setFoods(res.foods);
    } catch (err) {
      console.warn('Failed to load foods:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFoods(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, token]);

  const handleOpenLog = (food: Food) => {
    setSelectedFoodForLog(food);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
            <span className="font-bold text-base text-white">Food Catalog & Nutrition Database</span>
          </div>

          <button
            onClick={() => {
              setSelectedFoodForLog(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Log</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full flex flex-col gap-6">
        {/* Title & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-emerald-400" />
              <span>Food Nutritional Database</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Browse common foods, view standard nutritional breakdown per 100g, and log items to your daily meals.
            </p>
          </div>

          {/* Search Input */}
          <div className="w-full sm:w-80 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search by food name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-sm transition"
            />
          </div>
        </div>

        {/* Development Data Notice */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3 text-xs text-slate-400">
          <Info className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            Development Dataset: Showing standard common foods seeded for testing. Values are calculated based on 100g portions.
          </span>
        </div>

        {/* Foods Grid */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <span className="text-sm font-medium">Searching foods...</span>
          </div>
        ) : foods.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {foods.map((food) => (
              <div
                key={food.id}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition flex flex-col justify-between shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-bold text-white text-base leading-snug">{food.name}</h3>
                    <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex-shrink-0">
                      <Flame className="w-3 h-3" />
                      {food.caloriesPer100g} kcal
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-500 block mb-4">Basis: 100 {food.servingUnit} portion</span>

                  {/* Macro Pills */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Protein</span>
                      <span className="font-mono font-bold text-blue-400">{food.proteinPer100g}g</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Carbs</span>
                      <span className="font-mono font-bold text-emerald-400">{food.carbsPer100g}g</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Fat</span>
                      <span className="font-mono font-bold text-amber-400">{food.fatPer100g}g</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-end">
                  <button
                    onClick={() => handleOpenLog(food)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log to Meal</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
            <p className="text-slate-400 text-sm">No foods found matching "{searchQuery}".</p>
          </div>
        )}
      </main>

      {/* Log Food Modal */}
      <LogFoodModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          // Success toast or notification
        }}
        initialFood={selectedFoodForLog}
      />
    </div>
  );
}
