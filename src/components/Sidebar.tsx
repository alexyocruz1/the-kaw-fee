"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const navItems = [
  { name: 'Inicio', path: '/', icon: '🏠' },
  { name: 'Ingredientes', path: '/ingredientes', icon: '🥕' },
  { name: 'Equipos', path: '/equipos', icon: '⚡' },
  { name: 'Productos y Precios', path: '/productos', icon: '☕' },
  { name: 'Ventas', path: '/ventas', icon: '💸' },
  { name: 'Workshop', path: '/workshop', icon: '🎨' },
  { name: 'Configuración', path: '/configuracion', icon: '⚙️' },
];

function NavContent({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  return (
    <>
      <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ color: 'var(--accent-primary)', margin: 0, fontSize: '1.6rem', letterSpacing: '-0.5px' }}>the kaw-fee</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Panel de Control</p>
        </div>
        {/* Close button only visible on mobile */}
        <button
          onClick={onClose}
          className="sidebar-close-btn"
          aria-label="Cerrar menú"
        >
          ✕
        </button>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onClose}
              className={`btn sidebar-nav-item ${isActive ? 'btn-primary' : 'btn-outline'}`}
              style={{
                justifyContent: 'flex-start',
                border: isActive ? 'none' : '2px solid transparent',
                textAlign: 'left',
                gap: '0.6rem'
              }}
            >
              <span style={{ fontSize: '1rem' }}>{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '2rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
        <p>© 2026 the kaw-fee</p>
        <p>Playa del Carmen, Q.R.</p>
      </div>
    </>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {/* Hamburger button — only visible on mobile */}
      <button
        className="hamburger-btn"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir menú"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Overlay backdrop for mobile */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Desktop sidebar (always visible) */}
      <aside className="sidebar sidebar-desktop">
        <NavContent pathname={pathname} onClose={() => setIsOpen(false)} />
      </aside>

      {/* Mobile drawer */}
      <aside className={`sidebar sidebar-mobile ${isOpen ? 'sidebar-mobile--open' : ''}`}>
        <NavContent pathname={pathname} onClose={() => setIsOpen(false)} />
      </aside>
    </>
  );
}
