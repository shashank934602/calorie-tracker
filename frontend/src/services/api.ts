export interface HealthCheckResponse {
  status: string;
  message: string;
  timestamp: string;
  environment: string;
  uptime: number;
  version: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export type Sex = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extremely_active';

export type Goal = 'lose_weight' | 'maintain_weight' | 'gain_weight';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Profile {
  id: string;
  userId: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number | null;
  activityLevel: ActivityLevel;
  goal: Goal;
  createdAt: string;
  updatedAt: string;
}

export interface MacroBreakdown {
  proteinGrams: number;
  proteinCalories: number;
  fatGrams: number;
  fatCalories: number;
  carbsGrams: number;
  carbsCalories: number;
}

export interface NutritionTargets {
  bmr: number;
  tdee: number;
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  macros: MacroBreakdown;
}

export interface ProfileWithTargets {
  profile: Profile;
  targets: NutritionTargets;
}

export interface Food {
  id: string;
  name: string;
  servingUnit: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  createdAt: string;
  updatedAt: string;
}

export interface CalculatedFoodNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodEntry {
  id: string;
  userId: string;
  foodId: string;
  quantityGrams: number;
  mealType: MealType;
  consumedAt: string;
  createdAt: string;
  updatedAt: string;
  food: Food;
  calculatedNutrition: CalculatedFoodNutrition;
}

export interface MealGroup {
  mealType: MealType;
  entries: FoodEntry[];
  totals: CalculatedFoodNutrition;
}

export interface DailySummaryResponse {
  date: string;
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  consumed: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  remaining: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  meals: {
    breakfast: MealGroup;
    lunch: MealGroup;
    dinner: MealGroup;
    snack: MealGroup;
  };
}

export interface WeightEntry {
  id: string;
  userId: string;
  weightKg: number;
  recordedAt: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeightSummary {
  startingWeight: number;
  currentWeight: number;
  targetWeight: number | null;
  totalChange: number;
  remainingToGoal: number | null;
  percentageProgress: number | null;
  totalEntries: number;
  latestRecordedAt: string | null;
}

export interface AlternateCandidate {
  id: string;
  name: string;
  servingUnit: string;
  caloriesPer100g: number;
}

export interface AiFoodCandidateItem {
  rawText: string;
  foodId: string | null;
  foodName: string;
  matchedFoodName: string | null;
  quantityInServingUnit: number;
  servingUnit: string;
  matchConfidence: 'high' | 'medium' | 'low' | 'none';
  needsConfirmation: boolean;
  conversionNote: string | null;
  calculatedNutrition: CalculatedFoodNutrition | null;
  alternateCandidates?: AlternateCandidate[];
}

export interface AiFoodParseResponse {
  mealType: MealType;
  originalText: string;
  items: AiFoodCandidateItem[];
  totals: CalculatedFoodNutrition;
  requiresUserClarification: boolean;
}

export interface SessionInfo {
  id: string;
  createdAt: string;
  lastUsedAt: string;
  userAgent: string | null;
  ipAddress: string | null;
  isCurrent: boolean;
}

export interface AuthResponseData {
  user: User;
  accessToken: string;
  token?: string;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  errors?: Record<string, unknown>;
  code?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Global single-flight refresh mutex
let activeRefreshPromise: Promise<string | null> | null = null;
let onTokenUpdatedCallback: ((newToken: string) => void) | null = null;
let onSessionExpiredCallback: (() => void) | null = null;

export function registerAuthCallbacks(callbacks: {
  onTokenUpdated: (newToken: string) => void;
  onSessionExpired: () => void;
}) {
  onTokenUpdatedCallback = callbacks.onTokenUpdated;
  onSessionExpiredCallback = callbacks.onSessionExpired;
}

/**
 * Single-flight silent refresh ensuring concurrent 401s share a single network call
 */
export async function singleFlightRefresh(): Promise<string | null> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const data = await refreshTokenApi();
      const newToken = data.accessToken || data.token || null;
      if (newToken && onTokenUpdatedCallback) {
        onTokenUpdatedCallback(newToken);
      }
      return newToken;
    } catch {
      if (onSessionExpiredCallback) {
        onSessionExpiredCallback();
      }
      return null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

/**
 * Centralized authenticated fetch wrapper with automatic 401 interception and single-flight retry
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit,
  token: string
): Promise<Response> {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Accept', 'application/json');

  let response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  // If 401 Unauthorized, attempt single-flight refresh and retry ONCE
  if (response.status === 401) {
    const newToken = await singleFlightRefresh();
    if (newToken) {
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set('Authorization', `Bearer ${newToken}`);
      retryHeaders.set('Accept', 'application/json');

      response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: retryHeaders,
      });
    }
  }

  return response;
}

/**
 * Health check endpoint
 */
export async function checkBackendHealth(): Promise<{
  data: HealthCheckResponse | null;
  latencyMs: number;
  error: string | null;
}> {
  const startTime = performance.now();
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: HealthCheckResponse = await response.json();
    return { data, latencyMs, error: null };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    const errorMessage = err instanceof Error ? err.message : 'Unknown network error';
    return { data: null, latencyMs, error: errorMessage };
  }
}

/**
 * Auth API clients (Credentials: 'include' for HttpOnly refresh cookie)
 */
export async function registerApi(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponseData> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  const json: ApiResponse<AuthResponseData> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Registration failed');
  }
  return json.data!;
}

export async function loginApi(payload: {
  email: string;
  password: string;
}): Promise<AuthResponseData> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  const json: ApiResponse<AuthResponseData> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Login failed');
  }
  return json.data!;
}

