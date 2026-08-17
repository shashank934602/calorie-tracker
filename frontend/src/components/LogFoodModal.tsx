import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Food, 
  MealType, 
  FoodEntry, 
  searchFoodsApi, 
  createFoodEntryApi, 
  updateFoodEntryApi 
} from '../services/api';
import { 
  X, 
  Search, 
  Flame, 
  Scale, 
  Check, 
  Loader2, 
  AlertCircle,
  Plus
} from 'lucide-react';

interface LogFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMealType?: MealType;
  initialFood?: Food | null;
  entryToEdit?: FoodEntry | null;
  targetDate?: string;
}

export const LogFoodModal: React.FC<LogFoodModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMealType = 'lunch',
  initialFood = null,
  entryToEdit = null,
  targetDate,
}) => {
  const { token } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedFood, setSelectedFood] = useState<Food | null>(initialFood);
  const [quantityGrams, setQuantityGrams] = useState<number>(100);
  const [mealType, setMealType] = useState<MealType>(initialMealType);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (entryToEdit) {
        setSelectedFood(entryToEdit.food);
        setQuantityGrams(entryToEdit.quantityGrams);
        setMealType(entryToEdit.mealType);
      } else if (initialFood) {
        setSelectedFood(initialFood);
        setQuantityGrams(100);
        setMealType(initialMealType);
      } else {
        setSelectedFood(null);
        setQuantityGrams(100);
        setMealType(initialMealType);
        fetchDefaultFoods();
      }
    }
  }, [isOpen, initialFood, entryToEdit, initialMealType]);

  const fetchDefaultFoods = async () => {
    if (!token) return;
    setIsSearching(true);
    try {
      const res = await searchFoodsApi(token, '', 20);
      setSearchResults(res.foods);
    } catch (err) {
      console.warn('Error fetching default foods:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (!isOpen || selectedFood || !token) return;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchFoodsApi(token, searchQuery, 20);
        setSearchResults(res.foods);
      } catch (err) {
        console.warn('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, selectedFood, token]);

  // Live calculated nutrition preview
  const previewNutrition = useMemo(() => {
    if (!selectedFood || quantityGrams <= 0) return null;
    const factor = quantityGrams / 100;
    return {
      calories: Math.round(selectedFood.caloriesPer100g * factor),
      protein: Math.round(selectedFood.proteinPer100g * factor * 10) / 10,
      carbs: Math.round(selectedFood.carbsPer100g * factor * 10) / 10,
      fat: Math.round(selectedFood.fatPer100g * factor * 10) / 10,
    };
  }, [selectedFood, quantityGrams]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setErrorMessage(null);

    if (!selectedFood) {
      setErrorMessage('Please select a food item to log');
      return;
    }

    if (quantityGrams <= 0) {
      setErrorMessage('Please enter a quantity greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      if (entryToEdit) {
        await updateFoodEntryApi(token, entryToEdit.id, {
          quantityGrams,
          mealType,
        });
      } else {
        await createFoodEntryApi(token, {
          foodId: selectedFood.id,
          quantityGrams,
          mealType,
          consumedAt: targetDate ? `${targetDate}T12:00:00.000Z` : undefined,
        });
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save food entry';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const mealOptions: { value: MealType; label: string; icon: string }[] = [
    { value: 'breakfast', label: 'Breakfast', icon: '🌅' },
    { value: 'lunch', label: 'Lunch', icon: '☀️' },
    { value: 'dinner', label: 'Dinner', icon: '🌙' },
    { value: 'snack', label: 'Snack', icon: '🍎' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Flame className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-white text-base">
              {entryToEdit ? 'Edit Food Entry' : 'Log Food to Daily Diary'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Meal Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select Meal
            </label>
            <div className="grid grid-cols-4 gap-2">
              {mealOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMealType(opt.value)}
                  className={`py-2 px-1 rounded-xl text-xs font-medium border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                    mealType === opt.value
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="text-sm">{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Food Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Food Item
              </label>
              {selectedFood && !entryToEdit && (
                <button
                  type="button"
                  onClick={() => setSelectedFood(null)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition"
                >
                  Change Food
                </button>
              )}
            </div>

            {selectedFood ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">{selectedFood.name}</h4>
                  <span className="text-xs text-slate-400 font-mono">
                    {selectedFood.caloriesPer100g} kcal / 100g • P: {selectedFood.proteinPer100g}g • C: {selectedFood.carbsPer100g}g • F: {selectedFood.fatPer100g}g
                  </span>
                </div>
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search foods (e.g. Chicken, Rice, Oats, Dal)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-sm"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {isSearching ? (
                    <div className="text-center py-4 text-xs text-slate-500 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Searching food database...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((food) => (
                      <div
                        key={food.id}
                        onClick={() => setSelectedFood(food)}
                        className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/40 hover:bg-slate-950 flex items-center justify-between cursor-pointer transition"
                      >
                        <div>
                          <span className="text-xs font-semibold text-slate-200 block">{food.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {food.caloriesPer100g} kcal/100g • P: {food.proteinPer100g}g • C: {food.carbsPer100g}g • F: {food.fatPer100g}g
                          </span>
                        </div>
                        <Plus className="w-4 h-4 text-emerald-400" />
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-500">
                      No foods found matching "{searchQuery}".
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quantity Selector & Live Preview */}
          {selectedFood && (
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="quantity" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-emerald-400" />
                    Quantity in Grams ({selectedFood.servingUnit})
                  </label>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {quantityGrams} {selectedFood.servingUnit}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    max="5000"
                    step="1"
                    value={quantityGrams || ''}
                    onChange={(e) => setQuantityGrams(Number(e.target.value))}
                    className="w-28 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                    required
                  />
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="5"
                    value={quantityGrams}
                    onChange={(e) => setQuantityGrams(Number(e.target.value))}
                    className="flex-1 accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Calculated Live Nutrition Card */}
              {previewNutrition && (
                <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Calculated Nutrition</span>
                    <span className="font-mono text-base font-extrabold text-white">
                      {previewNutrition.calories} <span className="text-xs font-normal text-emerald-400 font-sans">kcal</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Protein</span>
                      <span className="font-mono font-bold text-blue-400">{previewNutrition.protein}g</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Carbohydrates</span>
                      <span className="font-mono font-bold text-emerald-400">{previewNutrition.carbs}g</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Fats</span>
                      <span className="font-mono font-bold text-amber-400">{previewNutrition.fat}g</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedFood}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 shadow-md shadow-emerald-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{entryToEdit ? 'Save Changes' : 'Log Food Entry'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
