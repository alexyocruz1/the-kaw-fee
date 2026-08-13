"use client";

import { useState, useEffect } from 'react';

type CustomEquivalence = {
  unitName: string;
  ratioToBase: number; 
};

type Ingredient = { id: string; name: string; unit: string; packageSize?: number; costPerUnit: number; customEquivalences?: CustomEquivalence[]; };
type Equipment = { id: string; name: string; powerKW: number; energyType?: 'electricidad' | 'gas'; };
type Settings = { laborRatePerHour: number; electricityCostPerKwh: number; gasCostPerKg?: number; globalMarginMultiplier: number; };

type ProductIngredient = { ingredientId: string; quantity: number; unit: string; };
type ProductEquipment = { equipmentId: string; minutesUsed: number; };

type Product = {
  id: string;
  name: string;
  ingredients: ProductIngredient[];
  equipmentUsage: ProductEquipment[];
  prepTimeMinutes: number;
  customMarginMultiplier?: number;
  yield?: number;
};

// Auto Conversion engine
const CONVERSIONS: any = {
  mass: { kg: 1000, gramo: 1, lb: 453.592, oz: 28.3495, mg: 0.001 },
  volume: { litro: 1000, ml: 1, galon: 3785.41, taza: 236.588, cucharada: 14.7868, cucharadita: 4.92892, 'fl oz': 29.5735 }
};

const getCategory = (unit: string) => {
  if (unit in CONVERSIONS.mass) return 'mass';
  if (unit in CONVERSIONS.volume) return 'volume';
  return null;
};

