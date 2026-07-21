import React, { useState } from 'react';
import { DatabaseService } from '../services/db';
import { SystemUser, SYSTEM_USERS } from '../types';
import { Eye, Shield, Check, AlertCircle, KeyRound, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginScreenProps {
  onLoginSuccess: (user: SystemUser) => void;
  dbError?: string | null;
  onShowSetupHelp?: () => void;
}

export default function LoginScreen({ onLoginSuccess, dbError, onShowSetupHelp }: LoginScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<SystemUser[]>([]);

  React.useEffect(() => {
    DatabaseService.getUsers()
      .then((res) => {
        setUsers(res);
      })
      .catch((err) => {
        console.error('Error in login screen getting users:', err);
        setUsers(SYSTEM_USERS);
      });
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.pin === pin);
    if (user) {
      setError(null);
      onLoginSuccess(user);
    } else {
      setError('Invalid PIN code. Please try again.');
      setPin('');
    }
  };

  const handlePinChange = (val: string) => {
    // Only allow digits up to 4 chars
    const cleaned = val.replace(/\D/g, '').slice(0, 4);
    setPin(cleaned);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="flex justify-center items-center space-x-3">
          <div className="bg-emerald-600/15 text-emerald-400 border border-emerald-500/20 p-3 rounded-2xl shadow-lg">
            <Eye className="w-8 h-8" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white font-sans">
            Eye World <span className="text-emerald-400 font-medium font-mono text-lg block sm:inline sm:ml-1 border-neutral-800 sm:border-l sm:pl-2">CRM</span>
          </span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
          Lead Management System
        </h2>
        <p className="mt-2 text-center text-sm text-neutral-500">
          Enter your authorized personal PIN code to enter the system
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-panel py-8 px-4 shadow-2xl rounded-2xl sm:px-10"
        >
          {dbError && (
            <div className="mb-6 bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 text-xs">
              <div className="flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-300">Supabase Table Schema Not Detected</p>
                  <p className="text-neutral-400 mt-1 leading-relaxed">
                    Your connected Supabase project is missing the required database tables. 
                    The CRM is currently running with its robust Local Storage fallback.
                  </p>
                  <button
                    type="button"
                    onClick={onShowSetupHelp}
                    className="mt-2 text-[11px] text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
                  >
                    Show Setup SQL Script & Instructions
                  </button>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handlePinSubmit}>
            <div>
              <label htmlFor="pin" className="block text-sm font-semibold text-neutral-300">
                Authorized PIN Code
              </label>
              <div className="mt-2 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                  <KeyRound className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  name="pin"
                  id="pin"
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  placeholder="••••"
                  autoComplete="off"
                  className="block w-full pl-10 pr-3 py-3 bg-neutral-950 border border-neutral-800 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-center tracking-[1em] text-lg font-bold placeholder:tracking-normal placeholder:font-normal text-white"
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-950/20 border-l-4 border-rose-500/50 p-4 rounded-lg flex items-start space-x-2 border border-rose-500/10">
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-rose-200 font-medium">{error}</span>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={pin.length < 4}
                className="w-full flex justify-center py-3 px-4 border border-emerald-500/15 rounded-xl shadow-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Sign In to Clinic Workspace
              </button>
            </div>
          </form>
        </motion.div>

        <div className="mt-6 flex items-center justify-center space-x-2 text-xs text-neutral-500 font-mono">
          <Shield className="w-3.5 h-3.5" />
          <span>Role-Based PIN Security Enforced</span>
        </div>
      </div>
    </div>
  );
}
