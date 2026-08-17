import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  WeightEntry, 
  createWeightEntryApi, 
  updateWeightEntryApi 
} from '../services/api';
import { 
  X, 
  Scale, 
  Calendar as CalendarIcon, 
  Loader2, 
  AlertCircle, 
  Plus, 
  Minus 
} from 'lucide-react';

interface LogWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entryToEdit?: WeightEntry | null;
  defaultWeightKg?: number;
}

export const LogWeightModal: React.FC<LogWeightModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  entryToEdit = null,
  defaultWeightKg = 75,
}) => {
  const { token } = useAuth();

  const [weightKg, setWeightKg] = useState<number>(defaultWeightKg);
  const [recordedDate, setRecordedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (entryToEdit) {
        setWeightKg(entryToEdit.weightKg);
        setRecordedDate(new Date(entryToEdit.recordedAt).toISOString().split('T')[0]);
        setNote(entryToEdit.note || '');
      } else {
        setWeightKg(defaultWeightKg || 75);
        setRecordedDate(new Date().toISOString().split('T')[0]);
        setNote('');
      }
    }
  }, [isOpen, entryToEdit, defaultWeightKg]);

  if (!isOpen) return null;

  const handleAdjustWeight = (delta: number) => {
    setWeightKg((prev) => Math.round((Math.max(20, Math.min(500, prev + delta))) * 10) / 10);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setErrorMessage(null);

    if (weightKg < 20 || weightKg > 500) {
      setErrorMessage('Please enter a realistic weight between 20 kg and 500 kg.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Build ISO timestamp from the selected calendar date
      const recordedAtIso = `${recordedDate}T12:00:00.000Z`;

      if (entryToEdit) {
        await updateWeightEntryApi(token, entryToEdit.id, {
          weightKg,
          recordedAt: recordedAtIso,
          note: note.trim() || null,
        });
      } else {
        await createWeightEntryApi(token, {
          weightKg,
          recordedAt: recordedAtIso,
          note: note.trim() || null,
        });
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record weight';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Scale className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-white text-base">
              {entryToEdit ? 'Edit Weight Entry' : 'Log Body Weight'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Weight Input with Steppers */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Body Weight (kg)
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleAdjustWeight(-0.5)}
                className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 flex items-center justify-center font-bold text-lg active:scale-95 transition cursor-pointer"
                title="-0.5 kg"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="500"
                  value={weightKg || ''}
                  onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                  className="block w-full text-center py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-2xl font-extrabold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                  kg
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleAdjustWeight(0.5)}
                className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 flex items-center justify-center font-bold text-lg active:scale-95 transition cursor-pointer"
                title="+0.5 kg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
              Date Recorded
            </label>
            <input
              type="date"
              value={recordedDate}
              onChange={(e) => setRecordedDate(e.target.value)}
              className="block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
              required
            />
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Note (Optional)
            </label>
            <textarea
              rows={2}
              maxLength={500}
              placeholder="e.g. Morning fasting weight, post workout, etc."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="block w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 shadow-md shadow-emerald-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{entryToEdit ? 'Update Measurement' : 'Record Weight'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