export async function googleAuthApi(payload: {
  idToken: string;
}): Promise<AuthResponseData> {
  const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  const json: ApiResponse<AuthResponseData> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Google authentication failed');
  }
  return json.data!;
}

export async function refreshTokenApi(): Promise<AuthResponseData> {
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  const json: ApiResponse<AuthResponseData> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Session expired or invalid');
  }
  return json.data!;
}

export async function logoutApi(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    console.warn('Logout request failed:', err);
  }
}

export async function logoutAllApi(token: string): Promise<void> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/auth/logout-all`,
    { method: 'POST' },
    token
  );

  const json: ApiResponse<unknown> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to logout from all devices');
  }
}

export async function getSessionsApi(token: string): Promise<SessionInfo[]> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/auth/sessions`,
    { method: 'GET' },
    token
  );

  const json: ApiResponse<SessionInfo[]> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to fetch active sessions');
  }
  return json.data || [];
}

export async function revokeSessionApi(token: string, sessionId: string): Promise<void> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/auth/sessions/${sessionId}`,
    { method: 'DELETE' },
    token
  );

  const json: ApiResponse<unknown> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to revoke session');
  }
}

export async function getMeApi(token: string): Promise<User> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/auth/me`,
    { method: 'GET' },
    token
  );

  const json: ApiResponse<{ user: User }> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to authenticate session');
  }
  return json.data!.user;
}

/**
 * Profile & Targets API clients
 */
export async function getProfileApi(token: string): Promise<ProfileWithTargets | null> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/profile`,
    { method: 'GET' },
    token
  );

  const json: ApiResponse<ProfileWithTargets | null> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to fetch user profile');
  }
  return json.data || null;
}

export async function updateProfileApi(
  token: string,
  payload: {
    age: number;
    sex: Sex;
    heightCm: number;
    weightKg: number;
    targetWeightKg?: number | null;
    activityLevel: ActivityLevel;
    goal: Goal;
  }
): Promise<ProfileWithTargets> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/profile`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    token
  );

  const json: ApiResponse<ProfileWithTargets> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to update profile');
  }
  return json.data!;
}

/**
 * Food Database API clients
 */
export async function getFoodsApi(
  token: string,
  params?: {
    search?: string;
    page?: number;
    limit?: number;
  }
): Promise<{
  foods: Food[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.append('search', params.search);
  if (params?.page) searchParams.append('page', String(params.page));
  if (params?.limit) searchParams.append('limit', String(params.limit));

  const url = `${API_BASE_URL}/api/foods${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const response = await authenticatedFetch(url, { method: 'GET' }, token);

  const json: ApiResponse<Food[]> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to fetch food catalog');
  }

  return {
    foods: json.data || [],
    pagination: json.pagination || { total: 0, page: 1, limit: 50, totalPages: 0 },
  };
}

export async function searchFoodsApi(
  token: string,
  query?: string,
  limit?: number
): Promise<{
  foods: Food[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}> {
  return getFoodsApi(token, { search: query, limit: limit || 50 });
}

export async function createFoodApi(
  token: string,
  payload: {
    name: string;
    servingUnit?: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
  }
): Promise<Food> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/foods`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    token
  );

  const json: ApiResponse<Food> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to create food item');
  }
  return json.data!;
}

