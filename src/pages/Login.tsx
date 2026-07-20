import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth, User } from '../contexts/AuthContext';
import { Scale } from 'lucide-react';
import FadeIn from '../components/FadeIn';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4';

const MOCK_USERS: User[] = [
  { id: '1', name: 'Bapak Yanto (Owner)', role: 'owner' },
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
    <div className="relative w-full h-full min-h-screen overflow-hidden">
      {/* Full-screen background video */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src={VIDEO_URL}
        autoPlay
        loop
        muted
        playsInline
      />
      {/* Overlay to darken video slightly for readability */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Foreground content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4 text-white">
        <FadeIn delay={200} duration={800} className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center mb-6">
              <Scale className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-normal tracking-tight mb-2" style={{ letterSpacing: '-0.03em' }}>
              UMS Ecosystem
            </h2>
            <p className="text-white/70 font-light">
              Pilih Role Akses Anda
            </p>
          </div>
          
          <div className="liquid-glass border border-white/20 rounded-3xl p-6 md:p-8 space-y-4 shadow-2xl backdrop-blur-lg bg-black/20">
            <div className="space-y-3">
              {MOCK_USERS.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    login(u);
                    navigate('/dashboard');
                  }}
                  className="w-full flex items-center justify-between px-5 py-4 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors text-left group"
                >
                  <div>
                    <div className="font-medium text-lg text-white group-hover:text-white/90">{u.name}</div>
                    <div className="text-sm text-white/60 capitalize mt-0.5">
                      Role: {u.role}
                      {u.partnerCode && ` (Partner: ${u.partnerCode})`}
                    </div>
                  </div>
                  <div className="text-white/40 group-hover:text-white transition-colors">
                    Masuk &rarr;
                  </div>
                </button>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
