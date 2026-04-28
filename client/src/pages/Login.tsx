import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Identifiants incorrects';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center px-6">

      {/* Grille de fond subtile */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,#fff,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff,#fff 1px,transparent 1px,transparent 40px)',
        }}
      />

      <div className="w-full max-w-[380px] relative">

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="font-['Space_Grotesk'] text-[10px] tracking-[0.3em] text-zinc-600 uppercase">
              ACCÈS RESTREINT
            </span>
            <div className="flex-1 h-px bg-zinc-900" />
            <span className="w-2 h-2 bg-[#34C759] rounded-full animate-pulse" />
          </div>
          <h1 className="font-['Space_Grotesk'] text-[72px] font-black tracking-tighter leading-none text-white uppercase italic">
            AGENCE
          </h1>
          <p className="font-['Space_Grotesk'] text-[11px] tracking-[0.25em] text-zinc-600 uppercase mt-2">
            SERIOUS GAME — AUTHENTIFICATION
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">

          <div>
            <label className="font-['Space_Grotesk'] text-[10px] tracking-widest uppercase text-zinc-600 block mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@agence.fr"
              autoComplete="email"
              required
              className="w-full bg-[#141414] border border-zinc-800 text-white font-['Inter'] text-[14px] px-4 py-3 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          <div>
            <label className="font-['Space_Grotesk'] text-[10px] tracking-widest uppercase text-zinc-600 block mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full bg-[#141414] border border-zinc-800 text-white font-['Inter'] text-[14px] px-4 py-3 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          {error && (
            <div className="border-l-2 border-[#FF3B30] bg-[#1a0a0a] px-4 py-3">
              <p className="font-['Inter'] text-[13px] text-[#FF3B30]">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-4 bg-white text-[#0A0A0A] font-['Space_Grotesk'] text-[12px] tracking-[0.2em] font-bold uppercase hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
                Connexion…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">login</span>
                Se connecter
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-700 uppercase text-center mt-8">
          Pas de compte — contacte l'administrateur
        </p>

      </div>
    </div>
  );
}
