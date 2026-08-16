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

export interface Profile {
  id: string;
  userId: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
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

export interface AuthResponseData {
  user: User;
  token: string;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  errors?: Record<string, unknown>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
      headers: {
        Accept: 'application/json',
      },
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
 * Register a new user
 */
export async function registerApi(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponseData> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json: ApiResponse<AuthResponseData> = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Registration failed');
  }

  if (!json.data) {
    throw new Error('Invalid response received from server');
  }

  return json.data;
}

/**
 * Login with email and password
 */
export async function loginApi(payload: {
  email: string;
  password: string;
}): Promise<AuthResponseData> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json: ApiResponse<AuthResponseData> = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Login failed');
  }

  if (!json.data) {
    throw new Error('Invalid response received from server');
  }

  return json.data;
}

/**
 * Get current authenticated user profile using JWT token
 */
export async function getMeApi(token: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const json: ApiResponse<{ user: User }> = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to authenticate session');
  }

  if (!json.data?.user) {
    throw new Error('User profile data missing in response');
  }

  return json.data.user;
}

/**
 * Get authenticated user's nutrition profile and calculated targets
 */
export async function getProfileApi(token: string): Promise<ProfileWithTargets | null> {
  const response = await fetch(`${API_BASE_URL}/api/profile`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const json: ApiResponse<ProfileWithTargets | null> = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to fetch user profile');
  }

  return json.data || null;
}

/**
 * Create or update authenticated user's nutrition profile
 */
export async function updateProfileApi(
  token: string,
  payload: {
    age: number;
    sex: Sex;
    heightCm: number;
    weightKg: number;
    activityLevel: ActivityLevel;
    goal: Goal;
  }
): Promise<ProfileWithTargets> {
  const response = await fetch(`${API_BASE_URL}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const json: ApiResponse<ProfileWithTargets> = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to save profile');
  }

  if (!json.data) {
    throw new Error('Invalid profile response data from server');
  }

  return json.data;
}

/**
 * Get authenticated user's calculated nutrition targets
 */
export async function getNutritionTargetsApi(token: string): Promise<NutritionTargets> {
  const response = await fetch(`${API_BASE_URL}/api/nutrition/targets`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const json: ApiResponse<NutritionTargets> = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Failed to fetch nutrition targets');
  }

  if (!json.data) {
    throw new Error('Nutrition targets data missing in response');
  }

  return json.data;
}