// Searchable Dropdown Component
function SearchableSelect({ items, placeholder, onSelect }: { items: {id: string, label: string}[], placeholder: string, onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <input 
        type="text"
        className="form-input"
        placeholder={placeholder}
        value={query}
        onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        style={{ width: '100%' }}
      />
      {isOpen && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', zIndex: 10, maxHeight: '250px', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
          {filtered.map(item => (
            <div 
              key={item.id} 
              style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              onMouseDown={(e) => {
                e.preventDefault(); 
                onSelect(item.id);
                setQuery('');
                setIsOpen(false);
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredientsList, setIngredientsList] = useState<Ingredient[]>([]);
  const [equiposList, setEquiposList] = useState<Equipment[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [insightsProduct, setInsightsProduct] = useState<Product | null>(null);
  const [ingredientsProduct, setIngredientsProduct] = useState<Product | null>(null);
  const [isBatch, setIsBatch] = useState(false);
  const [batchYield, setBatchYield] = useState(0);
  const [formProduct, setFormProduct] = useState<Omit<Product, 'id'>>({
    name: '',
    ingredients: [],
    equipmentUsage: [],
    prepTimeMinutes: 0,
    // yield will be set via effect when batch mode changes
  });

  // Sync batch fields to formProduct
  useEffect(() => {
    setFormProduct(prev => ({
      ...prev,
      yield: isBatch ? (batchYield || undefined) : undefined,
    }));
  }, [isBatch, batchYield]);

  const [search, setSearch] = useState('');
  
  const fetchData = () => {
    Promise.all([
      fetch('/api/products').then(res => res.json()),
      fetch('/api/ingredients').then(res => res.json()),
      fetch('/api/equipos').then(res => res.json()),
      fetch('/api/settings').then(res => res.json())
    ]).then(([prodData, ingData, eqData, setData]) => {
      setProducts(prodData);
      setIngredientsList(ingData);
      setEquiposList(eqData);
      setSettings(setData);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProduct.name) return;

    const finalProduct = {
      ...formProduct,
      ingredients: formProduct.ingredients.map(i => ({ ...i, quantity: Number(i.quantity) || 0 })),
      equipmentUsage: formProduct.equipmentUsage.map(eq => ({ ...eq, minutesUsed: Number(eq.minutesUsed) || 0 })),
      yield: isBatch ? (batchYield || 0) : undefined
    };

    if (editingProductId) {
      const prod: Product = { id: editingProductId, ...finalProduct };
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prod)
      });
      if (res.ok) {
        setProducts(products.map(p => p.id === editingProductId ? prod : p));
        resetForm();
      }
    } else {
      const prod: Product = {
        id: `prod_${Date.now()}`,
        ...finalProduct
      };
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prod)
      });
      if (res.ok) {
        setProducts([...products, prod]);
        resetForm();
      }
    }
  };

  const resetForm = () => {
    setFormProduct({
      name: '',
      ingredients: [],
      equipmentUsage: [],
      prepTimeMinutes: 0,
      yield: isBatch ? batchYield || undefined : undefined,
    });
    setIsBatch(false);
    setBatchYield(0);
    setIsAdding(false);
    setEditingProductId(null);
  };

  const startEdit = (prod: Product) => {
    setEditingProductId(prod.id);
    setFormProduct({
      name: prod.name,
      ingredients: prod.ingredients.map(i => ({...i, unit: i.unit || ''})), 
      equipmentUsage: [...prod.equipmentUsage],
      prepTimeMinutes: prod.prepTimeMinutes,
      customMarginMultiplier: prod.customMarginMultiplier,
      yield: prod.yield
    });
    setIsBatch(!!prod.yield);
    setBatchYield(prod.yield || 0);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const addIngredientToProduct = (ingredientId: string) => {
    if (!ingredientId) return;
    if (formProduct.ingredients.find(i => i.ingredientId === ingredientId)) return;
    const ing = ingredientsList.find(i => i.id === ingredientId);
    if (!ing) return;

    setFormProduct({
      ...formProduct,
      ingredients: [...formProduct.ingredients, { ingredientId, quantity: 1, unit: ing.unit }]
    });
  };

  const updateIngredient = (ingredientId: string, field: 'quantity' | 'unit', value: any) => {
    setFormProduct({
      ...formProduct,
      ingredients: formProduct.ingredients.map(i => i.ingredientId === ingredientId ? { ...i, [field]: value } : i)
    });
  };

  const removeIngredient = (ingredientId: string) => {
    setFormProduct({
      ...formProduct,
      ingredients: formProduct.ingredients.filter(i => i.ingredientId !== ingredientId)
    });
  };

  // Equipment Helpers
  const addEquipmentToProduct = (equipmentId: string) => {
    if (!equipmentId) return;
    if (formProduct.equipmentUsage.find(e => e.equipmentId === equipmentId)) return;
    setFormProduct({
      ...formProduct,
      equipmentUsage: [...formProduct.equipmentUsage, { equipmentId, minutesUsed: 30 }]
    });
  };

  const updateEquipmentMinutes = (equipmentId: string, minutesUsed: number) => {
    setFormProduct({
      ...formProduct,
      equipmentUsage: formProduct.equipmentUsage.map(e => e.equipmentId === equipmentId ? { ...e, minutesUsed } : e)
    });
  };

  const removeEquipment = (equipmentId: string) => {
    setFormProduct({
      ...formProduct,
      equipmentUsage: formProduct.equipmentUsage.filter(e => e.equipmentId !== equipmentId)
    });
  };

  // Math Helpers
  const getIngredientCost = (ingId: string, qty: number, selectedUnit: string) => {
    const ing = ingredientsList.find(i => i.id === ingId);
    if (!ing) return 0;
    const baseCostPerUnit = ing.costPerUnit / (ing.packageSize || 1);

    // If there is no unit selected or it matches the base unit exactly
    if (!selectedUnit || selectedUnit === ing.unit) {
      return baseCostPerUnit * qty;
    }

    // Auto-metric conversions
    const category = getCategory(ing.unit);
    const selectedCategory = getCategory(selectedUnit);

    if (category && category === selectedCategory) {
      const baseInSmallest = CONVERSIONS[category][ing.unit];
      const costPerSmallest = baseCostPerUnit / baseInSmallest;
      
      const selectedInSmallest = CONVERSIONS[category][selectedUnit];
      const costPerSelected = costPerSmallest * selectedInSmallest;
      
      return costPerSelected * qty;
    }

    // Custom Equivalence conversions
    const customEq = ing.customEquivalences?.find(e => e.unitName === selectedUnit);
    if (customEq) {
      return (baseCostPerUnit / customEq.ratioToBase) * qty;
    }

    // Fallback if mismatch
    return baseCostPerUnit * qty;
  };

  const getEquipmentCost = (eqId: string, mins: number) => {
    if (!settings) return 0;
    const eq = equiposList.find(e => e.id === eqId);
    if (!eq) return 0;
    
    if (eq.energyType === 'gas') {
      return (mins / 60) * eq.powerKW * (settings.gasCostPerKg || 0);
    }
    
    return (mins / 60) * eq.powerKW * settings.electricityCostPerKwh;
  };

  const calculateBreakdown = (p: Omit<Product, 'id'>) => {
    if (!settings) return { ingsCost: 0, equipCost: 0, laborCost: 0 };
    const ingsCost = p.ingredients.reduce((sum, item) => sum + getIngredientCost(item.ingredientId, item.quantity, item.unit), 0);
    const equipCost = p.equipmentUsage.reduce((sum, item) => sum + getEquipmentCost(item.equipmentId, item.minutesUsed), 0);
    const laborCost = (p.prepTimeMinutes / 60) * settings.laborRatePerHour;
    return { ingsCost, equipCost, laborCost };
  };

  const calculateTotalCost = (p: Omit<Product, 'id'>) => {
    const { ingsCost, equipCost, laborCost } = calculateBreakdown(p);
    return ingsCost + laborCost + equipCost;
  };

  const calculateSuggestedPrice = (p: Omit<Product, 'id'>) => {
    if (!settings) return 0;
    const totalCost = calculateTotalCost(p);
    const margin = p.customMarginMultiplier || settings.globalMarginMultiplier;
    return totalCost * margin;
  };

  const getAvailableUnitsForIngredient = (ing: Ingredient) => {
    const units = [{ value: ing.unit, label: ing.unit }];
    
    // Auto metrics
    const category = getCategory(ing.unit);
    if (category) {
      Object.keys(CONVERSIONS[category]).forEach(u => {
        if (u !== ing.unit) {
          units.push({ value: u, label: u });
        }
      });
    }

    // Custom
    if (ing.customEquivalences) {
      ing.customEquivalences.forEach(eq => {
        units.push({ value: eq.unitName, label: eq.unitName });
      });
    }

    return units;
  };

  if (loading || !settings) return <div className="animate-fade-in">Cargando...</div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Productos y Precios</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Calcula tus costos con precisión suiza para garantizar rentabilidad.</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          if (isAdding) {
            resetForm();
          } else {
            setIsAdding(true);
          }
        }}>
          {isAdding ? 'Cancelar' : '+ Crear Producto'}
        </button>
      </div>

      {isAdding && (
        <div className="glass-panel" style={{ padding: '2.5rem', marginBottom: '3rem', border: '2px solid var(--accent-secondary)' }}>
          <h3 style={{ marginBottom: '2rem' }}>{editingProductId ? 'Editar Producto' : 'Calculadora de Nuevo Producto'}</h3>
          <form onSubmit={handleSaveProduct}>
            <div className="form-group">
              <label className="form-label">Nombre del Producto</label>
              <input type="text" className="form-input" value={formProduct.name} onChange={e => setFormProduct({...formProduct, name: e.target.value})} required placeholder="ej. Lote de 10 Croissants" />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">
                ¿Es un lote? <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}> (Marque si el producto se prepara en lotes y especifique cuántas porciones rinde el lote)
                </span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={isBatch}
                  onChange={e => setIsBatch(e.target.checked)}
                  style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                />
                {isBatch && (
                  <>
                    <span className="form-label" style={{ marginRight: '0.5rem' }}>Porciones por lote:</span>
                    <input
                      type="number"
                      min={1}
                      placeholder="Ej: 12"
                      value={batchYield}
                      onChange={e => setBatchYield(parseInt(e.target.value) || 0)}
                      className="form-input"
                      style={{ width: '100px' }}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="responsive-grid-2" style={{ display: 'grid', gap: '2rem', marginBottom: '2rem' }} data-cols="1fr 1fr">
              <div>
                <h4 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>1. Mano de Obra</h4>
                <div className="form-group">
                  <label className="form-label">Tiempo de Preparación (Minutos)</label>
                  <input type="number" className="form-input" value={formProduct.prepTimeMinutes} onChange={e => setFormProduct({...formProduct, prepTimeMinutes: parseInt(e.target.value) || 0})} />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Costo estimado: ${((formProduct.prepTimeMinutes/60) * settings.laborRatePerHour).toFixed(2)}
                  </p>
                </div>
              </div>

              <div>
                <h4 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>2. Estrategia de Margen</h4>
                <div className="form-group">
                  <label className="form-label">Multiplicador Personalizado (Opcional)</label>
                  <input type="number" className="form-input" value={formProduct.customMarginMultiplier || ''} placeholder={`Global actual: ${settings.globalMarginMultiplier}`} onChange={e => setFormProduct({...formProduct, customMarginMultiplier: parseFloat(e.target.value) || undefined})} step="0.1" />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Déjalo en blanco para usar la configuración global.</p>
                </div>
              </div>
            </div>

            <h4 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>3. Receta (Ingredientes)</h4>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.4)', padding: '1.5rem', borderRadius: 'var(--border-radius-sm)', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <SearchableSelect 
                  items={ingredientsList.map(i => ({ 
                    id: i.id, 
                    label: `${i.name} ($${(i.costPerUnit / (i.packageSize || 1)).toFixed(2)}/${i.unit})` 
                  }))}
                  placeholder="🔍 Buscar ingrediente..."
                  onSelect={addIngredientToProduct}
                />
              </div>

              {formProduct.ingredients.map(item => {
                const ing = ingredientsList.find(i => i.id === item.ingredientId);
                if (!ing) return null;
                const availableUnits = getAvailableUnitsForIngredient(ing);
                
                const currentUnit = item.unit || ing.unit;

                return (
                  <div key={item.ingredientId} className="ingredient-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', padding: '0.5rem', background: 'white', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ flex: 1, fontWeight: 500 }}>{ing.name}</span>
                    <input type="number" className="form-input" style={{ width: '100px', padding: '0.5rem' }} value={item.quantity} onChange={e => updateIngredient(item.ingredientId, 'quantity', e.target.value)} step="any" />
                    
                    <select className="form-input" style={{ width: '120px', padding: '0.5rem' }} value={currentUnit} onChange={e => updateIngredient(item.ingredientId, 'unit', e.target.value)}>
                      {availableUnits.map(u => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>

                    <span style={{ width: '100px', textAlign: 'right', fontWeight: 600 }}>${getIngredientCost(item.ingredientId, item.quantity, currentUnit).toFixed(2)}</span>
                    <button type="button" onClick={() => removeIngredient(item.ingredientId)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>X</button>
                  </div>
                );
              })}
              {formProduct.ingredients.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No has agregado ingredientes.</p>}
            </div>

            <h4 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>4. Uso de Equipos (Energía)</h4>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.4)', padding: '1.5rem', borderRadius: 'var(--border-radius-sm)', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <SearchableSelect 
                  items={equiposList.map(eq => ({ id: eq.id, label: `${eq.name} (${eq.energyType === 'gas' ? eq.powerKW + ' kg/h' : eq.powerKW + ' kW'})` }))}
                  placeholder="🔍 Buscar equipo..."
                  onSelect={addEquipmentToProduct}
                />
              </div>

              {formProduct.equipmentUsage.map(item => {
                const eq = equiposList.find(e => e.id === item.equipmentId);
                if (!eq) return null;
                return (
                  <div key={item.equipmentId} className="ingredient-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', padding: '0.5rem', background: 'white', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ flex: 1, fontWeight: 500 }}>{eq.name}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Minutos:</span>
                    <input type="number" className="form-input" style={{ width: '100px', padding: '0.5rem' }} value={item.minutesUsed} onChange={e => updateEquipmentMinutes(item.equipmentId, e.target.value as any)} step="any" />
                    <span style={{ width: '100px', textAlign: 'right', fontWeight: 600 }}>${getEquipmentCost(item.equipmentId, item.minutesUsed).toFixed(2)}</span>
                    <button type="button" onClick={() => removeEquipment(item.equipmentId)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>X</button>
                  </div>
                );
              })}
              {formProduct.equipmentUsage.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No has agregado equipos.</p>}
            </div>

            <div className="product-summary" style={{ background: 'var(--color-carbon)', color: 'white', padding: '2rem', borderRadius: 'var(--border-radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: 'var(--color-leche)', marginBottom: '0.5rem' }}>Costo Total: <strong style={{ color: 'white' }}>${calculateTotalCost(formProduct).toFixed(2)}</strong></p>
                <p style={{ fontSize: '0.9rem', color: '#999' }}>
                  Ings: ${formProduct.ingredients.reduce((s, i) => s + getIngredientCost(i.ingredientId, i.quantity, i.unit), 0).toFixed(2)} | 
                  Labor: ${((formProduct.prepTimeMinutes/60) * settings.laborRatePerHour).toFixed(2)} | 
                  Elec: ${formProduct.equipmentUsage.reduce((s, e) => s + getEquipmentCost(e.equipmentId, e.minutesUsed), 0).toFixed(2)}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: 'var(--color-leche)', fontSize: '0.9rem' }}>Precio Sugerido (Venta)</p>
                <h2 style={{ color: 'var(--accent-primary)', fontSize: '2.5rem', margin: 0 }}>${calculateSuggestedPrice(formProduct).toFixed(2)}</h2>
              </div>
            </div>

            {isBatch && batchYield > 0 && (
              <div className="product-summary" style={{ background: 'white', border: '2px solid var(--accent-secondary)', color: 'var(--text-primary)', padding: '2rem', borderRadius: 'var(--border-radius-md)', marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Costo por porción</p>
                  <strong style={{ fontSize: '1.4rem' }}>${(calculateTotalCost(formProduct) / batchYield).toFixed(2)}</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Precio por porción (venta)</p>
                  <h2 style={{ color: 'var(--accent-secondary)', fontSize: '2.5rem', margin: 0 }}>${(calculateSuggestedPrice(formProduct) / batchYield).toFixed(2)}</h2>
                </div>
              </div>
            )}

            <div style={{ marginTop: '2rem', textAlign: 'right' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.2rem' }}>
                {editingProductId ? 'Actualizar Producto' : 'Guardar Producto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search bar */}
      <div className="search-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div className="search-wrapper" style={{ flex: 1 }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder={`Buscar entre ${products.length} producto${products.length !== 1 ? 's' : ''}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontWeight: 500 }}>
          {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).length} de {products.length} resultado{products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
        {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(prod => (
          <div key={prod.id} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, flex: 1, fontSize: '1.2rem' }}>{prod.name}</h3>
              <div>
                <button onClick={() => startEdit(prod)} className="table-action-btn table-action-edit">Editar</button>
                <button onClick={() => handleDelete(prod.id)} className="table-action-btn table-action-delete">Eliminar</button>
              </div>
            </div>
            
            <div style={{ margin: '0.75rem 0', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span className="badge badge-auto">🧠 {prod.ingredients.length} ingrediente{prod.ingredients.length !== 1 ? 's' : ''}</span>
              <span className="badge badge-auto" style={{ marginTop: '4px' }}>⏱️ {prod.prepTimeMinutes} min preparación</span>
              {prod.equipmentUsage.length > 0 && <span className="badge badge-auto" style={{ marginTop: '4px' }}>⚡ {prod.equipmentUsage.length} equipo{prod.equipmentUsage.length !== 1 ? 's' : ''}</span>}
              {prod.yield ? <span className="badge badge-auto" style={{ marginTop: '4px' }}>🍪 {prod.yield} porción{prod.yield !== 1 ? 'es' : ''} por lote</span> : null}
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Costo Total:</span>
                <strong>${calculateTotalCost(prod).toFixed(2)}</strong>
              </div>
              {prod.yield ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Costo por porción:</span>
                  <strong>${(calculateTotalCost(prod) / prod.yield).toFixed(2)}</strong>
                </div>
              ) : null}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{prod.yield ? 'Precio por porción:' : 'Precio Sugerido:'}</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-primary)' }}>${(calculateSuggestedPrice(prod) / (prod.yield || 1)).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ganancia (${prod.yield ? 'porción' : 'total'}):</span>
                <strong style={{ color: 'var(--accent-secondary)', fontSize: '1.2rem' }}>${((calculateSuggestedPrice(prod) - calculateTotalCost(prod)) / (prod.yield || 1)).toFixed(2)}</strong>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ flex: 1 }}
                  onClick={() => setInsightsProduct(prod)}
                >
                  📊 Ver Estadísticas
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{ flex: 1 }}
                  onClick={() => setIngredientsProduct(prod)}
                >
                  📋 Ver Ingredientes
                </button>
              </div>
            </div>
          </div>
        ))}
        {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).length === 0 && !isAdding && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state">
              <div className="empty-state-icon">☕</div>
              <h4>{search ? 'Sin resultados' : 'Aún no has creado productos'}</h4>
              <p>{search ? `No se encontró ningún producto con "${search}".` : 'Crea tu primer producto usando el botón de arriba.'}</p>
              {!search && <button className="btn btn-outline" style={{ marginTop: '1.5rem' }} onClick={() => setIsAdding(true)}>Crear primer producto</button>}
            </div>
          </div>
        )}
      </div>

      {/* Insights Modal */}
      {insightsProduct && (
        <div style={{ position: 'fixed', inset: 0, height: '100vh', background: 'rgba(36, 27, 20, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={() => setInsightsProduct(null)}>
          <div className="glass-panel animate-fade-in" style={{ background: 'var(--bg-main)', padding: '0', width: '100%', maxWidth: '650px', maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto', margin: 'auto', position: 'relative', borderRadius: 'var(--border-radius-md)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ position: 'sticky', top: 0, background: 'rgba(251, 246, 234, 0.95)', backdropFilter: 'blur(10px)', padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 10 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>{insightsProduct.name}</h2>
                <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>Análisis Financiero y Rentabilidad</p>
              </div>
              <button onClick={() => setInsightsProduct(null)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'var(--transition)' }} className="close-btn-hover">
                ✕
              </button>
            </div>
            
            <div style={{ padding: '2rem' }}>
              {insightsProduct && (
                (() => {
                  const breakdown = calculateBreakdown(insightsProduct);
                  const totalCost = calculateTotalCost(insightsProduct);
                  const suggestedPrice = calculateSuggestedPrice(insightsProduct);
                  const profit = suggestedPrice - totalCost;
                  const foodCostPct = (breakdown.ingsCost / suggestedPrice) * 100 || 0;
                  const marginPct = (profit / suggestedPrice) * 100 || 0;

                  let recommendation = "";
                  let recommendationColor = "var(--text-secondary)";
                  let recommendationIcon = "💡";

                  if (foodCostPct > 35) {
                    recommendation = "El costo de ingredientes (Food Cost) es mayor al 35%. Estás sacrificando margen. Considera subir el precio de venta, reducir porciones o buscar proveedores más económicos.";
                    recommendationColor = "#e53e3e"; // Red
                    recommendationIcon = "⚠️";
                  } else if (foodCostPct > 0 && foodCostPct <= 25) {
                    recommendation = "Tienes un margen excelente (Food Cost bajo). Este producto es altamente rentable. ¡Considera hacer campañas de marketing o combos para vender más volumen de este!";
                    recommendationColor = "var(--accent-secondary)"; // Caribe green
                    recommendationIcon = "🚀";
                  } else {
                    recommendation = "El costo de alimentos está dentro del rango ideal (25% - 35%). Es un producto perfectamente equilibrado. Sigue monitoreando los precios de los ingredientes.";
                    recommendationColor = "var(--accent-primary)"; // Canela
                    recommendationIcon = "✅";
                  }

                  return (
                    <div>
                      {/* Key Metrics */}
                      <div className="responsive-grid-2" style={{ display: 'grid', gap: '1rem', marginBottom: '2.5rem' }} data-cols="1fr 1fr">
                        <div style={{ background: 'var(--color-carbon)', padding: '1.5rem', borderRadius: 'var(--border-radius-sm)', textAlign: 'center', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <p style={{ color: 'var(--color-leche)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Precio Sugerido</p>
                          <h3 style={{ color: 'var(--accent-primary)', fontSize: '2.5rem', margin: '0' }}>${suggestedPrice.toFixed(2)}</h3>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div style={{ background: 'white', padding: '1rem 1.5rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ganancia Neta</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>${profit.toFixed(2)}</span>
                          </div>
                          <div style={{ background: 'white', padding: '1rem 1.5rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Margen (Profit)</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: marginPct >= 65 ? 'var(--accent-secondary)' : 'var(--text-primary)' }}>{marginPct.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>

                      {/* AI Insights Box */}
                      <div style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.8)', border: `2px solid ${recommendationColor}`, borderRadius: 'var(--border-radius-md)', marginBottom: '2.5rem', display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: '2rem', lineHeight: 1 }}>{recommendationIcon}</div>
                        <div>
                          <h4 style={{ margin: '0 0 0.5rem 0', color: recommendationColor, fontSize: '1rem' }}>Socio de Negocios</h4>
                          <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--text-primary)', margin: 0 }}>
                            {recommendation}
                          </p>
                        </div>
                      </div>

                      {/* Cost Breakdown */}
                      <h4 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        Desglose de Costo Total: <span style={{ color: 'var(--accent-primary)' }}>${totalCost.toFixed(2)}</span>
                      </h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Ingredientes */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                            <span style={{ fontWeight: 500 }}>🥕 Ingredientes (Food Cost)</span>
                            <span style={{ fontWeight: 600 }}>${breakdown.ingsCost.toFixed(2)} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>({((breakdown.ingsCost / totalCost) * 100 || 0).toFixed(1)}%)</span></span>
                          </div>
                          <div style={{ height: '10px', background: 'rgba(0,0,0,0.05)', borderRadius: '5px', overflow: 'hidden' }}>
                            <div style={{ width: `${(breakdown.ingsCost / totalCost) * 100 || 0}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 1s ease-out' }}></div>
                          </div>
                        </div>

                        {/* Mano de Obra */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                            <span style={{ fontWeight: 500 }}>👨‍🍳 Mano de Obra</span>
                            <span style={{ fontWeight: 600 }}>${breakdown.laborCost.toFixed(2)} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>({((breakdown.laborCost / totalCost) * 100 || 0).toFixed(1)}%)</span></span>
                          </div>
                          <div style={{ height: '10px', background: 'rgba(0,0,0,0.05)', borderRadius: '5px', overflow: 'hidden' }}>
                            <div style={{ width: `${(breakdown.laborCost / totalCost) * 100 || 0}%`, height: '100%', background: 'var(--color-carbon)', transition: 'width 1s ease-out' }}></div>
                          </div>
                        </div>

                        {/* Equipos / Energía */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                            <span style={{ fontWeight: 500 }}>⚡ Energía (Equipos)</span>
                            <span style={{ fontWeight: 600 }}>${breakdown.equipCost.toFixed(2)} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>({((breakdown.equipCost / totalCost) * 100 || 0).toFixed(1)}%)</span></span>
                          </div>
                          <div style={{ height: '10px', background: 'rgba(0,0,0,0.05)', borderRadius: '5px', overflow: 'hidden' }}>
                            <div style={{ width: `${(breakdown.equipCost / totalCost) * 100 || 0}%`, height: '100%', background: 'var(--accent-secondary)', transition: 'width 1s ease-out' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ingredients Modal */}
      {ingredientsProduct && (
        <div style={{ position: 'fixed', inset: 0, height: '100vh', background: 'rgba(36, 27, 20, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={() => setIngredientsProduct(null)}>
          <div className="glass-panel animate-fade-in" style={{ background: 'var(--bg-main)', padding: '0', width: '100%', maxWidth: '650px', maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto', margin: 'auto', position: 'relative', borderRadius: 'var(--border-radius-md)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ position: 'sticky', top: 0, background: 'rgba(251, 246, 234, 0.95)', backdropFilter: 'blur(10px)', padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 10 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>{ingredientsProduct.name}</h2>
                <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>Ingredientes y Costos</p>
              </div>
              <button onClick={() => setIngredientsProduct(null)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'var(--transition)' }} className="close-btn-hover">
                ✕
              </button>
            </div>
            <div style={{ padding: '2rem' }}>
              {ingredientsProduct.ingredients.length > 0 ? (
                ingredientsProduct.ingredients.map(i => {
                  const ing = ingredientsList.find(i2 => i2.id === i.ingredientId);
                  const cost = getIngredientCost(i.ingredientId, i.quantity, i.unit);
                  return (
                    <div key={i.ingredientId} style={{ marginBottom: '1rem', padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                      <strong>{ing?.name || 'Ingrediente'}:</strong> ${cost.toFixed(2)}
                    </div>
                  );
                })
              ) : (
                <p>No hay ingredientes.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
