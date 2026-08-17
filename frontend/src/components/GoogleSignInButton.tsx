import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: string | number;
              locale?: string;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  onSuccess?: () => void;
  redirectTo?: string;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  text = 'continue_with',
  onSuccess,
  redirectTo = '/dashboard',
}) => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const buttonContainerRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[GoogleAuth DEBUG] VITE_GOOGLE_CLIENT_ID loaded:', !!clientId, clientId ? `(starts with: ${clientId.substring(0, 12)}...)` : '(NOT SET in frontend/.env)');
    }

    if (!clientId) return;

    let isMounted = true;
    let pollInterval: NodeJS.Timeout | null = null;

    const handleCredentialResponse = async (response: { credential: string }) => {
      const hasCred = !!response?.credential;
      if (import.meta.env.DEV) {
        console.log('[GoogleAuth DEBUG] Credential callback fired. Credential present:', hasCred);
      }

      if (!hasCred) {
        setError('No credential received from Google');
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        if (import.meta.env.DEV) {
          console.log('[GoogleAuth DEBUG] Sending POST /api/auth/google...');
        }
        await loginWithGoogle(response.credential);
        if (import.meta.env.DEV) {
          console.log('[GoogleAuth DEBUG] POST /api/auth/google succeeded! Navigating...');
        }
        if (onSuccess) {
          onSuccess();
        } else {
          navigate(redirectTo, { replace: true });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Google authentication failed';
        if (import.meta.env.DEV) {
          console.error('[GoogleAuth DEBUG] POST /api/auth/google failed with error:', message);
        }
        setError(message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const tryRenderButton = () => {
      if (!isMounted) return false;
      if (!window.google?.accounts?.id || !buttonContainerRef.current) return false;

      try {
        if (import.meta.env.DEV) {
          console.log('[GoogleAuth DEBUG] Executing google.accounts.id.initialize()...');
        }
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
        });

        buttonContainerRef.current.innerHTML = '';
        if (import.meta.env.DEV) {
          console.log('[GoogleAuth DEBUG] Executing renderButton()...');
        }
        window.google.accounts.id.renderButton(buttonContainerRef.current, {
          theme: 'filled_black',
          size: 'large',
          text,
          shape: 'rectangular',
          width: '100%',
        });
        return true;
      } catch (err) {
        console.warn('[GoogleAuth DEBUG] renderButton error:', err);
        return false;
      }
    };

    // Load GSI script if not present
    const loadGsiScript = () => {
      const existingScript = document.getElementById('google-gsi-script');
      if (existingScript) {
        if (!tryRenderButton()) {
          // Poll every 50ms up to 2.5s until window.google is ready
          let attempts = 0;
          pollInterval = setInterval(() => {
            attempts++;
            if (tryRenderButton() || attempts > 50) {
              if (pollInterval) clearInterval(pollInterval);
            }
          }, 50);
        }
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (import.meta.env.DEV) {
          console.log('[GoogleAuth DEBUG] GSI SDK script loaded successfully.');
        }
        tryRenderButton();
      };
      script.onerror = () => {
        if (isMounted) setError('Failed to load Google Sign-In SDK (network or adblocker)');
      };
      document.body.appendChild(script);
    };

    loadGsiScript();

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [clientId, text, loginWithGoogle, navigate, onSuccess, redirectTo]);

  if (!clientId) {
    return (
      <div className="p-4 rounded-xl bg-slate-950/90 border border-amber-500/40 text-xs text-slate-300 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-amber-400">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Google Sign-In Configuration Required</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          To enable live Google Sign-In, add your Google OAuth Client ID to <code className="text-amber-300">frontend/.env</code>:
        </p>
        <div className="p-2 rounded bg-slate-900 font-mono text-[11px] text-slate-200 select-all border border-slate-800">
          VITE_GOOGLE_CLIENT_ID=&lt;YOUR_CLIENT_ID&gt;.apps.googleusercontent.com
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="w-full py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center gap-2 text-slate-300 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Authenticating with Google...</span>
        </div>
      ) : (
        <div
          ref={buttonContainerRef}
          className="w-full flex justify-center min-h-[44px] overflow-hidden rounded-xl"
        />
      )}
    </div>
  );
};
