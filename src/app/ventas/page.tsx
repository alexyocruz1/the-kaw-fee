"use client";

import { useEffect, useState } from 'react';

type CustomEquivalence = { unitName: string; ratioToBase: number; };
type Ingredient = { id: string; name: string; unit: string; packageSize?: number; costPerUnit: number; customEquivalences?: CustomEquivalence[]; };
type Equipment = { id: string; name: string; powerKW: number; energyType?: 'electricidad' | 'gas'; };
type Settings = { laborRatePerHour: number; electricityCostPerKwh: number; gasCostPerKg?: number; globalMarginMultiplier: number; zettleFeePercent?: number; };
type ProductIngredient = { ingredientId: string; quantity: number; unit: string; };
type ProductEquipment = { equipmentId: string; minutesUsed: number; };
type ConversionCategory = 'mass' | 'volume';
type Product = {
  id: string;
  name: string;
  ingredients: ProductIngredient[];
  equipmentUsage: ProductEquipment[];
  prepTimeMinutes: number;
  customMarginMultiplier?: number;
  yield?: number;
  salePrice?: number;
};
type Sale = {
  id: string;
  productId: string;
  quantity: number;
  date: string;
  unitPrice: number;
  unitCost: number;
  productName: string;
  paymentMethod?: 'efectivo' | 'tarjeta';
  cardFee?: number;
};

const CONVERSIONS: Record<ConversionCategory, Record<string, number>> = {
  mass: { kg: 1000, gramo: 1, lb: 453.592, oz: 28.3495, mg: 0.001 },
  volume: { litro: 1000, ml: 1, galon: 3785.41, taza: 236.588, cucharada: 14.7868, cucharadita: 4.92892, 'fl oz': 29.5735 }
};

const today = () => new Date().toISOString().slice(0, 10);

const getCategory = (unit: string): ConversionCategory | null => {
  if (unit in CONVERSIONS.mass) return 'mass';
  if (unit in CONVERSIONS.volume) return 'volume';
  return null;
};