/**
 * Food Entry & Daily Log API clients
 */
export async function getFoodEntriesApi(
  token: string,
  date?: string
): Promise<FoodEntry[]> {
  const offset = new Date().getTimezoneOffset();
  const url = `${API_BASE_URL}/api/food-entries${date ? `?date=${date}&timezoneOffset=${offset}` : `?timezoneOffset=${offset}`}`;
  const response = await authenticatedFetch(url, { method: 'GET' }, token);

  const json: ApiResponse<FoodEntry[]> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to fetch logged food entries');
  }
  return json.data || [];
}

export async function createFoodEntryApi(
  token: string,
  payload: {
    foodId: string;
    quantityGrams: number;
    mealType: MealType;
    consumedAt?: string;
  }
): Promise<FoodEntry> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/food-entries`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    token
  );

  const json: ApiResponse<FoodEntry> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to log food entry');
  }
  return json.data!;
}

export async function updateFoodEntryApi(
  token: string,
  id: string,
  payload: {
    quantityGrams?: number;
    mealType?: MealType;
    consumedAt?: string;
  }
): Promise<FoodEntry> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/food-entries/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    token
  );

  const json: ApiResponse<FoodEntry> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to update food entry');
  }
  return json.data!;
}

export async function deleteFoodEntryApi(token: string, id: string): Promise<void> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/food-entries/${id}`,
    { method: 'DELETE' },
    token
  );

  const json: ApiResponse<unknown> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to delete food entry');
  }
}

export async function getDailySummaryApi(
  token: string,
  date?: string
): Promise<DailySummaryResponse> {
  const offset = new Date().getTimezoneOffset();
  const url = `${API_BASE_URL}/api/food-entries/summary${date ? `?date=${date}&timezoneOffset=${offset}` : `?timezoneOffset=${offset}`}`;
  const response = await authenticatedFetch(url, { method: 'GET' }, token);

  const json: ApiResponse<DailySummaryResponse> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to fetch daily summary');
  }
  return json.data!;
}

/**
 * Weight Tracking API clients
 */
export async function getWeightEntriesApi(
  token: string,
  paramsOrOrder?:
    | {
        startDate?: string;
        endDate?: string;
        limit?: number;
        order?: string;
      }
    | 'asc'
    | 'desc',
  limitParam?: number
): Promise<WeightEntry[]> {
  const searchParams = new URLSearchParams();

  if (typeof paramsOrOrder === 'object' && paramsOrOrder !== null) {
    if (paramsOrOrder.startDate) searchParams.append('startDate', paramsOrOrder.startDate);
    if (paramsOrOrder.endDate) searchParams.append('endDate', paramsOrOrder.endDate);
    if (paramsOrOrder.limit) searchParams.append('limit', String(paramsOrOrder.limit));
  } else if (typeof paramsOrOrder === 'string') {
    if (limitParam) searchParams.append('limit', String(limitParam));
  }

  const url = `${API_BASE_URL}/api/weight${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const response = await authenticatedFetch(url, { method: 'GET' }, token);

  const json: ApiResponse<WeightEntry[]> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to fetch weight logs');
  }
  return json.data || [];
}

export async function listWeightEntriesApi(
  token: string,
  order?: 'asc' | 'desc',
  limit?: number
): Promise<WeightEntry[]> {
  return getWeightEntriesApi(token, order, limit);
}

export async function createWeightEntryApi(
  token: string,
  payload: {
    weightKg: number;
    recordedAt?: string;
    note?: string | null;
  }
): Promise<WeightEntry> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/weight`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    token
  );

  const json: ApiResponse<WeightEntry> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to log weight entry');
  }
  return json.data!;
}

export async function updateWeightEntryApi(
  token: string,
  id: string,
  payload: {
    weightKg?: number;
    recordedAt?: string;
    note?: string | null;
  }
): Promise<WeightEntry> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/weight/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    token
  );

  const json: ApiResponse<WeightEntry> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to update weight entry');
  }
  return json.data!;
}

export async function deleteWeightEntryApi(token: string, id: string): Promise<void> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/weight/${id}`,
    { method: 'DELETE' },
    token
  );

  const json: ApiResponse<unknown> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to delete weight log');
  }
}

export async function getWeightSummaryApi(token: string): Promise<WeightSummary> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/weight/summary`,
    { method: 'GET' },
    token
  );

  const json: ApiResponse<WeightSummary> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to fetch weight progress summary');
  }
  return json.data!;
}

