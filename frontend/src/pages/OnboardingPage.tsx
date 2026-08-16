import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sex, ActivityLevel, Goal } from '../services/api';
import { 
  Sparkles, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  Flame, 
  Activity, 
  Scale, 
  Ruler, 
  HeartHandshake,
  Check
} from 'lucide-react';

export default function OnboardingPage(): React.JSX.Element {
  const { saveProfile, user } = useAuth();
  const navigate = useNavigate();

  const [age, setAge] = useState<number>(28);
  const [sex, setSex] = useState<Sex>('male');
  const [heightCm, setHeightCm] = useState<number>(175);
  const [weightKg, setWeightKg] = useState<number>(75);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderately_active');
  const [goal, setGoal] = useState<Goal>('maintain_weight');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Live client-side calculation preview
  const previewTargets = useMemo(() => {
    if (!age || !heightCm || !weightKg) return null;

    // BMR (Mifflin-St Jeor)
    const baseBmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
    const bmr = Math.round(sex === 'male' ? baseBmr + 5 : baseBmr - 161);

    // TDEE
    const multipliers: Record<ActivityLevel, number> = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9,
    };
    const tdee = Math.round(bmr * (multipliers[activityLevel] || 1.2));

    // Daily Calories based on goal
    let dailyCalories = tdee;
    if (goal === 'lose_weight') dailyCalories = Math.round(tdee - 500);
    if (goal === 'gain_weight') dailyCalories = Math.round(tdee + 300);

    // Macros
    const proteinGrams = Math.round(1.8 * weightKg);
    const proteinCalories = proteinGrams * 4;
    const fatCaloriesTarget = dailyCalories * 0.25;
    const fatGrams = Math.round(fatCaloriesTarget / 9);
    const fatCalories = fatGrams * 9;
    const carbsCalories = Math.max(0, dailyCalories - (proteinCalories + fatCalories));
    const carbsGrams = Math.round(carbsCalories / 4);

    return {
      bmr,
      tdee,
      dailyCalories,
      proteinGrams,
      fatGrams,
      carbsGrams,
    };
  }, [age, sex, heightCm, weightKg, activityLevel, goal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (age < 13 || age > 120) {
      setFormError('Please enter a valid age between 13 and 120');
      return;
    }

    if (heightCm < 50 || heightCm > 300) {
      setFormError('Please enter a valid height between 50 and 300 cm');
      return;
    }

    if (weightKg < 20 || weightKg > 500) {
      setFormError('Please enter a valid weight between 20 and 500 kg');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveProfile({
        age,
        sex,
        heightCm,
        weightKg,
        activityLevel,
        goal,
      });
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save profile';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activityOptions: { value: ActivityLevel; title: string; desc: string }[] = [
    { value: 'sedentary', title: 'Sedentary', desc: 'Desk job, little to no exercise' },
    { value: 'lightly_active', title: 'Lightly Active', desc: 'Light exercise 1–3 days/week' },
    { value: 'moderately_active', title: 'Moderately Active', desc: 'Moderate exercise 3–5 days/week' },
    { value: 'very_active', title: 'Very Active', desc: 'Hard training 6–7 days/week' },
    { value: 'extremely_active', title: 'Extremely Active', desc: 'Physical job or elite athlete' },
  ];

  const goalOptions: { value: Goal; title: string; desc: string; adjustment: string }[] = [
    { value: 'lose_weight', title: 'Lose Weight', desc: 'Gradual fat loss', adjustment: '-500 kcal/day' },
    { value: 'maintain_weight', title: 'Maintain Weight', desc: 'Maintain current bodyweight', adjustment: 'Baseline TDEE' },
    { value: 'gain_weight', title: 'Gain Weight', desc: 'Lean muscle & mass gain', adjustment: '+300 kcal/day' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col py-10 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-white">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Personalized Nutrition Setup</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Let's customize your calorie targets, {user?.name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">
            We use the scientifically validated <strong>Mifflin-St Jeor</strong> formula to calculate your exact basal energy expenditure and daily macronutrient balance.
          </p>
        </div>

        {formError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Inputs Area (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Physical Stats Card */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Physical Metrics</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sex Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Biological Sex
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSex('male')}
                      className={`py-2.5 px-4 rounded-xl text-sm font-medium border text-center transition cursor-pointer ${
                        sex === 'male'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      onClick={() => setSex('female')}
                      className={`py-2.5 px-4 rounded-xl text-sm font-medium border text-center transition cursor-pointer ${
                        sex === 'female'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      Female
                    </button>
                  </div>
                </div>

                {/* Age */}
                <div>
                  <label htmlFor="age" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Age (Years)
                  </label>
                  <input
                    id="age"
                    type="number"
                    min="13"
                    max="120"
                    value={age || ''}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-sm"
                    required
                  />
                </div>

                {/* Height */}
                <div>
                  <label htmlFor="height" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-slate-400" />
                    Height (cm)
                  </label>
                  <input
                    id="height"
                    type="number"
                    min="50"
                    max="300"
                    step="0.5"
                    value={heightCm || ''}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-sm"
                    required
                  />
                </div>

                {/* Weight */}
                <div>
                  <label htmlFor="weight" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-slate-400" />
                    Weight (kg)
                  </label>
                  <input
                    id="weight"
                    type="number"
                    min="20"
                    max="500"
                    step="0.1"
                    value={weightKg || ''}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Activity Level Card */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Daily Activity Level</span>
              </h2>

              <div className="space-y-2.5">
                {activityOptions.map((opt) => (
                  <label
                    key={opt.value}
                    onClick={() => setActivityLevel(opt.value)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                      activityLevel === opt.value
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <span className={`text-sm font-semibold block ${activityLevel === opt.value ? 'text-emerald-300' : 'text-slate-200'}`}>
                        {opt.title}
                      </span>
                      <span className="text-xs text-slate-400">{opt.desc}</span>
                    </div>
                    {activityLevel === opt.value && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Primary Goal Card */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-rose-400" />
                <span>Primary Nutrition Goal</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {goalOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGoal(opt.value)}
                    className={`p-4 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                      goal === opt.value
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <span className={`text-sm font-bold block ${goal === opt.value ? 'text-emerald-300' : 'text-slate-200'}`}>
                        {opt.title}
                      </span>
                      <span className="text-xs text-slate-400 mt-0.5 block">{opt.desc}</span>
                    </div>
                    <span className="mt-3 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 inline-block self-start">
                      {opt.adjustment}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky Target Preview Sidebar (1 col) */}
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl sticky top-24">
              <div className="flex items-center gap-2 text-white font-bold text-base mb-1">
                <Flame className="w-5 h-5 text-emerald-400" />
                <h3>Your Calculated Target</h3>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                Calculated dynamically from your physical parameters
              </p>

              {previewTargets ? (
                <div className="space-y-5">
                  {/* Big Calorie Pill */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/60 to-slate-950 border border-emerald-500/30 text-center">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      Daily Calorie Budget
                    </span>
                    <div className="text-3xl font-extrabold text-white mt-1 font-mono">
                      {previewTargets.dailyCalories.toLocaleString()}{' '}
                      <span className="text-sm font-normal text-slate-400 font-sans">kcal/day</span>
                    </div>
                  </div>

                  {/* Metabolic Breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">BMR</span>
                      <span className="font-mono font-semibold text-slate-200">{previewTargets.bmr} kcal</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">TDEE</span>
                      <span className="font-mono font-semibold text-slate-200">{previewTargets.tdee} kcal</span>
                    </div>
                  </div>

                  {/* Macronutrient Distribution */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
                      Daily Macronutrients
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-blue-400"></span>
                          <span className="text-slate-300">Protein (1.8g/kg)</span>
                        </div>
                        <span className="font-mono font-bold text-blue-400">{previewTargets.proteinGrams} g</span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                          <span className="text-slate-300">Fats (25% kcal)</span>
                        </div>
                        <span className="font-mono font-bold text-amber-400">{previewTargets.fatGrams} g</span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                          <span className="text-slate-300">Carbohydrates</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-400">{previewTargets.carbsGrams} g</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-500">
                  Enter your physical metrics to see your calculated targets.
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition duration-150 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <span>Save & Launch Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
