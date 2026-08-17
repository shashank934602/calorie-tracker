import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sex, ActivityLevel, Goal } from '../services/api';
import { 
  ArrowLeft, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Flame, 
  Activity, 
  Scale, 
  Ruler, 
  HeartHandshake,
  Check
} from 'lucide-react';

export default function ProfilePage(): React.JSX.Element {
  const { profileData, saveProfile } = useAuth();
  const navigate = useNavigate();

  const existing = profileData?.profile;

  const [age, setAge] = useState<number>(existing?.age || 28);
  const [sex, setSex] = useState<Sex>(existing?.sex || 'male');
  const [heightCm, setHeightCm] = useState<number>(existing?.heightCm || 175);
  const [weightKg, setWeightKg] = useState<number>(existing?.weightKg || 75);
  const [targetWeightKg, setTargetWeightKg] = useState<number | ''>(existing?.targetWeightKg || '');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(existing?.activityLevel || 'moderately_active');
  const [goal, setGoal] = useState<Goal>(existing?.goal || 'maintain_weight');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setAge(existing.age);
      setSex(existing.sex);
      setHeightCm(existing.heightCm);
      setWeightKg(existing.weightKg);
      setTargetWeightKg(existing.targetWeightKg || '');
      setActivityLevel(existing.activityLevel);
      setGoal(existing.goal);
    }
  }, [existing]);

  // Live calculation preview
  const previewTargets = useMemo(() => {
    if (!age || !heightCm || !weightKg) return null;

    const baseBmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
    const bmr = Math.round(sex === 'male' ? baseBmr + 5 : baseBmr - 161);

    const multipliers: Record<ActivityLevel, number> = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9,
    };
    const tdee = Math.round(bmr * (multipliers[activityLevel] || 1.2));

    let dailyCalories = tdee;
    if (goal === 'lose_weight') dailyCalories = Math.round(tdee - 500);
    if (goal === 'gain_weight') dailyCalories = Math.round(tdee + 300);

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
    setSuccessMsg(null);

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
        targetWeightKg: targetWeightKg ? Number(targetWeightKg) : null,
        activityLevel,
        goal,
      });
      setSuccessMsg('Profile and calorie targets updated successfully!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
            <span className="font-bold text-base text-white">Edit Nutrition Profile</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {formError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-400 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Inputs Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Physical Metrics */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Physical Metrics</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div>
                  <label htmlFor="weight" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-slate-400" />
                    Current Weight (kg)
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

                {/* Target Weight (Optional) */}
                <div className="sm:col-span-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="targetWeight" className="block text-xs font-semibold text-sky-400 uppercase tracking-wider">
                      Goal Target Weight (kg) — Optional
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {goal === 'lose_weight'
                        ? 'Normally below current weight'
                        : goal === 'gain_weight'
                        ? 'Normally above current weight'
                        : 'Optional maintenance target'}
                    </span>
                  </div>
                  <input
                    id="targetWeight"
                    type="number"
                    min="20"
                    max="500"
                    step="0.1"
                    placeholder={`e.g. ${goal === 'lose_weight' ? (weightKg ? weightKg - 5 : 70) : goal === 'gain_weight' ? (weightKg ? weightKg + 5 : 80) : weightKg || 75} kg`}
                    value={targetWeightKg}
                    onChange={(e) => setTargetWeightKg(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Activity Level */}
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

            {/* Nutrition Goal */}
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

          {/* Target Preview Sidebar */}
          <div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl sticky top-24">
              <div className="flex items-center gap-2 text-white font-bold text-base mb-1">
                <Flame className="w-5 h-5 text-emerald-400" />
                <h3>Updated Targets</h3>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                Live recalculation based on modified metrics
              </p>

              {previewTargets ? (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/60 to-slate-950 border border-emerald-500/30 text-center">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      Daily Calorie Target
                    </span>
                    <div className="text-3xl font-extrabold text-white mt-1 font-mono">
                      {previewTargets.dailyCalories.toLocaleString()}{' '}
                      <span className="text-sm font-normal text-slate-400 font-sans">kcal</span>
                    </div>
                  </div>

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
              ) : null}

              <div className="mt-6 pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition duration-150 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
