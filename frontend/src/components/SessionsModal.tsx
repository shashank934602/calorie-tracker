import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  ShieldCheck, 
  Laptop, 
  Smartphone, 
  Globe, 
  Trash2, 
  LogOut, 
  Loader2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface SessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SessionsModal: React.FC<SessionsModalProps> = ({ isOpen, onClose }) => {
  const { sessions, refreshSessions, revokeSession, logoutAll } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      refreshSessions().finally(() => setLoading(false));
    }
  }, [isOpen, refreshSessions]);

  if (!isOpen) return null;

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    setErrorMsg(null);
    try {
      await revokeSession(id);
      setSuccessMsg('Session revoked successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke session';
      setErrorMsg(msg);
    } finally {
      setRevokingId(null);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('Are you sure you want to log out of all active devices?')) return;
    setLoading(true);
    try {
      await logoutAll();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to logout from all devices';
      setErrorMsg(msg);
      setLoading(false);
    }
  };

  const parseDeviceName = (ua: string | null) => {
    if (!ua) return { name: 'Unknown Browser / Device', isMobile: false };
    if (ua.includes('iPhone') || ua.includes('iPad')) return { name: 'Apple iOS Device', isMobile: true };
    if (ua.includes('Android')) return { name: 'Android Device', isMobile: true };
    if (ua.includes('Windows')) return { name: 'Windows PC (Desktop)', isMobile: false };
    if (ua.includes('Macintosh') || ua.includes('Mac OS')) return { name: 'MacBook / macOS', isMobile: false };
    if (ua.includes('Linux')) return { name: 'Linux Computer', isMobile: false };
    return { name: 'Web Browser', isMobile: false };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Active Device Sessions</h2>
              <p className="text-xs text-slate-400">Manage your authenticated logins across devices</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex justify-center items-center gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
              <span className="text-xs">Loading sessions...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No active sessions found.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((sess) => {
                const device = parseDeviceName(sess.userAgent);
                const lastUsed = new Date(sess.lastUsedAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={sess.id}
                    className={`p-4 rounded-xl border transition ${
                      sess.isCurrent
                        ? 'bg-purple-950/20 border-purple-500/30 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5">
                          {device.isMobile ? (
                            <Smartphone className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Laptop className="w-4 h-4 text-blue-400" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">
                              {device.name}
                            </span>
                            {sess.isCurrent && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                Current Device
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3 text-slate-500" />
                              {sess.ipAddress || 'Unknown IP'}
                            </span>
                            <span>•</span>
                            <span>Last active: {lastUsed}</span>
                          </div>
                        </div>
                      </div>

                      {!sess.isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleRevoke(sess.id)}
                          disabled={revokingId === sess.id}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 transition cursor-pointer flex items-center gap-1"
                          title="Revoke session"
                        >
                          {revokingId === sess.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Revoke</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleLogoutAll}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out all devices</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
