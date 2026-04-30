import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { HiOutlineOfficeBuilding, HiOutlineIdentification, HiOutlineLocationMarker, HiOutlinePhotograph, HiUpload, HiTrash, HiSun, HiMoon } from 'react-icons/hi';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    businessName: user?.businessName || '',
    ownerName: user?.ownerName || '',
    mobile: user?.mobile || '',
    shopAddress: user?.shopAddress || '',
    gstNumber: user?.gstNumber || '',
    shopLogo: user?.shopLogo || ''
  });
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState(user?.shopLogo || '');

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file');
    if (file.size > 2 * 1024 * 1024) return toast.error('Image must be under 2MB');

    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result);
      setForm({ ...form, shopLogo: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoPreview('');
    setForm({ ...form, shopLogo: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/settings', form);
      updateUser(res.data.user);
      toast.success('Settings saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const update = (field, value) => setForm({ ...form, [field]: value });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your business details and preferences</p>
        </div>
      </div>
      <div className="page-body">
        <form onSubmit={handleSave}>
          {/* Appearance */}
          <div className="card slide-up" style={{ marginBottom: 24 }}>
            <div className="settings-section">
              <h3>{theme === 'dark' ? <HiMoon /> : <HiSun />} Appearance</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Choose your preferred theme for the application.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  type="button" 
                  className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => theme !== 'light' && toggleTheme()}
                  style={{ flex: 1, maxWidth: 200 }}
                >
                  <HiSun /> Light Mode
                </button>
                <button 
                  type="button" 
                  className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => theme !== 'dark' && toggleTheme()}
                  style={{ flex: 1, maxWidth: 200 }}
                >
                  <HiMoon /> Dark Mode
                </button>
              </div>
            </div>
          </div>

          {/* Shop Logo */}
          <div className="card slide-up" style={{ marginBottom: 24 }}>
            <div className="settings-section">
              <h3><HiOutlinePhotograph /> Shop Logo</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Upload your shop logo. It will appear in the sidebar and on generated bills.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div style={{
                  width: 100, height: 100, borderRadius: 16,
                  border: '2px dashed rgba(99,102,241,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', background: 'rgba(99,102,241,0.04)',
                  flexShrink: 0
                }}>
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <HiOutlinePhotograph style={{ fontSize: 32, color: 'var(--text-muted)' }} />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    style={{ display: 'none' }}
                  />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
                    <HiUpload /> {logoPreview ? 'Change Logo' : 'Upload Logo'}
                  </button>
                  {logoPreview && (
                    <button type="button" className="btn btn-sm" onClick={removeLogo} style={{ color: 'var(--danger)', background: 'var(--danger-bg)', border: '1px solid rgba(248,113,113,0.2)' }}>
                      <HiTrash /> Remove
                    </button>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Max 2MB · PNG, JPG, or SVG</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card slide-up" style={{ marginBottom: 24 }}>
            <div className="settings-section">
              <h3><HiOutlineOfficeBuilding /> Business Information</h3>
              <div className="settings-grid">
                <div className="form-group">
                  <label>Business Name</label>
                  <input type="text" value={form.businessName} onChange={e => update('businessName', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Owner Name</label>
                  <input type="text" value={form.ownerName} onChange={e => update('ownerName', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Mobile Number</label>
                  <input type="tel" value={form.mobile} onChange={e => update('mobile', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Email (cannot be changed)</label>
                  <input type="email" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
                </div>
              </div>
            </div>
          </div>

          <div className="card slide-up" style={{ marginBottom: 24 }}>
            <div className="settings-section">
              <h3><HiOutlineLocationMarker /> Shop Address</h3>
              <div className="form-group">
                <label>Full Address (appears on bills)</label>
                <textarea rows={3} placeholder="Enter your shop address..." value={form.shopAddress} onChange={e => update('shopAddress', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
            </div>
          </div>

          <div className="card slide-up" style={{ marginBottom: 24 }}>
            <div className="settings-section">
              <h3><HiOutlineIdentification /> GST Details</h3>
              <div className="form-group">
                <label>GST Number</label>
                <input type="text" placeholder="e.g. 22AAAAA0000A1Z5" value={form.gstNumber} onChange={e => update('gstNumber', e.target.value.toUpperCase())} />
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                {form.gstNumber ? '✅ GST (18%) will be applied on all bills.' : '⚠️ No GST number set. Bills will be generated without tax.'}
              </p>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
