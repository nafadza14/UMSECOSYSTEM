import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth, User } from '../contexts/AuthContext';
import { Scale } from 'lucide-react';

const MOCK_USERS: User[] = [
  { id: '1', name: 'Pak Owner', role: 'owner' },
  { id: '2', name: 'Budi (Manager)', role: 'manager' },
  { id: '3', name: 'Siti (Admin)', role: 'admin' },
  { id: '4', name: 'Klien Umum', role: 'klien', partnerCode: '01UMUM' },
  { id: '5', name: 'Klien Upoyo', role: 'klien', partnerCode: 'UPOYO' },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-4">
            <Scale className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">TimbangLive</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Simulasi Login (Pilih Role Anda)
          </p>
        </div>
        
        <div className="glass border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="space-y-3">
            {MOCK_USERS.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  login(u);
                  navigate('/dashboard');
                }}
                className="w-full flex items-center justify-between px-4 py-3 border border-[var(--border)] rounded-xl hover:bg-[var(--chip)] transition-colors text-left"
              >
                <div>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-[var(--muted)] capitalize">
                    Role: {u.role}
                    {u.partnerCode && ` (Partner: ${u.partnerCode})`}
                  </div>
                </div>
                <div className="text-indigo-600">Masuk &rarr;</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
