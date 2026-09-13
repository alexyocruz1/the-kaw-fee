"use client";

import { useState, useEffect } from 'react';

type Settings = {
  laborRatePerHour: number;
  electricityCostPerKwh: number;
  gasCostPerKg?: number;
  globalMarginMultiplier: number;
  businessName?: string;
  logoUrl?: string;
  zettleFeePercent?: number;
};

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [e.target.name]: e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
    });
  };

  const handleLogoUpload = async (file: File) => {
    if (!settings) return;
    const data = new FormData();
    data.append('file', file);
    data.append('directory', 'brand');

    const res = await fetch('/api/uploads', {
      method: 'POST',
      body: data
    });
    if (!res.ok) {
      setMessage('Error al subir el logo.');
      return;
    }

    const uploaded = await res.json();
    setSettings({
      ...settings,
      logoUrl: uploaded.url
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setMessage('¡Configuración guardada exitosamente!');
      } else {
        setMessage('Error al guardar la configuración.');
      }
    } catch {
      setMessage('Error de red al guardar.');
    }
    setSaving(false);
    
    // Clear message after 3 seconds
    setTimeout(() => setMessage(''), 3000);
  };

  if (loading || !settings) return <div className="animate-fade-in">Cargando configuración...</div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Configuración Global</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Configura tus costos generales y márgenes por defecto.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleSave} 
          disabled={saving}
        >
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </div>

      {message && (
        <div style={{ 
          padding: '1rem', 
          marginBottom: '2rem', 
          backgroundColor: 'var(--accent-secondary)', 
          color: 'white', 
          borderRadius: 'var(--border-radius-sm)' 
        }}>
          {message}
        </div>
      )}

      <div className="glass-panel" style={{ padding: '2.5rem', maxWidth: '600px' }}>
        <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem' }}>
          Identidad del Negocio
        </h3>

        <div className="form-group">
          <label className="form-label">Nombre del Negocio</label>
          <input
            type="text"
            name="businessName"
            value={settings.businessName || 'the kaw-fee'}
            onChange={handleChange}
            className="form-input"
          />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Si no subes logo, este nombre aparecerá en los flyers.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Logo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo del negocio" style={{ width: '88px', height: '88px', objectFit: 'contain', background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '0.5rem' }} />
            ) : (
              <div style={{ width: '88px', height: '88px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-sm)', color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'center' }}>
                Sin logo
              </div>
            )}
            <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
              Subir logo
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoUpload(file);
                  e.target.value = '';
                }}
              />
            </label>
            {settings.logoUrl && (
              <button type="button" className="btn btn-outline" onClick={() => setSettings({ ...settings, logoUrl: undefined })}>
                Quitar logo
              </button>
            )}
          </div>
        </div>

        <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem' }}>
          Costos Generales (MXN)
        </h3>
        
        <div className="form-group">
          <label className="form-label">Costo Mano de Obra por Hora (Barista / Preparación)</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>$</span>
            <input 
              type="number" 
              name="laborRatePerHour"
              value={settings.laborRatePerHour} 
              onChange={handleChange}
              className="form-input" 
              style={{ paddingLeft: '2rem' }}
              step="0.5"
            />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Recomendado: $50.00 MXN/hr para Playa del Carmen.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Costo de Electricidad (Tarifa por kWh)</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>$</span>
            <input 
              type="number" 
              name="electricityCostPerKwh"
              value={settings.electricityCostPerKwh} 
              onChange={handleChange}
              className="form-input" 
              style={{ paddingLeft: '2rem' }}
              step="0.1"
            />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Recomendado: $4.50 MXN por kWh según tarifas comerciales CFE (PDBT).
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Costo de Gas LP (por Kg)</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>$</span>
            <input 
              type="number" 
              name="gasCostPerKg"
              value={settings.gasCostPerKg || 0} 
              onChange={handleChange}
              className="form-input" 
              style={{ paddingLeft: '2rem' }}
              step="0.1"
            />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Promedio aproximado: $19.00 - $21.00 MXN por Kg.
          </p>
        </div>

        <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem', marginTop: '3rem' }}>
          Estrategia de Precios
        </h3>

        <div className="form-group">
          <label className="form-label">Multiplicador de Margen Global</label>
          <input 
            type="number" 
            name="globalMarginMultiplier"
            value={settings.globalMarginMultiplier} 
            onChange={handleChange}
            className="form-input" 
            step="0.1"
          />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Ejemplo: {settings.globalMarginMultiplier} significa un margen del {settings.globalMarginMultiplier * 100}% (precio de venta = costo total x {settings.globalMarginMultiplier}). Esto logra un costo de alimentos del {settings.globalMarginMultiplier > 0 ? (100 / settings.globalMarginMultiplier).toFixed(1) : 0}%.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Comisión Zettle (%)</label>
          <input
            type="number"
            name="zettleFeePercent"
            value={settings.zettleFeePercent || 0}
            onChange={handleChange}
            className="form-input"
            step="0.01"
          />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Porcentaje que Zettle cobra por venta pagada con tarjeta (incluye IVA). Se descuenta de la ganancia al registrar una venta con tarjeta.
          </p>
        </div>
      </div>
    </div>
  );
}