/**
 * AI Food Logging API client
 */
export async function parseFoodWithAiApi(
  token: string,
  payloadOrText: { text: string; mealType?: MealType } | string,
  mealTypeParam?: MealType
): Promise<AiFoodParseResponse> {
  const payload =
    typeof payloadOrText === 'string'
      ? { text: payloadOrText, mealType: mealTypeParam }
      : payloadOrText;

  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/ai/food-parse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    token
  );

  const json: ApiResponse<AiFoodParseResponse> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to parse food description with AI');
  }
  return json.data!;
}

/**
 * Analytics & Trends API clients
 */
export interface AnalyticsSummaryResponse {
  period: {
    range: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    loggedDaysCount: number;
  };
  adherence: {
    totalLoggedDays: number;
    loggingRatePct: number;
    currentStreakDays: number;
    daysOnBudget: number;
    daysOverBudget: number;
    daysUnderBudget: number;
    targetAdherencePct: number;
  };
  averages: {
    dailyCalories: number;
    dailyProtein: number;
    dailyCarbs: number;
    dailyFat: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    targetCalories: number;
    calorieDelta: number;
  };
  macroSplit: {
    proteinPct: number;
    carbsPct: number;
    fatPct: number;
    targetProteinPct: number;
    targetCarbsPct: number;
    targetFatPct: number;
  };
  mealDistribution: {
    breakfast: { calories: number; percentage: number };
    lunch: { calories: number; percentage: number };
    dinner: { calories: number; percentage: number };
    snack: { calories: number; percentage: number };
  };
  energyBalance: {
    estimatedNetPeriodDeficit: number;
    estimatedWeightChangeKg: number;
    actualWeightChangeKg: number | null;
    actualRecordedWeightChangeKg?: number | null;
  };
}

export interface DailyAggregatedMetrics {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  targetCalories: number;
  meals: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snack: number;
  };
  weightKg: number | null;
  hasLogs: boolean;
}

export interface AnalyticsTrendsResponse {
  period: {
    range: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    loggedDaysCount: number;
  };
  days: DailyAggregatedMetrics[];
}

export async function getAnalyticsSummaryApi(
  token: string,
  params: {
    range?: '7d' | '30d' | '90d' | 'custom';
    startDate?: string;
    endDate?: string;
  }
): Promise<AnalyticsSummaryResponse> {
  const offset = new Date().getTimezoneOffset();
  const searchParams = new URLSearchParams();
  if (params.range) searchParams.append('range', params.range);
  if (params.startDate) searchParams.append('startDate', params.startDate);
  if (params.endDate) searchParams.append('endDate', params.endDate);
  searchParams.append('timezoneOffset', String(offset));

  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/analytics/summary?${searchParams.toString()}`,
    { method: 'GET' },
    token
  );

  const json: ApiResponse<AnalyticsSummaryResponse> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to fetch analytics summary');
  }
  return json.data!;
}

export async function getAnalyticsTrendsApi(
  token: string,
  params: {
    range?: '7d' | '30d' | '90d' | 'custom';
    startDate?: string;
    endDate?: string;
  }
): Promise<AnalyticsTrendsResponse> {
  const offset = new Date().getTimezoneOffset();
  const searchParams = new URLSearchParams();
  if (params.range) searchParams.append('range', params.range);
  if (params.startDate) searchParams.append('startDate', params.startDate);
  if (params.endDate) searchParams.append('endDate', params.endDate);
  searchParams.append('timezoneOffset', String(offset));

  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/analytics/trends?${searchParams.toString()}`,
    { method: 'GET' },
    token
  );

  const json: ApiResponse<AnalyticsTrendsResponse> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to fetch analytics trends');
  }
  return json.data!;
}

/**
 * AI Nutrition Coach API client
 */
export interface AiCoachClientResponse {
  reply: string;
  suggestedActions: string[];
  contextHighlights: {
    remainingCalories: number;
    remainingProtein: number;
    currentStreak: number;
  };
  disclaimer: string;
}

export async function askAiCoachApi(
  token: string,
  payload: {
    message: string;
  }
): Promise<AiCoachClientResponse> {
  const offset = new Date().getTimezoneOffset();
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/ai/coach/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: payload.message,
        timezoneOffset: offset,
      }),
    },
    token
  );

  const json: ApiResponse<AiCoachClientResponse> = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to communicate with AI Coach');
  }
  return json.data!;
}