export default function VentasPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredientsList, setIngredientsList] = useState<Ingredient[]>([]);
  const [equiposList, setEquiposList] = useState<Equipment[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [date, setDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta'>('efectivo');
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(res => res.json()),
      fetch('/api/ingredients').then(res => res.json()),
      fetch('/api/equipos').then(res => res.json()),
      fetch('/api/settings').then(res => res.json()),
      fetch('/api/sales').then(res => res.json())
    ]).then(([prodData, ingData, eqData, setData, salesData]) => {
      setProducts(prodData);
      setIngredientsList(ingData);
      setEquiposList(eqData);
      setSettings(setData);
      setSales(salesData);
      setProductId(prodData[0]?.id || '');
      setLoading(false);
    });
  }, []);

  const selectedProduct = products.find(product => product.id === productId);

  const getIngredientCost = (ingId: string, qty: number, selectedUnit: string) => {
    const ing = ingredientsList.find(i => i.id === ingId);
    if (!ing) return 0;
    const baseCostPerUnit = ing.costPerUnit / (ing.packageSize || 1);
    if (!selectedUnit || selectedUnit === ing.unit) return baseCostPerUnit * qty;

    const category = getCategory(ing.unit);
    const selectedCategory = getCategory(selectedUnit);
    if (category && category === selectedCategory) {
      return (baseCostPerUnit / CONVERSIONS[category][ing.unit]) * CONVERSIONS[category][selectedUnit] * qty;
    }

    const customEq = ing.customEquivalences?.find(e => e.unitName === selectedUnit);
    if (customEq) return (baseCostPerUnit / customEq.ratioToBase) * qty;
    return baseCostPerUnit * qty;
  };

  const getEquipmentCost = (eqId: string, mins: number) => {
    if (!settings) return 0;
    const eq = equiposList.find(e => e.id === eqId);
    if (!eq) return 0;
    if (eq.energyType === 'gas') return (mins / 60) * eq.powerKW * (settings.gasCostPerKg || 0);
    return (mins / 60) * eq.powerKW * settings.electricityCostPerKwh;
  };

  const calculateTotalCost = (product: Product) => {
    if (!settings) return 0;
    const ingredientCost = product.ingredients.reduce((sum, item) => sum + getIngredientCost(item.ingredientId, item.quantity, item.unit), 0);
    const equipmentCost = product.equipmentUsage.reduce((sum, item) => sum + getEquipmentCost(item.equipmentId, item.minutesUsed), 0);
    const laborCost = (product.prepTimeMinutes / 60) * settings.laborRatePerHour;
    return ingredientCost + equipmentCost + laborCost;
  };

  const getUnitCost = (product: Product) => calculateTotalCost(product) / (product.yield || 1);

  const getUnitPrice = (product: Product) => {
    if (product.salePrice && product.salePrice > 0) return product.salePrice;
    const suggestedTotal = calculateTotalCost(product) * (product.customMarginMultiplier || settings?.globalMarginMultiplier || 1);
    return suggestedTotal / (product.yield || 1);
  };

  const preview = (() => {
    if (!selectedProduct) return { revenue: 0, cost: 0, cardFee: 0, profit: 0 };
    const revenue = getUnitPrice(selectedProduct) * quantity;
    const cost = getUnitCost(selectedProduct) * quantity;
    const cardFee = paymentMethod === 'tarjeta' ? revenue * ((settings?.zettleFeePercent || 0) / 100) : 0;
    return { revenue, cost, cardFee, profit: revenue - cost - cardFee };
  })();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || quantity <= 0) return;

    const sale: Sale = {
      id: `sale_${crypto.randomUUID()}`,
      productId: selectedProduct.id,
      quantity,
      date,
      unitPrice: getUnitPrice(selectedProduct),
      unitCost: getUnitCost(selectedProduct),
      productName: selectedProduct.name,
      paymentMethod,
      cardFee: preview.cardFee
    };

    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sale)
    });

    if (res.ok) {
      setSales([sale, ...sales]);
      setQuantity(1);
      setDate(today());
      setMessage('Venta registrada.');
      setTimeout(() => setMessage(''), 2500);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta venta?')) return;
    const res = await fetch(`/api/sales?id=${id}`, { method: 'DELETE' });
    if (res.ok) setSales(sales.filter(sale => sale.id !== id));
  };

  const sortedSales = [...sales].sort((a, b) => b.date.localeCompare(a.date));

  if (loading || !settings) return <div className="animate-fade-in">Cargando ventas...</div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Ventas</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Registra cuántos productos vendiste y en qué fecha.</p>
        </div>
      </div>

      {message && <div style={{ padding: '1rem', marginBottom: '1.5rem', backgroundColor: 'var(--accent-secondary)', color: 'white', borderRadius: 'var(--border-radius-sm)' }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '2rem', alignItems: 'start' }}>
        <form onSubmit={handleSave} className="glass-panel" style={{ padding: '2rem' }}>
          <h3>Registrar Venta</h3>
          <div className="form-group">
            <label className="form-label">Producto</label>
            <select className="form-input" value={productId} onChange={e => setProductId(e.target.value)} required>
              {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Cantidad vendida</label>
            <input type="number" min={1} className="form-input" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} />
          </div>
          <div className="form-group">
            <label className="form-label">Fecha</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Método de pago</label>
            <select className="form-input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as 'efectivo' | 'tarjeta')}>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta (Zettle)</option>
            </select>
          </div>
          <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span>Ingreso</span><strong>${preview.revenue.toFixed(2)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span>Costo</span><strong>${preview.cost.toFixed(2)}</strong></div>
            {paymentMethod === 'tarjeta' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span>Comisión Zettle ({settings?.zettleFeePercent}%)</span><strong>-${preview.cardFee.toFixed(2)}</strong></div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Ganancia</span><strong style={{ color: 'var(--accent-secondary)' }}>${preview.profit.toFixed(2)}</strong></div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Guardar Venta</button>
        </form>

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3>Historial</h3>
          {sortedSales.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sortedSales.map(sale => (
                <div key={sale.id} style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '1rem', display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center' }}>
                  <div>
                    <strong>{sale.productName}</strong>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>{sale.date} · {sale.quantity} vendido{sale.quantity !== 1 ? 's' : ''} · {sale.paymentMethod === 'tarjeta' ? 'Tarjeta' : 'Efectivo'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ color: 'var(--accent-secondary)' }}>${((sale.unitPrice - sale.unitCost) * sale.quantity - (sale.cardFee || 0)).toFixed(2)}</strong>
                    <button type="button" className="table-action-btn table-action-delete" onClick={() => handleDelete(sale.id)} style={{ display: 'block', marginTop: '0.35rem' }}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h4>Sin ventas registradas</h4>
              <p>Registra tu primera venta usando el formulario.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
