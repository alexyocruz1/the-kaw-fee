"use client";

import { useState, useEffect } from 'react';

type CustomEquivalence = {
  unitName: string;
  ratioToBase: number | string; 
};

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  packageSize: number;
  costPerUnit: number;
  customEquivalences?: CustomEquivalence[];
  category?: 'food' | 'packaging';
};

const CONVERSIONS: any = {
  mass: { kg: 1000, gramo: 1, lb: 453.592, oz: 28.3495, mg: 0.001 },
  volume: { litro: 1000, ml: 1, galon: 3785.41, taza: 236.588, cucharada: 14.7868, cucharadita: 4.92892, 'fl oz': 29.5735 }
};

const getAutoUnits = (unit: string) => {
  if (unit in CONVERSIONS.mass) return Object.keys(CONVERSIONS.mass).filter(u => u !== unit).join(', ');
  if (unit in CONVERSIONS.volume) return Object.keys(CONVERSIONS.volume).filter(u => u !== unit).join(', ');
  return '';
};

export default function IngredientesPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [newIngredient, setNewIngredient] = useState<Omit<Ingredient, 'id'>>({ name: '', unit: 'kg', packageSize: 1, costPerUnit: 0, customEquivalences: [], category: 'food' });
  const [isAdding, setIsAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Ingredient | null>(null);

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    const res = await fetch('/api/ingredients');
    const data = await res.json();
    setIngredients(data);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalIngredient = {
      ...newIngredient,
      id: `ing_${Date.now()}`,
      customEquivalences: newIngredient.customEquivalences?.map(eq => ({
        ...eq,
        ratioToBase: Number(eq.ratioToBase) || 1
      }))
    };
    const res = await fetch('/api/ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalIngredient)
    });

    if (res.ok) {
      setNewIngredient({ name: '', unit: 'kg', packageSize: 1, costPerUnit: 0, customEquivalences: [], category: 'food' });
      setIsAdding(false);
      fetchIngredients();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este ingrediente?')) return;
    const res = await fetch(`/api/ingredients?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchIngredients();
    }
  };

  const startEdit = (ing: Ingredient) => {
    setEditingId(ing.id);
    setEditForm({ 
      ...ing, 
      packageSize: ing.packageSize || 1,
      customEquivalences: ing.customEquivalences || []
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleUpdate = async () => {
    if (!editForm) return;
    const finalUpdate = {
      ...editForm,
      customEquivalences: editForm.customEquivalences?.map(eq => ({
        ...eq,
        ratioToBase: Number(eq.ratioToBase) || 1
      }))
    };
    const res = await fetch('/api/ingredients', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalUpdate)
    });
    if (res.ok) {
      cancelEdit();
      fetchIngredients();
    }
  };

  const addEquivalence = (isEdit: boolean) => {
    if (isEdit && editForm) {
      setEditForm({
        ...editForm,
        customEquivalences: [...(editForm.customEquivalences || []), { unitName: 'taza', ratioToBase: 1 }]
      });
    } else {
      setNewIngredient({
        ...newIngredient,
        customEquivalences: [...(newIngredient.customEquivalences || []), { unitName: 'taza', ratioToBase: 1 }]
      });
    }
  };

  const updateEquivalence = (isEdit: boolean, index: number, field: keyof CustomEquivalence, value: any) => {
    if (isEdit && editForm) {
      const newEq = [...(editForm.customEquivalences || [])];
      newEq[index] = { ...newEq[index], [field]: value };
      setEditForm({ ...editForm, customEquivalences: newEq });
    } else {
      const newEq = [...(newIngredient.customEquivalences || [])];
      newEq[index] = { ...newEq[index], [field]: value };
      setNewIngredient({ ...newIngredient, customEquivalences: newEq });
    }
  };

  const removeEquivalence = (isEdit: boolean, index: number) => {
    if (isEdit && editForm) {
      const newEq = [...(editForm.customEquivalences || [])];
      newEq.splice(index, 1);
      setEditForm({ ...editForm, customEquivalences: newEq });
    } else {
      const newEq = [...(newIngredient.customEquivalences || [])];
      newEq.splice(index, 1);
      setNewIngredient({ ...newIngredient, customEquivalences: newEq });
    }
  };

  if (loading) return <div className="animate-fade-in">Cargando ingredientes...</div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Ingredientes</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gestiona tus materias primas y crea equivalencias personalizadas.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancelar' : '+ Agregar Ingrediente'}
        </button>
      </div>

      {isAdding && (
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3>Nuevo Ingrediente</h3>
          <form onSubmit={handleAdd}>
            <div className="responsive-grid-4" style={{ display: 'grid', gap: '1rem', alignItems: 'end', marginTop: '1rem' }} data-cols="2fr 1fr 1fr 1fr 1fr">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nombre</label>
                <input type="text" className="form-input" value={newIngredient.name} onChange={e => setNewIngredient({...newIngredient, name: e.target.value})} required placeholder="ej. Leche Entera" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Categoría</label>
                <select className="form-input" value={newIngredient.category || 'food'} onChange={e => setNewIngredient({...newIngredient, category: e.target.value as 'food' | 'packaging'})}>
                  <option value="food">Comida</option>
                  <option value="packaging">Empaque</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Unidad (Base)</label>
                <select className="form-input" value={newIngredient.unit} onChange={e => setNewIngredient({...newIngredient, unit: e.target.value})}>
                  <optgroup label="Masa">
                    <option value="kg">kg</option>
                    <option value="gramo">gramo</option>
                    <option value="lb">lb</option>
                    <option value="oz">oz</option>
                    <option value="mg">mg</option>
                  </optgroup>
                  <optgroup label="Volumen">
                    <option value="litro">litro</option>
                    <option value="ml">ml</option>
                    <option value="galon">galón</option>
                    <option value="taza">taza</option>
                    <option value="cucharada">cucharada</option>
                    <option value="cucharadita">cucharadita</option>
                    <option value="fl oz">fl oz</option>
                  </optgroup>
                  <optgroup label="Otros">
                    <option value="pieza">pieza</option>
                  </optgroup>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Cantidad (Envase)</label>
                <input type="number" className="form-input" value={newIngredient.packageSize} onChange={e => setNewIngredient({...newIngredient, packageSize: parseFloat(e.target.value) || 1})} required step="0.1" placeholder="ej. 6" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Costo Envase ($)</label>
                <input type="number" className="form-input" value={newIngredient.costPerUnit} onChange={e => setNewIngredient({...newIngredient, costPerUnit: parseFloat(e.target.value) || 0})} required step="0.1" placeholder="ej. 170" />
              </div>
            </div>

            {/* Equivalences Section */}
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.3)', borderRadius: 'var(--border-radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, color: 'var(--accent-primary)' }}>Equivalencias Personalizadas (Opcional)</h4>
                <button type="button" className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => addEquivalence(false)}>+ Añadir Equivalencia</button>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                El sistema convierte automáticamente Masa (kg, g, lb, oz) y Volumen (litro, ml, galón). Solo usa esto para unidades únicas (ej. "taza", "cucharada").
              </p>

              {(newIngredient.customEquivalences || []).map((eq, i) => (
                <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span>1 {newIngredient.unit} equivale a: </span>
                  <input type="number" className="form-input" style={{ width: '100px' }} value={eq.ratioToBase} onChange={e => updateEquivalence(false, i, 'ratioToBase', e.target.value)} step="any" required />
                  <input type="text" className="form-input" style={{ width: '150px' }} value={eq.unitName} onChange={e => updateEquivalence(false, i, 'unitName', e.target.value)} placeholder="ej. tazas" required />
                  <button type="button" onClick={() => removeEquivalence(false, i)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>X</button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'right' }}>
              <button type="submit" className="btn btn-secondary" style={{ padding: '0.8rem 2rem' }}>Guardar Ingrediente</button>
            </div>
          </form>
        </div>
      )}

      <div className="search-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="search-wrapper" style={{ flex: 1 }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder={`Buscar entre ${ingredients.length} ingrediente${ingredients.length !== 1 ? 's' : ''}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontWeight: 500 }}>
          {ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).length} de {ingredients.length} resultado{ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="table-scroll glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.5)' }}>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Nombre</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Costo Base</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Equivalencias</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).map((ing, idx) => {
              const packageSize = ing.packageSize || 1; 
              const autoUnits = getAutoUnits(ing.unit);
              
              return (
                <tr key={ing.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.2)' }}>
                  {editingId === ing.id && editForm ? (
                    <td colSpan={4} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.5)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div><label className="form-label" style={{fontSize: '0.8rem'}}>Nombre</label><input type="text" className="form-input" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></div>
                        <div>
                          <label className="form-label" style={{fontSize: '0.8rem'}}>Categoría</label>
                          <select className="form-input" value={editForm.category || 'food'} onChange={e => setEditForm({...editForm, category: e.target.value as 'food' | 'packaging'})}>
                            <option value="food">Comida</option>
                            <option value="packaging">Empaque</option>
                          </select>
                        </div>
                        <div>
                          <label className="form-label" style={{fontSize: '0.8rem'}}>Unidad</label>
                          <select className="form-input" value={editForm.unit} onChange={e => setEditForm({...editForm, unit: e.target.value})}>
                            <optgroup label="Masa">
                              <option value="kg">kg</option><option value="gramo">gramo</option><option value="lb">lb</option><option value="oz">oz</option><option value="mg">mg</option>
                            </optgroup>
                            <optgroup label="Volumen">
                              <option value="litro">litro</option><option value="ml">ml</option><option value="galon">galón</option><option value="taza">taza</option><option value="cucharada">cucharada</option><option value="cucharadita">cucharadita</option><option value="fl oz">fl oz</option>
                            </optgroup>
                            <optgroup label="Otros">
                              <option value="pieza">pieza</option>
                            </optgroup>
                          </select>
                        </div>
                        <div><label className="form-label" style={{fontSize: '0.8rem'}}>Envase</label><input type="number" className="form-input" value={editForm.packageSize} onChange={e => setEditForm({...editForm, packageSize: parseFloat(e.target.value) || 1})} step="0.1" /></div>
                        <div><label className="form-label" style={{fontSize: '0.8rem'}}>Costo ($)</label><input type="number" className="form-input" value={editForm.costPerUnit} onChange={e => setEditForm({...editForm, costPerUnit: parseFloat(e.target.value) || 0})} step="0.1" /></div>
                      </div>

                      <div style={{ background: 'white', padding: '1rem', borderRadius: 'var(--border-radius-sm)', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Equivalencias</strong>
                          <button type="button" onClick={() => addEquivalence(true)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.9rem' }}>+ Añadir</button>
                        </div>
                        {(editForm.customEquivalences || []).map((eq, i) => (
                          <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{fontSize: '0.8rem'}}>1 {editForm.unit} =</span>
                            <input type="number" className="form-input" style={{ width: '100px' }} value={eq.ratioToBase} onChange={e => updateEquivalence(true, i, 'ratioToBase', e.target.value)} step="any" required />
                            <input type="text" className="form-input" style={{ width: '120px', padding: '0.3rem' }} value={eq.unitName} onChange={e => updateEquivalence(true, i, 'unitName', e.target.value)} />
                            <button type="button" onClick={() => removeEquivalence(true, i)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>X</button>
                          </div>
                        ))}
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <button onClick={cancelEdit} className="btn btn-outline" style={{ padding: '0.4rem 1rem', marginRight: '0.5rem' }}>Cancelar</button>
                        <button onClick={handleUpdate} className="btn btn-secondary" style={{ padding: '0.4rem 1rem' }}>Actualizar</button>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <strong>{ing.name}</strong>
                        {ing.category === 'packaging' && <span className="badge badge-auto" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>📦 Empaque</span>}
                        <br/>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Envase: {packageSize} {ing.unit} · ${ing.costPerUnit.toFixed(2)}</span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 700, color: 'var(--accent-primary)', fontSize: '1.05rem' }}>
                        ${(ing.costPerUnit / packageSize).toFixed(4)} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>/ {ing.unit}</span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', maxWidth: '260px' }}>
                        {(() => {
                          const allBadges: { label: string; custom: boolean; tooltip?: string }[] = [];
                          if (autoUnits) allBadges.push({ label: `⚡ Auto Conversión`, tooltip: `Soportado: ${autoUnits}`, custom: false });
                          (ing.customEquivalences || []).forEach(eq => allBadges.push({ label: `1 ${ing.unit} = ${eq.ratioToBase} ${eq.unitName}`, custom: true }));

                          if (allBadges.length === 0) return <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>—</span>;

                          const visible = allBadges.slice(0, 2);
                          const hidden = allBadges.slice(2);

                          return (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                              {visible.map((b, i) => (
                                <span key={i} title={b.tooltip} className={`badge ${b.custom ? 'badge-custom' : 'badge-auto'}`} style={{ whiteSpace: 'nowrap' }}>{b.label}</span>
                              ))}
                              {hidden.length > 0 && (
                                <span
                                  title={hidden.map(b => b.label).join('\n')}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center',
                                    padding: '0.25rem 0.65rem', borderRadius: '100px',
                                    fontSize: '0.78rem', fontWeight: 600,
                                    background: 'rgba(193, 102, 43, 0.12)', color: 'var(--accent-primary)',
                                    cursor: 'help', whiteSpace: 'nowrap'
                                  }}
                                >
                                  +{hidden.length} más
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => startEdit(ing)} className="table-action-btn table-action-edit">Editar</button>
                        <button onClick={() => handleDelete(ing.id)} className="table-action-btn table-action-delete">Eliminar</button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).length === 0 && (
              <tr>
                <td colSpan={4}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🥕</div>
                    <h4>{search ? 'Sin resultados' : 'Sin ingredientes registrados'}</h4>
                    <p>{search ? `No se encontró ningún ingrediente con "${search}".` : 'Agrega tu primer ingrediente usando el botón de arriba.'}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
