"use client";

import { useState, useEffect } from 'react';

type Equipment = {
  id: string;
  name: string;
  powerKW: number; // For gas, this represents kg/h
  energyType?: 'electricidad' | 'gas';
};

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [newEquipo, setNewEquipo] = useState<{name: string, powerKW: number, energyType: 'electricidad' | 'gas'}>({ name: '', powerKW: 0, energyType: 'electricidad' });
  const [isAdding, setIsAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Equipment | null>(null);

  useEffect(() => { fetchEquipos(); }, []);

  const fetchEquipos = async () => {
    const res = await fetch('/api/equipos');
    const data = await res.json();
    setEquipos(data);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEquipo.name) return;
    const eq: Equipment = { id: `eq_${Date.now()}`, ...newEquipo };
    const res = await fetch('/api/equipos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(eq) });
    if (res.ok) {
      setNewEquipo({ name: '', powerKW: 0, energyType: 'electricidad' });
      setIsAdding(false);
      fetchEquipos();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este equipo?')) return;
    const res = await fetch(`/api/equipos?id=${id}`, { method: 'DELETE' });
    if (res.ok) fetchEquipos();
  };

  const startEdit = (eq: Equipment) => { setEditingId(eq.id); setEditForm({ ...eq }); };
  const cancelEdit = () => { setEditingId(null); setEditForm(null); };

  const handleUpdate = async () => {
    if (!editForm) return;
    const res = await fetch('/api/equipos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
    if (res.ok) { cancelEdit(); fetchEquipos(); }
  };

  const filtered = equipos.filter(eq => eq.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="animate-fade-in" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando equipos...</div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Equipos</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Registra tus hornos, cafeteras y equipos para calcular el consumo eléctrico.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setIsAdding(!isAdding); setSearch(''); }}>
          {isAdding ? 'Cancelar' : '+ Agregar Equipo'}
        </button>
      </div>

      {isAdding && (
        <div className="glass-panel animate-slide-in" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Nuevo Equipo</h3>
          <form onSubmit={handleAdd} style={{ display: 'grid', gap: '1rem', alignItems: 'end', marginTop: '1rem' }} className="responsive-grid-4" data-cols="2fr 1fr auto">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nombre del Equipo</label>
              <input type="text" className="form-input" value={newEquipo.name} onChange={e => setNewEquipo({ ...newEquipo, name: e.target.value })} required placeholder="ej. Horno, Licuadora, Cafetera" autoFocus />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tipo de Energía</label>
              <select className="form-input" value={newEquipo.energyType} onChange={e => setNewEquipo({ ...newEquipo, energyType: e.target.value as 'electricidad' | 'gas' })}>
                <option value="electricidad">Electricidad</option>
                <option value="gas">Gas LP</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{newEquipo.energyType === 'gas' ? 'Consumo (kg/h)' : 'Potencia (kW)'}</label>
              <input type="number" className="form-input" value={newEquipo.powerKW} onChange={e => setNewEquipo({ ...newEquipo, powerKW: parseFloat(e.target.value) || 0 })} required step="0.1" placeholder="ej. 2.5" />
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {newEquipo.energyType === 'gas' ? 'Ej: 0.5 kg por hora' : '1000 Watts = 1 kW'}
              </p>
            </div>
            <button type="submit" className="btn btn-secondary" style={{ height: '48px' }}>Guardar</button>
          </form>
        </div>
      )}

      {/* Search + Count Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }} className="search-row">
        <div className="search-wrapper" style={{ flex: 1 }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder={`Buscar entre ${equipos.length} equipo${equipos.length !== 1 ? 's' : ''}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontWeight: 500 }}>
          {filtered.length} de {equipos.length} resultado{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="table-scroll glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.5)' }}>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Nombre</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Consumo</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((eq, idx) => (
              <tr
                key={eq.id}
                style={{
                  borderBottom: '1px solid var(--border-color)',
                  backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.2)',
                  transition: 'background 0.15s'
                }}
              >
                {editingId === eq.id && editForm ? (
                  <>
                    <td style={{ padding: '0.75rem 1.5rem' }}>
                      <input type="text" className="form-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ padding: '0.5rem 0.75rem' }} autoFocus />
                    </td>
                    <td style={{ padding: '0.75rem 1.5rem', display: 'flex', gap: '0.5rem' }}>
                      <select className="form-input" value={editForm.energyType || 'electricidad'} onChange={e => setEditForm({ ...editForm, energyType: e.target.value as 'electricidad'|'gas' })} style={{ padding: '0.5rem 0.75rem', width: 'auto' }}>
                        <option value="electricidad">Elec.</option>
                        <option value="gas">Gas</option>
                      </select>
                      <input type="number" className="form-input" value={editForm.powerKW} onChange={e => setEditForm({ ...editForm, powerKW: parseFloat(e.target.value) || 0 })} step="0.1" style={{ padding: '0.5rem 0.75rem', maxWidth: '100px' }} />
                    </td>
                    <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={handleUpdate} className="btn btn-secondary" style={{ padding: '0.4rem 1rem', marginRight: '0.5rem', fontSize: '0.9rem' }}>Guardar</button>
                      <button onClick={cancelEdit} className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>Cancelar</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{eq.name}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      {(!eq.energyType || eq.energyType === 'electricidad') ? (
                        <span className="badge badge-auto">⚡ {eq.powerKW} kW</span>
                      ) : (
                        <span className="badge badge-custom" style={{ background: 'rgba(193,102,43,0.1)', color: 'var(--accent-primary)' }}>🔥 {eq.powerKW} kg/h</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => startEdit(eq)} className="table-action-btn table-action-edit">Editar</button>
                      <button onClick={() => handleDelete(eq.id)} className="table-action-btn table-action-delete">Eliminar</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🔌</div>
                    <h4>{search ? 'Sin resultados' : 'Sin equipos registrados'}</h4>
                    <p>{search ? `No se encontró ningún equipo con "${search}".` : 'Agrega tu primer equipo usando el botón de arriba.'}</p>
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
