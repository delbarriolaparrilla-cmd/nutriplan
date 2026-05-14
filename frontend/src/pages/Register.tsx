import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function translateError(msg: string): string {
  if (msg.includes('User already registered') || msg.includes('already been registered'))
    return 'Ya existe una cuenta con ese email.';
  if (msg.includes('Password should be at least'))
    return 'La contraseña debe tener al menos 6 caracteres.';
  if (msg.includes('Invalid email')) return 'El email no es válido.';
  if (msg.includes('Signup is disabled')) return 'El registro está deshabilitado temporalmente.';
  return 'Ocurrió un error. Intenta de nuevo.';
}

export default function Register() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { nombre } },
    });

    if (signUpError) {
      setError(translateError(signUpError.message));
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from('perfil').insert({
        id: data.user.id, nombre, user_id: data.user.id, perfil_completo: false,
      });
    }

    navigate('/onboarding');
  };

  return (
    <div className="auth-bg">
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '40px', lineHeight: 1, marginBottom: '8px' }}>🍽️</div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.5px' }}>
            NutriBarrio
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-primary-dark)', marginTop: '4px', fontWeight: 500 }}>
            Come bien, gasta poco
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(29,158,117,0.10), 0 1px 4px rgba(0,0,0,0.06)',
          padding: '32px 28px',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '24px' }}>
            Crear cuenta
          </h2>

          {error && (
            <div style={{
              marginBottom: '18px', padding: '12px 16px', borderRadius: '10px',
              background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', fontSize: '14px',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Nombre
              </label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                required placeholder="Tu nombre" className="nb-input" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Email
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required placeholder="tu@email.com" className="nb-input" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Contraseña
              </label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required placeholder="Mínimo 6 caracteres" className="nb-input" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Confirmar contraseña
              </label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                required placeholder="Repite tu contraseña" className="nb-input" />
            </div>

            <button type="submit" disabled={loading} className="nb-btn-primary" style={{ marginTop: '4px' }}>
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '14px', color: '#6B7280', marginTop: '22px' }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
