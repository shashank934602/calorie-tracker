import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  parseFoodWithAiApi, 
  createFoodEntryApi, 
  AiFoodCandidateItem, 
  MealType 
} from '../services/api';
import { 
  ArrowLeft, 
  Sparkles, 
  Send, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  Trash2, 
  Flame, 
  Coffee, 
  Sun, 
  Moon, 
  Apple
} from 'lucide-react';

export default function AiFoodLogPage(): React.JSX.Element {
  const { token, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [promptText, setPromptText] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Parsed State
  const [parsedMealType, setParsedMealType] = useState<MealType>('lunch');
  const [parsedItems, setParsedItems] = useState<AiFoodCandidateItem[]>([]);
  const [hasPreview, setHasPreview] = useState<boolean>(false);

  const samplePrompts = [
    '3 eggs and 2 rotis for breakfast',
    '200g chicken and 150g rice for lunch',
    '50g oats with 250ml milk',
    'One banana and 20g almonds',
  ];

  const handleParse = async (textToParse?: string) => {
    const query = (textToParse || promptText).trim();
    if (!query || !token) return;

    setIsParsing(true);
    setParseError(null);
    setSuccessMsg(null);

    try {
      const response = await parseFoodWithAiApi(token, query);
      setParsedMealType(response.mealType);
      setParsedItems(response.items);
      setHasPreview(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to parse food description';
      setParseError(message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleQuantityChange = (index: number, newQty: number) => {
    setParsedItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      const validQty = Math.max(1, newQty);
      item.quantityInServingUnit = validQty;

      if (item.calculatedNutrition && item.matchedFoodName) {
        // Recalculate based on existing 100g density
        const c100 = (item.calculatedNutrition.calories / item.quantityInServingUnit) * 100 || 0;
        const p100 = (item.calculatedNutrition.protein / item.quantityInServingUnit) * 100 || 0;
        const cb100 = (item.calculatedNutrition.carbs / item.quantityInServingUnit) * 100 || 0;
        const f100 = (item.calculatedNutrition.fat / item.quantityInServingUnit) * 100 || 0;

        item.calculatedNutrition = {
          calories: Math.round((c100 * validQty) / 100),
          protein: Math.round(((p100 * validQty) / 100) * 10) / 10,
          carbs: Math.round(((cb100 * validQty) / 100) * 10) / 10,
          fat: Math.round(((f100 * validQty) / 100) * 10) / 10,
        };
      }
      updated[index] = item;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setParsedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectAlternate = (index: number, alt: { id: string; name: string; servingUnit: string; caloriesPer100g: number }) => {
    setParsedItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      item.foodId = alt.id;
      item.matchedFoodName = alt.name;
      item.servingUnit = alt.servingUnit;
      item.matchConfidence = 'high';
      item.needsConfirmation = false;
      item.conversionNote = `Switched to catalog food: ${alt.name}`;
      
      const qty = item.quantityInServingUnit;
      const c = Math.round((alt.caloriesPer100g * qty) / 100);
      item.calculatedNutrition = {
        calories: c,
        protein: item.calculatedNutrition?.protein || 0,
        carbs: item.calculatedNutrition?.carbs || 0,
        fat: item.calculatedNutrition?.fat || 0,
      };
      updated[index] = item;
      return updated;
    });
  };

  // Compute live preview totals
  const previewTotals = parsedItems.reduce(
    (acc, item) => {
      if (item.calculatedNutrition) {
        acc.calories += item.calculatedNutrition.calories;
        acc.protein += item.calculatedNutrition.protein;
        acc.carbs += item.calculatedNutrition.carbs;
        acc.fat += item.calculatedNutrition.fat;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const handleConfirmAndLog = async () => {
    if (!token) return;
    const validItems = parsedItems.filter((i) => i.foodId !== null);
    if (validItems.length === 0) {
      setParseError('No valid matched foods to log. Please match or remove unmatched items.');
      return;
    }

    setIsSubmitting(true);
    setParseError(null);

    try {
      // Create FoodEntry records sequentially
      for (const item of validItems) {
        await createFoodEntryApi(token, {
          foodId: item.foodId!,
          quantityGrams: item.quantityInServingUnit,
          mealType: parsedMealType,
        });
      }

      await refreshProfile();
      setSuccessMsg(`Successfully logged ${validItems.length} food items to today's ${parsedMealType}!`);

      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save food entries';
      setParseError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMealIcon = (m: MealType) => {
    switch (m) {
      case 'breakfast':
        return <Coffee className="w-4 h-4 text-amber-400" />;
      case 'lunch':
        return <Sun className="w-4 h-4 text-emerald-400" />;
      case 'dinner':
        return <Moon className="w-4 h-4 text-indigo-400" />;
      case 'snack':
        return <Apple className="w-4 h-4 text-rose-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white">AI Food Assistant</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-purple-300">
                Gemini Powered
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900/60 to-slate-950 border border-purple-500/20 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Log Meals with Natural Language</h1>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Type what you ate in plain English. The AI parses the ingredients and quantities, matches them to our verified food database, and lets you review before logging.
              </p>
            </div>
          </div>
        </div>

        {parseError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{parseError}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-400 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Input Box */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div>
            <label htmlFor="ai-input" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              What did you eat?
            </label>
            <div className="relative">
              <textarea
                id="ai-input"
                rows={3}
                placeholder="e.g. I had 3 eggs, 200g chicken and a bowl of rice for lunch"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleParse();
                  }
                }}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 text-sm resize-none"
              />
              <button
                type="button"
                onClick={() => handleParse()}
                disabled={isParsing || !promptText.trim()}
                className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer shadow-md shadow-purple-600/30"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Parsing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Parse Meal</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Prompt Suggestions */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Try an example:
            </span>
            <div className="flex flex-wrap gap-2">
              {samplePrompts.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPromptText(sample);
                    handleParse(sample);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 transition text-left cursor-pointer"
                >
                  "{sample}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Confirmation Preview Section */}
        {hasPreview && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            {/* Header & Meal Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Review & Confirm Meal</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verify quantities and catalog matches before logging to diary.
                </p>
              </div>

              {/* Meal Type Switcher */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
                {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setParsedMealType(m)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer capitalize ${
                      parsedMealType === m
                        ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {getMealIcon(m)}
                    <span>{m}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Item List */}
            <div className="space-y-3">
              {parsedItems.map((item, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border transition ${
                    !item.foodId
                      ? 'bg-rose-950/20 border-rose-500/30'
                      : item.needsConfirmation
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-slate-950/80 border-slate-800/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Food Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">
                          {item.matchedFoodName || item.foodName}
                        </span>

                        {/* Match Status Badge */}
                        {item.matchConfidence === 'high' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Verified Match
                          </span>
                        )}
                        {item.matchConfidence === 'medium' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Estimated Portion
                          </span>
                        )}
                        {item.matchConfidence === 'none' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Unmatched Food
                          </span>
                        )}
                      </div>

                      {item.conversionNote && (
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <HelpCircle className="w-3 h-3 text-slate-400" />
                          <span>{item.conversionNote}</span>
                        </p>
                      )}

                      {/* Alternate candidates dropdown */}
                      {item.alternateCandidates && item.alternateCandidates.length > 0 && (
                        <div className="pt-1 flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">Alternate matches:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {item.alternateCandidates.map((alt) => (
                              <button
                                key={alt.id}
                                type="button"
                                onClick={() => handleSelectAlternate(index, alt)}
                                className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 transition cursor-pointer"
                              >
                                {alt.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quantity & Nutrition Controls */}
                    <div className="flex items-center gap-4">
                      {item.foodId && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="5000"
                            value={item.quantityInServingUnit}
                            onChange={(e) => handleQuantityChange(index, Number(e.target.value))}
                            className="w-20 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-right text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                          <span className="text-xs font-semibold text-slate-400">{item.servingUnit}</span>
                        </div>
                      )}

                      {/* Nutrition Breakdown Pill */}
                      {item.calculatedNutrition ? (
                        <div className="text-right min-w-[90px]">
                          <div className="text-sm font-extrabold text-white font-mono">
                            {item.calculatedNutrition.calories}{' '}
                            <span className="text-xs font-normal text-slate-400 font-sans">kcal</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            P:{item.calculatedNutrition.protein}g · C:{item.calculatedNutrition.carbs}g · F:{item.calculatedNutrition.fat}g
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-rose-400 italic">No nutrition available</div>
                      )}

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Macro Bar */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Flame className="w-4 h-4 text-purple-400" />
                <span>Deterministic Meal Totals:</span>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                  <span className="text-slate-400 block text-[10px]">Calories</span>
                  <span className="font-mono font-bold text-white text-sm">{previewTotals.calories} kcal</span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                  <span className="text-blue-400 block text-[10px]">Protein</span>
                  <span className="font-mono font-bold text-white text-sm">{Math.round(previewTotals.protein)} g</span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                  <span className="text-emerald-400 block text-[10px]">Carbs</span>
                  <span className="font-mono font-bold text-white text-sm">{Math.round(previewTotals.carbs)} g</span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                  <span className="text-amber-400 block text-[10px]">Fats</span>
                  <span className="font-mono font-bold text-white text-sm">{Math.round(previewTotals.fat)} g</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setHasPreview(false);
                  setParsedItems([]);
                  setPromptText('');
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
              >
                Clear & Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAndLog}
                disabled={isSubmitting || parsedItems.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer shadow-lg shadow-purple-600/30"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Logging Foods...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Log to Diary</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
