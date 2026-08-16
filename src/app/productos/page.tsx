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
type ConversionCategory = 'mass' | 'volume';

type Product = {
  id: string;
  name: string;
  ingredients: ProductIngredient[];
  equipmentUsage: ProductEquipment[];
  prepTimeMinutes: number;
  customMarginMultiplier?: number;
  yield?: number;
  recipeSteps?: string[];
  salePrice?: number;
};

// Auto Conversion engine
const CONVERSIONS: Record<ConversionCategory, Record<string, number>> = {
  mass: { kg: 1000, gramo: 1, lb: 453.592, oz: 28.3495, mg: 0.001 },
  volume: { litro: 1000, ml: 1, galon: 3785.41, taza: 236.588, cucharada: 14.7868, cucharadita: 4.92892, 'fl oz': 29.5735 }
};

const getCategory = (unit: string): ConversionCategory | null => {
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
  const [productDetailsTab, setProductDetailsTab] = useState<'ingredients' | 'recipe'>('ingredients');
  const [isBatch, setIsBatch] = useState(false);
  const [batchYield, setBatchYield] = useState(0);
  const [formProduct, setFormProduct] = useState<Omit<Product, 'id'>>({
    name: '',
    ingredients: [],
    equipmentUsage: [],
    prepTimeMinutes: 0,
    recipeSteps: [],
  });

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
      recipeSteps: (formProduct.recipeSteps || []).map(step => step.trim()).filter(Boolean),
      salePrice: formProduct.salePrice && formProduct.salePrice > 0 ? Number(formProduct.salePrice) : undefined,
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
        id: `prod_${crypto.randomUUID()}`,
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
      recipeSteps: [],
      salePrice: undefined,
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
      yield: prod.yield,
      recipeSteps: [...(prod.recipeSteps || [])],
      salePrice: prod.salePrice
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

  const updateIngredient = (ingredientId: string, field: 'quantity' | 'unit', value: string) => {
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

  const addRecipeStep = () => {
    setFormProduct({
      ...formProduct,
      recipeSteps: [...(formProduct.recipeSteps || []), '']
    });
  };

  const updateRecipeStep = (index: number, value: string) => {
    setFormProduct({
      ...formProduct,
      recipeSteps: (formProduct.recipeSteps || []).map((step, stepIndex) => stepIndex === index ? value : step)
    });
  };

  const removeRecipeStep = (index: number) => {
    setFormProduct({
      ...formProduct,
      recipeSteps: (formProduct.recipeSteps || []).filter((_, stepIndex) => stepIndex !== index)
    });
  };

  const moveRecipeStep = (index: number, direction: -1 | 1) => {
    const steps = [...(formProduct.recipeSteps || [])];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    [steps[index], steps[targetIndex]] = [steps[targetIndex], steps[index]];
    setFormProduct({
      ...formProduct,
      recipeSteps: steps
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

  const getUnitCount = (p: Omit<Product, 'id'>) => p.yield && p.yield > 0 ? p.yield : 1;

  const calculateUnitCost = (p: Omit<Product, 'id'>) => calculateTotalCost(p) / getUnitCount(p);

  const calculateSuggestedUnitPrice = (p: Omit<Product, 'id'>) => calculateSuggestedPrice(p) / getUnitCount(p);

  const calculateActualUnitPrice = (p: Omit<Product, 'id'>) => p.salePrice && p.salePrice > 0 ? p.salePrice : calculateSuggestedUnitPrice(p);

  const calculateActualTotalRevenue = (p: Omit<Product, 'id'>) => calculateActualUnitPrice(p) * getUnitCount(p);

  const calculateActualProfit = (p: Omit<Product, 'id'>) => calculateActualTotalRevenue(p) - calculateTotalCost(p);

  const calculateActualMarginPct = (p: Omit<Product, 'id'>) => {
    const revenue = calculateActualTotalRevenue(p);
    return revenue > 0 ? (calculateActualProfit(p) / revenue) * 100 : 0;
  };

  const getPriceAdvice = (p: Omit<Product, 'id'>) => {
    const unitCost = calculateUnitCost(p);
    const unitPrice = calculateActualUnitPrice(p);
    const marginPct = calculateActualMarginPct(p);
    const usesManualPrice = !!(p.salePrice && p.salePrice > 0);

    if (!unitPrice) {
      return { label: 'Sin precio', message: 'Agrega costos o un precio de venta para evaluar la rentabilidad.', color: 'var(--text-secondary)', icon: '💡' };
    }

    if (unitPrice <= unitCost) {
      return { label: 'Precio bajo costo', message: `Este precio queda por debajo del costo ${p.yield ? 'por pieza' : 'del producto'}. Necesitas subirlo para no vender con pérdida.`, color: '#e53e3e', icon: '⚠️' };
    }

    if (marginPct < 45) {
      return { label: 'Margen apretado', message: `El margen queda en ${marginPct.toFixed(1)}%. Funciona, pero hay poco espacio para mermas, descuentos o cambios de proveedor.`, color: '#d97706', icon: '⚖️' };
    }

    if (marginPct > 80) {
      return { label: 'Margen alto', message: `El margen queda en ${marginPct.toFixed(1)}%. Es muy rentable; valida que el mercado acepte este precio.`, color: 'var(--accent-primary)', icon: '📈' };
    }

    return { label: usesManualPrice ? 'Precio saludable' : 'Sugerencia saludable', message: `El margen queda en ${marginPct.toFixed(1)}%. El precio mantiene una rentabilidad equilibrada.`, color: 'var(--accent-secondary)', icon: '✅' };
  };

  const openProductDetails = (prod: Product, tab: 'ingredients' | 'recipe' = 'ingredients') => {
    setIngredientsProduct(prod);
    setProductDetailsTab(tab);
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
                <h4 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>2. Precio y Margen</h4>
                <div className="form-group">
                  <label className="form-label">Multiplicador Personalizado (Opcional)</label>
                  <input type="number" className="form-input" value={formProduct.customMarginMultiplier || ''} placeholder={`Global actual: ${settings.globalMarginMultiplier}`} onChange={e => setFormProduct({...formProduct, customMarginMultiplier: parseFloat(e.target.value) || undefined})} step="0.1" />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Déjalo en blanco para usar la configuración global.</p>
                </div>
                <div className="form-group">
                  <label className="form-label">{isBatch ? 'Precio de venta por pieza (Opcional)' : 'Precio de venta manual (Opcional)'}</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formProduct.salePrice || ''}
                    placeholder={`Sugerido: $${calculateSuggestedUnitPrice(formProduct).toFixed(2)}`}
                    onChange={e => setFormProduct({...formProduct, salePrice: parseFloat(e.target.value) || undefined})}
                    step="0.01"
                    min={0}
                  />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Si lo dejas vacío, se usará el precio sugerido automáticamente.
                  </p>
                </div>
                {(() => {
                  const advice = getPriceAdvice(formProduct);
                  return (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'white', border: `1px solid ${advice.color}`, borderRadius: 'var(--border-radius-sm)' }}>
                      <strong style={{ display: 'block', color: advice.color, marginBottom: '0.35rem' }}>{advice.icon} {advice.label}</strong>
                      <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.45 }}>{advice.message}</p>
                    </div>
                  );
                })()}
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
                    <input type="number" className="form-input" style={{ width: '100px', padding: '0.5rem' }} value={item.minutesUsed} onChange={e => updateEquipmentMinutes(item.equipmentId, parseFloat(e.target.value) || 0)} step="any" />
                    <span style={{ width: '100px', textAlign: 'right', fontWeight: 600 }}>${getEquipmentCost(item.equipmentId, item.minutesUsed).toFixed(2)}</span>
                    <button type="button" onClick={() => removeEquipment(item.equipmentId)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>X</button>
                  </div>
                );
              })}
              {formProduct.equipmentUsage.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No has agregado equipos.</p>}
            </div>

            <h4 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>5. Pasos de Preparación</h4>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.4)', padding: '1.5rem', borderRadius: 'var(--border-radius-sm)', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>Guarda el método para preparar este producto, paso por paso.</p>
                <button type="button" className="btn btn-outline" onClick={addRecipeStep} style={{ whiteSpace: 'nowrap' }}>
                  + Paso
                </button>
              </div>

              {(formProduct.recipeSteps || []).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {(formProduct.recipeSteps || []).map((step, index) => (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: '0.75rem', alignItems: 'start', padding: '0.75rem', background: 'white', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-carbon)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        {index + 1}
                      </div>
                      <textarea
                        className="form-input"
                        value={step}
                        onChange={e => updateRecipeStep(index, e.target.value)}
                        placeholder="Ej. Mezclar los ingredientes secos hasta integrar."
                        rows={2}
                        style={{ resize: 'vertical', minHeight: '52px' }}
                      />
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button type="button" onClick={() => moveRecipeStep(index, -1)} disabled={index === 0} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '32px', height: '32px', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.4 : 1 }}>↑</button>
                        <button type="button" onClick={() => moveRecipeStep(index, 1)} disabled={index === (formProduct.recipeSteps || []).length - 1} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '32px', height: '32px', cursor: index === (formProduct.recipeSteps || []).length - 1 ? 'not-allowed' : 'pointer', opacity: index === (formProduct.recipeSteps || []).length - 1 ? 0.4 : 1 }}>↓</button>
                        <button type="button" onClick={() => removeRecipeStep(index)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem' }}>X</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', background: 'white', borderRadius: 'var(--border-radius-sm)', border: '1px dashed var(--border-color)' }}>
                  No has agregado pasos de preparación.
                </div>
              )}
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
                <p style={{ color: 'var(--color-leche)', fontSize: '0.9rem' }}>{isBatch ? 'Precio actual por pieza' : 'Precio actual de venta'}</p>
                <h2 style={{ color: 'var(--accent-primary)', fontSize: '2.5rem', margin: 0 }}>${calculateActualUnitPrice(formProduct).toFixed(2)}</h2>
                <p style={{ color: '#bbb', fontSize: '0.85rem', margin: '0.35rem 0 0' }}>Sugerido: ${calculateSuggestedUnitPrice(formProduct).toFixed(2)}</p>
              </div>
            </div>

            {isBatch && batchYield > 0 && (
              <div className="product-summary" style={{ background: 'white', border: '2px solid var(--accent-secondary)', color: 'var(--text-primary)', padding: '2rem', borderRadius: 'var(--border-radius-md)', marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Lote de {batchYield} pieza{batchYield !== 1 ? 's' : ''}</p>
                  <strong style={{ fontSize: '1.4rem' }}>${(calculateTotalCost(formProduct) / batchYield).toFixed(2)}</strong>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.35rem 0 0' }}>Costo por pieza</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Precio actual por pieza</p>
                  <h2 style={{ color: 'var(--accent-secondary)', fontSize: '2.5rem', margin: 0 }}>${calculateActualUnitPrice(formProduct).toFixed(2)}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.35rem 0 0' }}>Ingreso lote: ${calculateActualTotalRevenue(formProduct).toFixed(2)}</p>
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
        {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(prod => {
          const priceAdvice = getPriceAdvice(prod);
          const unitLabel = prod.yield ? 'pieza' : 'producto';
          return (
          <div key={prod.id} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, flex: 1, fontSize: '1.2rem' }}>{prod.name}</h3>
              <div>
                <button onClick={() => startEdit(prod)} className="table-action-btn table-action-edit">Editar</button>
                <button onClick={() => handleDelete(prod.id)} className="table-action-btn table-action-delete">Eliminar</button>
              </div>
            </div>
            
            <div style={{ margin: '0.75rem 0', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {prod.yield ? <span className="badge badge-auto" style={{ marginTop: '4px', background: 'var(--color-carbon)', color: 'white' }}>Lote</span> : null}
              <span className="badge badge-auto">🧠 {prod.ingredients.length} ingrediente{prod.ingredients.length !== 1 ? 's' : ''}</span>
              <span className="badge badge-auto" style={{ marginTop: '4px' }}>⏱️ {prod.prepTimeMinutes} min preparación</span>
              {prod.equipmentUsage.length > 0 && <span className="badge badge-auto" style={{ marginTop: '4px' }}>⚡ {prod.equipmentUsage.length} equipo{prod.equipmentUsage.length !== 1 ? 's' : ''}</span>}
              {(prod.recipeSteps || []).length > 0 && <span className="badge badge-auto" style={{ marginTop: '4px' }}>📝 {(prod.recipeSteps || []).length} paso{(prod.recipeSteps || []).length !== 1 ? 's' : ''}</span>}
              {prod.yield ? <span className="badge badge-auto" style={{ marginTop: '4px' }}>🍪 Rinde {prod.yield} pieza{prod.yield !== 1 ? 's' : ''}</span> : null}
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{prod.yield ? 'Costo lote:' : 'Costo total:'}</span>
                <strong>${calculateTotalCost(prod).toFixed(2)}</strong>
              </div>
              {prod.yield ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Costo por pieza:</span>
                  <strong>${calculateUnitCost(prod).toFixed(2)}</strong>
                </div>
              ) : null}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Precio actual por {unitLabel}:</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-primary)' }}>${calculateActualUnitPrice(prod).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Sugerido por {unitLabel}:</span>
                <strong>${calculateSuggestedUnitPrice(prod).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ganancia por {unitLabel}:</span>
                <strong style={{ color: 'var(--accent-secondary)', fontSize: '1.2rem' }}>${(calculateActualProfit(prod) / getUnitCount(prod)).toFixed(2)}</strong>
              </div>
              <div style={{ padding: '0.85rem', border: `1px solid ${priceAdvice.color}`, borderRadius: 'var(--border-radius-sm)', background: 'rgba(255,255,255,0.65)', marginTop: '1rem' }}>
                <strong style={{ color: priceAdvice.color, display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>{priceAdvice.icon} {priceAdvice.label}</strong>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.35 }}>{priceAdvice.message}</p>
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
                  onClick={() => openProductDetails(prod)}
                >
                  📋 Ver Ingredientes
                </button>
              </div>
            </div>
          </div>
          );
        })}
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
                  const suggestedUnitPrice = calculateSuggestedUnitPrice(insightsProduct);
                  const actualUnitPrice = calculateActualUnitPrice(insightsProduct);
                  const actualRevenue = calculateActualTotalRevenue(insightsProduct);
                  const profit = calculateActualProfit(insightsProduct);
                  const marginPct = calculateActualMarginPct(insightsProduct);
                  const priceAdvice = getPriceAdvice(insightsProduct);
                  const unitLabel = insightsProduct.yield ? 'pieza' : 'producto';

                  return (
                    <div>
                      {/* Key Metrics */}
                      <div className="responsive-grid-2" style={{ display: 'grid', gap: '1rem', marginBottom: '2.5rem' }} data-cols="1fr 1fr">
                        <div style={{ background: 'var(--color-carbon)', padding: '1.5rem', borderRadius: 'var(--border-radius-sm)', textAlign: 'center', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <p style={{ color: 'var(--color-leche)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Precio actual por {unitLabel}</p>
                          <h3 style={{ color: 'var(--accent-primary)', fontSize: '2.5rem', margin: '0' }}>${actualUnitPrice.toFixed(2)}</h3>
                          <p style={{ color: '#bbb', fontSize: '0.85rem', margin: '0.35rem 0 0' }}>Sugerido: ${suggestedUnitPrice.toFixed(2)}</p>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div style={{ background: 'white', padding: '1rem 1.5rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{insightsProduct.yield ? 'Ingreso por lote' : 'Ingreso por venta'}</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>${actualRevenue.toFixed(2)}</span>
                          </div>
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
                      <div style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.8)', border: `2px solid ${priceAdvice.color}`, borderRadius: 'var(--border-radius-md)', marginBottom: '2.5rem', display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: '2rem', lineHeight: 1 }}>{priceAdvice.icon}</div>
                        <div>
                          <h4 style={{ margin: '0 0 0.5rem 0', color: priceAdvice.color, fontSize: '1rem' }}>{priceAdvice.label}</h4>
                          <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--text-primary)', margin: 0 }}>
                            {priceAdvice.message}
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

      {/* Product Details Modal */}
      {ingredientsProduct && (
        <div style={{ position: 'fixed', inset: 0, height: '100vh', background: 'rgba(36, 27, 20, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={() => setIngredientsProduct(null)}>
          <div className="glass-panel animate-fade-in" style={{ background: 'var(--bg-main)', padding: '0', width: '100%', maxWidth: '760px', maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto', margin: 'auto', position: 'relative', borderRadius: 'var(--border-radius-md)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ position: 'sticky', top: 0, background: 'rgba(251, 246, 234, 0.96)', backdropFilter: 'blur(10px)', padding: '1.5rem 2rem 1rem', borderBottom: '1px solid var(--border-color)', zIndex: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>{ingredientsProduct.name}</h2>
                  <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                    {ingredientsProduct.yield ? `Lote de ${ingredientsProduct.yield} pieza${ingredientsProduct.yield !== 1 ? 's' : ''}` : 'Detalles de producto'}
                  </p>
                </div>
                <button onClick={() => setIngredientsProduct(null)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'var(--transition)', flex: '0 0 auto' }} className="close-btn-hover">
                  ✕
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginTop: '1.25rem' }}>
                <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '0.85rem 1rem' }}>
                  <p style={{ margin: '0 0 0.25rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Precio actual</p>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--accent-secondary)' }}>${calculateActualUnitPrice(ingredientsProduct).toFixed(2)}</strong>
                </div>
                <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '0.85rem 1rem' }}>
                  <p style={{ margin: '0 0 0.25rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Costo ingredientes</p>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--accent-primary)' }}>${ingredientsProduct.ingredients.reduce((sum, item) => sum + getIngredientCost(item.ingredientId, item.quantity, item.unit), 0).toFixed(2)}</strong>
                </div>
                <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '0.85rem 1rem' }}>
                  <p style={{ margin: '0 0 0.25rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Ingredientes</p>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{ingredientsProduct.ingredients.length}</strong>
                </div>
                <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '0.85rem 1rem' }}>
                  <p style={{ margin: '0 0 0.25rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Pasos receta</p>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{(ingredientsProduct.recipeSteps || []).length}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', background: 'rgba(255,255,255,0.55)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => setProductDetailsTab('ingredients')}
                  style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', border: 'none', cursor: 'pointer', background: productDetailsTab === 'ingredients' ? 'var(--color-carbon)' : 'transparent', color: productDetailsTab === 'ingredients' ? 'white' : 'var(--text-primary)', fontWeight: 700 }}
                >
                  Ingredientes
                </button>
                <button
                  type="button"
                  onClick={() => setProductDetailsTab('recipe')}
                  style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', border: 'none', cursor: 'pointer', background: productDetailsTab === 'recipe' ? 'var(--color-carbon)' : 'transparent', color: productDetailsTab === 'recipe' ? 'white' : 'var(--text-primary)', fontWeight: 700 }}
                >
                  Receta
                </button>
              </div>
            </div>
            <div style={{ padding: '2rem' }}>
              {productDetailsTab === 'ingredients' ? (
                ingredientsProduct.ingredients.length > 0 ? (
                  (() => {
                    const ingredientTotal = ingredientsProduct.ingredients.reduce((sum, item) => sum + getIngredientCost(item.ingredientId, item.quantity, item.unit), 0);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {ingredientsProduct.ingredients.map(i => {
                          const ing = ingredientsList.find(i2 => i2.id === i.ingredientId);
                          const cost = getIngredientCost(i.ingredientId, i.quantity, i.unit);
                          const percentage = ingredientTotal ? (cost / ingredientTotal) * 100 : 0;
                          return (
                            <div key={i.ingredientId} style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '1rem', display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center' }}>
                              <div>
                                <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{ing?.name || 'Ingrediente'}</strong>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{i.quantity} {i.unit || ing?.unit || ''}</span>
                                <div style={{ height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '999px', overflow: 'hidden', marginTop: '0.75rem' }}>
                                  <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--accent-primary)' }} />
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <strong style={{ display: 'block', fontSize: '1.15rem', color: 'var(--text-primary)' }}>${cost.toFixed(2)}</strong>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{percentage.toFixed(1)}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', background: 'white', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-sm)', color: 'var(--text-secondary)' }}>
                    No hay ingredientes registrados para este producto.
                  </div>
                )
              ) : (
                (ingredientsProduct.recipeSteps || []).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(ingredientsProduct.recipeSteps || []).map((step, index) => (
                      <div key={`${index}-${step}`} style={{ display: 'grid', gridTemplateColumns: '42px 1fr', gap: '1rem', alignItems: 'start', background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '1rem' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--accent-secondary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                          {index + 1}
                        </div>
                        <p style={{ margin: 0, lineHeight: 1.55, color: 'var(--text-primary)' }}>{step}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', background: 'white', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-sm)', color: 'var(--text-secondary)' }}>
                    No hay pasos de preparación registrados para este producto.
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
