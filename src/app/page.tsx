"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Sale = {
  id: string;
  productId: string;
  quantity: number;
  date: string;
  unitPrice: number;
  unitCost: number;
  productName: string;
};

type DashboardStats = {
  products: number;
  ingredients: number;
  equipos: number;
  salesCount: number;
  unitsSold: number;
  revenue: number;
  profit: number;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function Home() {
  const [stats, setStats] = useState<DashboardStats>({
    products: 0,
    ingredients: 0,
    equipos: 0,
    salesCount: 0,
    unitsSold: 0,
    revenue: 0,
    profit: 0
  });
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(res => res.json()),
      fetch('/api/ingredients').then(res => res.json()),
      fetch('/api/equipos').then(res => res.json()),
      fetch('/api/sales').then(res => res.json())
    ]).then(([prod, ing, eq, salesData]) => {
      const revenue = salesData.reduce((sum: number, sale: Sale) => sum + sale.unitPrice * sale.quantity, 0);
      const cost = salesData.reduce((sum: number, sale: Sale) => sum + sale.unitCost * sale.quantity, 0);
      setSales(salesData);
      setStats({
        products: prod.length || 0,
        ingredients: ing.length || 0,
        equipos: eq.length || 0,
        salesCount: salesData.length || 0,
        unitsSold: salesData.reduce((sum: number, sale: Sale) => sum + sale.quantity, 0),
        revenue,
        profit: revenue - cost
      });
      setLoading(false);
    });
  }, []);

  const todaySales = sales.filter(sale => sale.date === today());
  const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.unitPrice * sale.quantity, 0);
  const todayProfit = todaySales.reduce((sum, sale) => sum + (sale.unitPrice - sale.unitCost) * sale.quantity, 0);
  const marginPct = stats.revenue > 0 ? (stats.profit / stats.revenue) * 100 : 0;
  const topProducts = Object.values(sales.reduce<Record<string, { name: string; quantity: number; revenue: number; profit: number }>>((acc, sale) => {
    if (!acc[sale.productId]) acc[sale.productId] = { name: sale.productName, quantity: 0, revenue: 0, profit: 0 };
    acc[sale.productId].quantity += sale.quantity;
    acc[sale.productId].revenue += sale.unitPrice * sale.quantity;
    acc[sale.productId].profit += (sale.unitPrice - sale.unitCost) * sale.quantity;
    return acc;
  }, {})).sort((a, b) => b.profit - a.profit).slice(0, 5);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Resumen de productos, ventas, ingresos y ganancias.</p>
        </div>
        <Link href="/ventas" className="btn btn-primary">Registrar Venta</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {[
          ['Ingresos', `$${stats.revenue.toFixed(2)}`],
          ['Ganancia', `$${stats.profit.toFixed(2)}`],
          ['Margen', `${marginPct.toFixed(1)}%`],
          ['Unidades vendidas', stats.unitsSold.toString()],
          ['Ventas hoy', todaySales.length.toString()],
          ['Ganancia hoy', `$${todayProfit.toFixed(2)}`]
        ].map(([label, value]) => (
          <div key={label} className="glass-panel" style={{ padding: '1.5rem' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{label}</p>
            <strong style={{ fontSize: '1.8rem', color: label.includes('Ganancia') ? 'var(--accent-secondary)' : 'var(--text-primary)' }}>{loading ? '...' : value}</strong>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3>Operación</h3>
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Productos</span><span style={{ fontWeight: 600 }}>{loading ? '...' : stats.products}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Ingredientes</span><span style={{ fontWeight: 600 }}>{loading ? '...' : stats.ingredients}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Equipos</span><span style={{ fontWeight: 600 }}>{loading ? '...' : stats.equipos}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Ventas registradas</span><span style={{ fontWeight: 600 }}>{loading ? '...' : stats.salesCount}</span></div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3>Hoy</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Ingresos de hoy</span><strong>${todayRevenue.toFixed(2)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Ganancia de hoy</span><strong style={{ color: 'var(--accent-secondary)' }}>${todayProfit.toFixed(2)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Unidades de hoy</span><strong>{todaySales.reduce((sum, sale) => sum + sale.quantity, 0)}</strong></div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3>Productos más rentables</h3>
          {topProducts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '1rem' }}>
              {topProducts.map(product => (
                <div key={product.name} style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <div>
                    <strong>{product.name}</strong>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>{product.quantity} vendido{product.quantity !== 1 ? 's' : ''}</p>
                  </div>
                  <strong style={{ color: 'var(--accent-secondary)' }}>${product.profit.toFixed(2)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Aún no hay ventas para calcular rentabilidad.</p>
          )}
        </div>
      </div>
    </div>
  );
}
