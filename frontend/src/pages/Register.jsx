import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import GridScan from '../components/GridScan';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ businessName: '', ownerName: '', email: '', mobile: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { businessName, ownerName, email, mobile, password, confirmPassword } = form;
    if (!businessName || !ownerName || !email || !mobile || !password) return toast.error('Please fill all fields');
    if (password !== confirmPassword) return toast.error('Passwords do not match');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');

    setLoading(true);
    try {
      await register({ businessName, ownerName, email, mobile, password });
      setShowSuccess(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const update = (field, value) => setForm({ ...form, [field]: value });

  return (
    <div className="auth-page">
      {/* GridScan 3D Background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <GridScan
          sensitivity={0.55}
          lineThickness={1}
          linesColor="#2F293A"
          gridScale={0.1}
          scanColor="#FF9FFC"
          scanOpacity={0.4}
          enablePost
          bloomIntensity={0.6}
          chromaticAberration={0.002}
          noiseIntensity={0.01}
        />
      </div>

      {/* Success Popup */}
      {showSuccess && (
        <div className="modal-overlay" style={{ zIndex: 10 }}>
          <div className="modal" style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, background: 'var(--gradient-1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Congratulations!
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 8, fontSize: 15 }}>
              Your account has been created successfully.
            </p>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 13 }}>
              Welcome to <strong style={{ color: 'var(--accent)' }}>{form.businessName}</strong>! You're being redirected to your dashboard.
            </p>
            <div className="spinner" style={{ margin: '0 auto', borderTopColor: 'var(--accent)' }}></div>
          </div>
        </div>
      )}

      <div className="auth-container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="auth-card" style={{ background: 'rgba(15, 20, 45, 0.85)', backdropFilter: 'blur(16px)' }}>
          <div className="auth-logo">
            <div className="auth-logo-icon">🎨</div>
            <h1>Create Account</h1>
            <p>Set up your paint shop profile</p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Business Name</label>
              <input type="text" placeholder="e.g. Prajapati Paints" value={form.businessName} onChange={e => update('businessName', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Owner Name</label>
              <input type="text" placeholder="Your full name" value={form.ownerName} onChange={e => update('ownerName', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" placeholder="you@example.com" value={form.email} onChange={e => update('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Mobile Number</label>
              <input type="tel" placeholder="10-digit mobile number" value={form.mobile} onChange={e => update('mobile', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="Min 6 characters" value={form.password} onChange={e => update('password', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          <div className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
