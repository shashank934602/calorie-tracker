import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  AiCoachClientResponse,
  DailySummaryResponse,
  WeightSummary,
  askAiCoachApi,
  getDailySummaryApi,
  getWeightSummaryApi,
} from '../services/api';
import {
  Sparkles,
  ArrowLeft,
  Send,
  Loader2,
  Bot,
  User as UserIcon,
  Flame,
  Scale,
  ShieldAlert,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedActions?: string[];
  contextHighlights?: {
    remainingCalories: number;
    remainingProtein: number;
    currentStreak: number;
  };
  disclaimer?: string;
}

const STARTER_PROMPTS = [
  '📊 Review today’s intake & remaining budget',
  '🍗 Suggest a dinner to hit my protein goal',
  '🔥 How is my 7-day consistency looking?',
  '📉 Analyze my body weight progression',
];

export default function AiCoachPage(): React.JSX.Element {
  const { token, profileData, user } = useAuth();

  const [inputMessage, setInputMessage] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [dailySummary, setDailySummary] = useState<DailySummaryResponse | null>(null);
  const [weightSummary, setWeightSummary] = useState<WeightSummary | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Load today's snapshot and weight metrics for sidebar
  useEffect(() => {
    if (!token) return;
    const fetchContextData = async () => {
      try {
        const [sum, weight] = await Promise.all([
          getDailySummaryApi(token),
          getWeightSummaryApi(token).catch(() => null),
        ]);
        setDailySummary(sum);
        if (weight) setWeightSummary(weight);
      } catch (err) {
        console.warn('Failed to load coach context snapshot:', err);
      }
    };
    fetchContextData();
  }, [token]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const remainingCals = dailySummary?.remaining.calories ?? profileData?.targets.dailyCalories ?? 2000;
      const remainingProt = dailySummary?.remaining.protein ?? profileData?.targets.proteinGrams ?? 140;

      setMessages([
        {
          id: 'welcome-msg',
          sender: 'assistant',
          text:
            `Hello ${user?.name || 'there'}! I'm your **CalorieTrack AI Nutrition Coach**.\n\n` +
            `I'm connected to your verified tracking data. Today you have **${remainingCals} kcal** and **${remainingProt}g of protein** remaining.\n\n` +
            `Ask me for meal ideas, habit advice, or an explanation of your recent consistency and weight trends!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedActions: [
            'What should I eat for dinner?',
            'How is my weekly deficit tracking?',
            'Give me high-protein snack ideas',
          ],
          disclaimer:
            'CalorieTrack AI Coach provides educational suggestions based on your verified application data. It is not a substitute for clinical or medical advice.',
        },
      ]);
    }
  }, [dailySummary, profileData, user, messages.length]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isSending || !token) return;

    const userMessageId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsSending(true);

    try {
      const response: AiCoachClientResponse = await askAiCoachApi(token, { message: text });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: response.suggestedActions,
        contextHighlights: response.contextHighlights,
        disclaimer: response.disclaimer,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to reach coach';
      const errorAssistantMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ **Error**: ${errMsg}. Please check your connection or try again in a moment.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorAssistantMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  // Helper to format basic markdown (bold, lists, headings)
  const renderFormattedMarkdown = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 text-sm leading-relaxed">
        {lines.map((line, idx) => {
          if (line.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-bold text-white text-sm mt-2 mb-1">
                {line.replace('### ', '')}
              </h4>
            );
          }
          if (line.startsWith('- ')) {
            const parsed = line.replace('- ', '');
            return (
              <li key={idx} className="ml-4 list-disc text-slate-200">
                <span dangerouslySetInnerHTML={{ __html: formatBold(parsed) }} />
              </li>
            );
          }
          if (line.trim() === '') {
            return <div key={idx} className="h-1" />;
          }
          return (
            <p key={idx} className="text-slate-200" dangerouslySetInnerHTML={{ __html: formatBold(line) }} />
          );
        })}
      </div>
    );
  };

  const formatBold = (text: string) => {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
  };

  const remaining = dailySummary?.remaining || { calories: 2000, protein: 140, carbs: 220, fat: 60 };
  const consumed = dailySummary?.consumed || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const targetCalories = dailySummary?.targets?.calories ?? profileData?.targets?.dailyCalories ?? 2000;
  const targetProtein = dailySummary?.targets?.protein ?? profileData?.targets?.proteinGrams ?? 140;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-500 selection:text-white">
      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">AI Nutrition Coach</span>
                <span className="text-[11px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 uppercase flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>Gemini Grounded</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">Personalized habit guidance & verified meal suggestions</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col lg:flex-row gap-6 w-full">
        {/* Chat Thread Column */}
        <div className="flex-1 flex flex-col bg-slate-900/60 border border-slate-800 rounded-2xl shadow-xl overflow-hidden min-h-[600px] max-h-[750px]">
          {/* Chat Messages Scrollable Area */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 animate-fadeIn ${
                  msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    msg.sender === 'user'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                  }`}
                >
                  {msg.sender === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble Container */}
                <div className={`max-w-[85%] sm:max-w-[75%] space-y-2`}>
                  <div
                    className={`p-4 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-emerald-600/20 border border-emerald-500/30 text-white rounded-tr-none'
                        : 'bg-slate-950/80 border border-slate-800/80 rounded-tl-none shadow-md'
                    }`}
                  >
                    {msg.sender === 'assistant' ? (
                      renderFormattedMarkdown(msg.text)
                    ) : (
                      <p className="text-sm leading-relaxed text-slate-100">{msg.text}</p>
                    )}

                    <div className="mt-2 text-[10px] text-slate-500 text-right font-mono">
                      {msg.timestamp}
                    </div>
                  </div>

                  {/* Suggested Quick Actions */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.suggestedActions.map((action, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={() => handleSendMessage(action)}
                          disabled={isSending}
                          className="px-2.5 py-1 rounded-lg text-xs bg-slate-800/90 hover:bg-purple-900/40 text-purple-300 border border-purple-500/20 hover:border-purple-500/40 transition cursor-pointer flex items-center gap-1"
                        >
                          <Lightbulb className="w-3 h-3 text-purple-400" />
                          <span>{action}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* AI Disclaimer */}
                  {msg.disclaimer && (
                    <p className="text-[10px] text-slate-500 italic flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-slate-600 flex-shrink-0" />
                      <span>{msg.disclaimer}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex items-center gap-3 animate-fadeIn">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 rounded-tl-none flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  <span>Coach is analyzing your verified nutrition metrics...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Starter Prompt Chips */}
          {messages.length <= 1 && (
            <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-950/40">
              <span className="text-[11px] text-slate-400 font-semibold mb-1.5 block">Quick Prompts:</span>
              <div className="flex flex-wrap gap-1.5">
                {STARTER_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    disabled={isSending}
                    className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Box */}
          <form onSubmit={handleFormSubmit} className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value.slice(0, 500))}
              placeholder="Ask your coach (e.g. 'What high-protein snack fits my remaining calories?')..."
              disabled={isSending}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/60"
            />

            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
              {inputMessage.length}/500
            </span>

            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold transition shadow-md shadow-purple-600/30 cursor-pointer"
              title="Send Message"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>

        {/* Sidebar: Verified Application Context Snapshot */}
        <div className="w-full lg:w-80 space-y-4">
          {/* Live Nutrition Snapshot Card */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-emerald-400" />
                <span>Today's Verified Targets</span>
              </h3>
              <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">
                Live Data
              </span>
            </div>

            <div className="space-y-3">
              {/* Calories */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Remaining Calories</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {remaining.calories} kcal
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Consumed: {consumed.calories} / {targetCalories} kcal
                </div>
              </div>

              {/* Protein */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Remaining Protein</span>
                  <span className="font-mono font-bold text-blue-400">
                    {remaining.protein} g
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Consumed: {consumed.protein} / {targetProtein} g
                </div>
              </div>

              {/* Carbs & Fat */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500">Remaining Carbs</span>
                  <div className="font-mono font-bold text-emerald-400 mt-0.5">
                    {remaining.carbs}g
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500">Remaining Fat</span>
                  <div className="font-mono font-bold text-amber-400 mt-0.5">
                    {remaining.fat}g
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Goal & Weight Progression Card */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-purple-400" />
              <span>Weight Progress</span>
            </h3>

            <div className="text-xs text-slate-400 space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span>Current Weight:</span>
                <strong className="text-white">
                  {weightSummary?.currentWeight ?? profileData?.profile?.weightKg ?? 75} kg
                </strong>
              </div>
              {profileData?.profile?.targetWeightKg && (
                <div className="flex justify-between">
                  <span>Target Weight:</span>
                  <strong className="text-purple-400">
                    {profileData.profile.targetWeightKg} kg
                  </strong>
                </div>
              )}
              <div className="flex justify-between">
                <span>Total Change:</span>
                <strong className="text-emerald-400">
                  {(weightSummary?.totalChange ?? 0) > 0 ? `+${weightSummary?.totalChange}` : weightSummary?.totalChange ?? 0} kg
                </strong>
              </div>
            </div>
          </div>

          {/* Safety & Educational Notice */}
          <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 text-[11px] text-slate-400 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-purple-300 mb-1">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>AI Coaching Disclaimer</span>
            </div>
            CalorieTrack AI Coach interprets your logged entries to provide habit coaching. Always consult a healthcare professional before beginning extreme dietary changes.
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        CalorieTrack • Grounded AI Nutrition Coach
      </footer>
    </div>
  );
}
