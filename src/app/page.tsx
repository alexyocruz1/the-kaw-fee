"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [stats, setStats] = useState({ products: 0, ingredients: 0, equipos: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(res => res.json()),
      fetch('/api/ingredients').then(res => res.json()),
      fetch('/api/equipos').then(res => res.json())
    ]).then(([prod, ing, eq]) => {
      setStats({
        products: prod.length || 0,
        ingredients: ing.length || 0,
        equipos: eq.length || 0
      });
      setLoading(false);
    });
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Inicio</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Bienvenido al portal de gestión de the kaw-fee.</p>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3>Resumen</h3>
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Productos</span>
              <span style={{ fontWeight: 600 }}>{loading ? '...' : stats.products}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Ingredientes</span>
              <span style={{ fontWeight: 600 }}>{loading ? '...' : stats.ingredients}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Equipos</span>
              <span style={{ fontWeight: 600 }}>{loading ? '...' : stats.equipos}</span>
            </div>
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3>Empezar</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', marginBottom: '1.5rem' }}>
            Configura tus costos de mano de obra y electricidad antes de calcular los precios de los productos.
          </p>
          <Link href="/configuracion" className="btn btn-secondary" style={{ display: 'inline-block', textAlign: 'center' }}>
            Ir a Configuración
          </Link>
        </div>
      </div>
    </div>
  );
}
