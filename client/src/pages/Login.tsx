import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

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
        'Erreur de connexion';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-agence-black flex flex-col items-center justify-center p-6">
      {/* Grain texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        }}
      />

      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-serif text-5xl tracking-[0.2em] text-agence-gold mb-3">
            AGENCE
          </h1>
          <div className="flex items-center gap-3 justify-center">
            <div className="h-px flex-1 bg-agence-border" />
            <p className="text-agence-muted text-xs tracking-widest uppercase">
              Accès restreint
            </p>
            <div className="h-px flex-1 bg-agence-border" />
          </div>
        </div>

        {/* Form card */}
        <div className="card p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="nom@agence.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <Input
              label="Mot de passe"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            {error && (
              <div className="rounded border border-agence-error/40 bg-agence-error/10 px-4 py-3">
                <p className="text-agence-error-light text-sm">{error}</p>
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
              Se connecter
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-agence-muted text-xs mt-8">
          Pas de compte ? Contacte l'administrateur.
        </p>
      </div>
    </div>
  );
}
