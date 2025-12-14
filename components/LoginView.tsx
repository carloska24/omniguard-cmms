import React, { useState } from 'react';
import { Icons } from './Icons';
import { supabase } from '../lib/supabase';

export const LoginView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [msg, setMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMsg('Verifique seu emaill para confirmar o cadastro!');
      }
    } catch (error: any) {
      setMsg(error.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050608] font-sans relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.02] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-omni-cyan/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="z-10 w-full max-w-md p-8 bg-omni-panel border border-omni-border rounded-2xl shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-omni-dark border border-omni-cyan/30 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-cyan-900/20">
            <Icons.Cpu className="w-8 h-8 text-omni-cyan" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">OmniGuard SGM</h1>
          <p className="text-sm text-slate-400 mt-1">Gestão Inteligente de Manutenção</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
              Email Corporativo
            </label>
            <div className="relative">
              <Icons.User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-omni-dark border border-omni-border rounded-lg pl-10 pr-4 py-3 text-white focus:border-omni-cyan focus:ring-1 focus:ring-omni-cyan transition-all outline-none"
                placeholder="nome@empresa.com"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Senha</label>
            <div className="relative">
              <Icons.Settings className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-omni-dark border border-omni-border rounded-lg pl-10 pr-4 py-3 text-white focus:border-omni-cyan focus:ring-1 focus:ring-omni-cyan transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          {msg && (
            <div
              className={`p-3 rounded text-xs font-bold ${
                msg.includes('Verifique')
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-omni-cyan hover:bg-cyan-400 text-omni-dark font-bold py-3.5 rounded-lg transition-all shadow-lg shadow-cyan-900/20 mt-2 flex items-center justify-center gap-2 group"
          >
            {loading ? <Icons.Cpu className="w-4 h-4 animate-spin" /> : null}
            {mode === 'signin' ? 'Acessar Sistema' : 'Criar Nova Conta'}
            {!loading && (
              <Icons.ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            )}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-white/5 pt-4">
          <p className="text-xs text-slate-500">
            {mode === 'signin' ? 'Não tem acesso?' : 'Já possui conta?'}
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setMsg('');
              }}
              className="ml-1 text-omni-cyan hover:underline font-bold"
            >
              {mode === 'signin' ? 'Cadastre-se' : 'Faça Login'}
            </button>
          </p>
        </div>
      </div>

      <div className="absolute bottom-6 text-[10px] text-slate-600 font-mono">
        v2.0.0 • Secured by OmniGuard
      </div>
    </div>
  );
};
