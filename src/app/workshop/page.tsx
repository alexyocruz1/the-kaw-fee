"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

type CustomEquivalence = {
  unitName: string;
  ratioToBase: number;
};

type Ingredient = { id: string; name: string; unit: string; packageSize?: number; costPerUnit: number; customEquivalences?: CustomEquivalence[]; };
type Equipment = { id: string; name: string; powerKW: number; energyType?: 'electricidad' | 'gas'; };
type Settings = { laborRatePerHour: number; electricityCostPerKwh: number; gasCostPerKg?: number; globalMarginMultiplier: number; businessName?: string; logoUrl?: string; };
type ProductIngredient = { ingredientId: string; quantity: number; unit: string; };
type ProductEquipment = { equipmentId: string; minutesUsed: number; };
type ProductImage = { id: string; url: string; name?: string; isPrimary?: boolean; };
type ConversionCategory = 'mass' | 'volume';
type FlyerSize = 'story' | 'square';
type TemplateId = 'spotlight' | 'menu-grid' | 'combo-offer' | 'new-arrival' | 'premium-minimal' | 'quick-craving' | 'vertical-catalog';

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
  images?: ProductImage[];
};

type FlyerTemplateProps = {
  size: { width: number; height: number };
  products: Product[];
  getImageUrl: (product: Product) => string | undefined;
  getPrice: (product: Product) => number;
  title: string;
  subtitle: string;
  callToAction: string;
  footerText: string;
  brand: string;
  logoUrl?: string;
};

const CONVERSIONS: Record<ConversionCategory, Record<string, number>> = {
  mass: { kg: 1000, gramo: 1, lb: 453.592, oz: 28.3495, mg: 0.001 },
  volume: { litro: 1000, ml: 1, galon: 3785.41, taza: 236.588, cucharada: 14.7868, cucharadita: 4.92892, 'fl oz': 29.5735 }
};

const templates: { id: TemplateId; name: string; description: string; maxProducts: number }[] = [
  { id: 'spotlight', name: 'Producto Estrella', description: 'Una foto grande, precio fuerte y llamado a la acción.', maxProducts: 1 },
  { id: 'menu-grid', name: 'Mini Menú', description: 'Hasta cuatro productos en una composición compacta.', maxProducts: 4 },
  { id: 'combo-offer', name: 'Combo Oferta', description: 'Dos productos con sensación de paquete especial.', maxProducts: 2 },
  { id: 'new-arrival', name: 'Nuevo Lanzamiento', description: 'Diseño editorial para presentar algo nuevo.', maxProducts: 1 },
  { id: 'premium-minimal', name: 'Premium Minimal', description: 'Limpio, elegante y centrado en calidad.', maxProducts: 1 },
  { id: 'quick-craving', name: 'Antojo Rápido', description: 'Energético, directo y pensado para venta inmediata.', maxProducts: 1 },
  { id: 'vertical-catalog', name: 'Catálogo Vertical', description: 'Lista visual de hasta cinco productos.', maxProducts: 5 }
];

const templateCopy: Record<TemplateId, { title: string; subtitle: string; callToAction: string }> = {
  spotlight: {
    title: 'Disponible hoy',
    subtitle: 'Hecho con calma, café y buenos ingredientes.',
    callToAction: 'Pide el tuyo por WhatsApp'
  },
  'menu-grid': {
    title: 'Menú de hoy',
    subtitle: 'Elige tu favorito y acompáñalo con café.',
    callToAction: 'Haz tu pedido'
  },
  'combo-offer': {
    title: 'Combo especial',
    subtitle: 'Dos favoritos para compartir o darte un gusto completo.',
    callToAction: 'Aparta tu combo'
  },
  'new-arrival': {
    title: 'Recién salido',
    subtitle: 'Nuevo sabor disponible por tiempo limitado.',
    callToAction: 'Pruébalo hoy'
  },
  'premium-minimal': {
    title: 'Selección especial',
    subtitle: 'Una pieza cuidada al detalle, lista para disfrutar.',
    callToAction: 'Disponible bajo pedido'
  },
  'quick-craving': {
    title: 'Antojo rápido',
    subtitle: 'Listo para alegrarte el día en una mordida.',
    callToAction: 'Escríbenos ahora'
  },
  'vertical-catalog': {
    title: 'Para elegir',
    subtitle: 'Una selección lista para pedidos por WhatsApp.',
    callToAction: 'Ordena hoy'
  }
};

const flyerSizes: Record<FlyerSize, { label: string; width: number; height: number }> = {
  story: { label: 'WhatsApp Status', width: 1080, height: 1920 },
  square: { label: 'Post Cuadrado', width: 1080, height: 1080 }
};

const getCategory = (unit: string): ConversionCategory | null => {
  if (unit in CONVERSIONS.mass) return 'mass';
  if (unit in CONVERSIONS.volume) return 'volume';
  return null;
};

export default function WorkshopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredientsList, setIngredientsList] = useState<Ingredient[]>([]);
  const [equiposList, setEquiposList] = useState<Equipment[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [templateId, setTemplateId] = useState<TemplateId>('spotlight');
  const [flyerSize, setFlyerSize] = useState<FlyerSize>('story');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedImageByProductId, setSelectedImageByProductId] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('Disponible hoy');
  const [subtitle, setSubtitle] = useState('Hecho con calma, café y buenos ingredientes.');
  const [callToAction, setCallToAction] = useState('Pide el tuyo por WhatsApp');
  const [footerText, setFooterText] = useState('the kaw-fee');
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const flyerRef = useRef<HTMLDivElement>(null);

  const selectedTemplate = templates.find(template => template.id === templateId) || templates[0];
  const selectedProducts = selectedProductIds
    .map(id => products.find(product => product.id === id))
    .filter((product): product is Product => !!product);
  const currentSize = flyerSizes[flyerSize];
  const previewScale = flyerSize === 'story' ? 0.26 : 0.34;

  useEffect(() => {
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
      setFooterText(setData.businessName || 'the kaw-fee');
      setLoading(false);
    });
  }, []);

  const getIngredientCost = (ingId: string, qty: number, selectedUnit: string) => {
    const ing = ingredientsList.find(i => i.id === ingId);
    if (!ing) return 0;
    const baseCostPerUnit = ing.costPerUnit / (ing.packageSize || 1);

    if (!selectedUnit || selectedUnit === ing.unit) {
      return baseCostPerUnit * qty;
    }

    const category = getCategory(ing.unit);
    const selectedCategory = getCategory(selectedUnit);

    if (category && category === selectedCategory) {
      const baseInSmallest = CONVERSIONS[category][ing.unit];
      const costPerSmallest = baseCostPerUnit / baseInSmallest;
      const selectedInSmallest = CONVERSIONS[category][selectedUnit];
      return costPerSmallest * selectedInSmallest * qty;
    }

    const customEq = ing.customEquivalences?.find(e => e.unitName === selectedUnit);
    if (customEq) {
      return (baseCostPerUnit / customEq.ratioToBase) * qty;
    }

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

  const calculateTotalCost = (product: Product) => {
    if (!settings) return 0;
    const ingredientCost = product.ingredients.reduce((sum, item) => sum + getIngredientCost(item.ingredientId, item.quantity, item.unit), 0);
    const equipmentCost = product.equipmentUsage.reduce((sum, item) => sum + getEquipmentCost(item.equipmentId, item.minutesUsed), 0);
    const laborCost = (product.prepTimeMinutes / 60) * settings.laborRatePerHour;
    return ingredientCost + equipmentCost + laborCost;
  };

  const getProductPrice = (product: Product) => {
    if (product.salePrice && product.salePrice > 0) return product.salePrice;
    const totalCost = calculateTotalCost(product);
    const suggestedTotal = totalCost * (product.customMarginMultiplier || settings?.globalMarginMultiplier || 1);
    return suggestedTotal / (product.yield || 1);
  };

  const getProductImageUrl = (product: Product) => {
    const selectedImageId = selectedImageByProductId[product.id];
    const selectedImage = product.images?.find(image => image.id === selectedImageId);
    const primaryImage = product.images?.find(image => image.isPrimary);
    return selectedImage?.url || primaryImage?.url || product.images?.[0]?.url;
  };

  const toggleProduct = (productId: string) => {
    if (selectedProductIds.includes(productId)) {
      setSelectedProductIds(selectedProductIds.filter(id => id !== productId));
      return;
    }

    const nextIds = [...selectedProductIds, productId].slice(0, selectedTemplate.maxProducts);
    setSelectedProductIds(nextIds);
  };

  const handleTemplateChange = (id: TemplateId) => {
    const template = templates.find(item => item.id === id) || templates[0];
    const copy = templateCopy[id];
    setTemplateId(id);
    setSelectedProductIds(selectedProductIds.slice(0, template.maxProducts));
    setTitle(copy.title);
    setSubtitle(copy.subtitle);
    setCallToAction(copy.callToAction);
  };

  const exportFlyer = async (share = false) => {
    if (!flyerRef.current) return;
    setExporting(true);
    setMessage('');

    try {
      const node = flyerRef.current;
      const html = new XMLSerializer().serializeToString(node);
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${currentSize.width}" height="${currentSize.height}">
          <foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${html}</div></foreignObject>
        </svg>
      `;
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      const image = new Image();
      image.src = url;
      await image.decode();

      const canvas = document.createElement('canvas');
      canvas.width = currentSize.width;
      canvas.height = currentSize.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not available');
      ctx.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Export failed');

      const fileName = `workshop-${Date.now()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text: callToAction
        });
        setMessage('Flyer compartido.');
      } else {
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(downloadUrl);
        setMessage(share ? 'Tu navegador no comparte imágenes directo; descargué el PNG.' : 'Flyer descargado como PNG.');
      }
    } catch {
      setMessage('No se pudo exportar la imagen. Revisa que las fotos sean locales y vuelve a intentar.');
    } finally {
      setExporting(false);
    }
  };

  const brand = settings?.businessName || 'the kaw-fee';

  const previewStyle = useMemo(() => ({
    width: `${currentSize.width}px`,
    height: `${currentSize.height}px`,
    transform: `scale(${previewScale})`,
    transformOrigin: 'top center',
    marginBottom: `${currentSize.height * (previewScale - 1)}px`
  }), [currentSize.height, currentSize.width, previewScale]);

  if (loading || !settings) return <div className="animate-fade-in">Cargando workshop...</div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Workshop</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Crea flyers promocionales listos para compartir por WhatsApp.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => exportFlyer(true)} disabled={exporting || selectedProducts.length === 0}>
            Compartir
          </button>
          <button className="btn btn-primary" onClick={() => exportFlyer()} disabled={exporting || selectedProducts.length === 0}>
            {exporting ? 'Exportando...' : 'Descargar PNG'}
          </button>
        </div>
      </div>

      {message && (
        <div style={{ padding: '1rem', marginBottom: '1.5rem', backgroundColor: 'var(--accent-secondary)', color: 'white', borderRadius: 'var(--border-radius-sm)' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '2rem', alignItems: 'start' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <section>
            <h3 style={{ marginBottom: '1rem' }}>Diseño</h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {templates.map(template => (
                <button key={template.id} className={`btn ${templateId === template.id ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', textAlign: 'left', display: 'block' }} onClick={() => handleTemplateChange(template.id)}>
                  <strong style={{ display: 'block' }}>{template.name}</strong>
                  <span style={{ display: 'block', fontSize: '0.82rem', opacity: 0.8 }}>{template.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 style={{ marginBottom: '1rem' }}>Formato</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {(Object.keys(flyerSizes) as FlyerSize[]).map(size => (
                <button key={size} className={`btn ${flyerSize === size ? 'btn-secondary' : 'btn-outline'}`} onClick={() => setFlyerSize(size)}>
                  {flyerSizes[size].label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 style={{ marginBottom: '1rem' }}>Texto</h3>
            <div className="form-group">
              <label className="form-label">Título</label>
              <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Subtítulo</label>
              <input className="form-input" value={subtitle} onChange={e => setSubtitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Llamado a la acción</label>
              <input className="form-input" value={callToAction} onChange={e => setCallToAction(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Pie del flyer</label>
              <input className="form-input" value={footerText} onChange={e => setFooterText(e.target.value)} />
            </div>
          </section>

          <section>
            <h3 style={{ marginBottom: '1rem' }}>Productos</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Este diseño permite hasta {selectedTemplate.maxProducts} producto{selectedTemplate.maxProducts !== 1 ? 's' : ''}.
            </p>
            <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '360px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {products.map(product => {
                const isSelected = selectedProductIds.includes(product.id);
                const disabled = !isSelected && selectedProductIds.length >= selectedTemplate.maxProducts;
                return (
                  <button key={product.id} className={`btn ${isSelected ? 'btn-secondary' : 'btn-outline'}`} disabled={disabled} onClick={() => toggleProduct(product.id)} style={{ justifyContent: 'space-between', gap: '1rem', opacity: disabled ? 0.5 : 1 }}>
                    <span>{product.name}</span>
                    <strong>${getProductPrice(product).toFixed(2)}</strong>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedProducts.length > 0 && (
            <section>
              <h3 style={{ marginBottom: '1rem' }}>Fotos</h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {selectedProducts.map(product => (
                  <div key={product.id}>
                    <label className="form-label">{product.name}</label>
                    {(product.images || []).length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                        {(product.images || []).map(image => (
                          <button key={image.id} type="button" onClick={() => setSelectedImageByProductId({ ...selectedImageByProductId, [product.id]: image.id })} style={{ padding: 0, border: selectedImageByProductId[product.id] === image.id || (!selectedImageByProductId[product.id] && image.isPrimary) ? '3px solid var(--accent-primary)' : '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', overflow: 'hidden', cursor: 'pointer', background: 'white' }}>
                            <img src={image.url} alt={image.name || product.name} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }} />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Este producto todavía no tiene fotos.</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '720px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0 }}>Vista previa</h3>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{currentSize.width} x {currentSize.height}px</p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', minHeight: flyerSize === 'story' ? '520px' : '390px' }}>
            <div style={previewStyle}>
              <div ref={flyerRef} style={{ width: `${currentSize.width}px`, height: `${currentSize.height}px` }}>
                <FlyerPreview
                  templateId={templateId}
                  size={currentSize}
                  products={selectedProducts}
                  getImageUrl={getProductImageUrl}
                  getPrice={getProductPrice}
                  title={title}
                  subtitle={subtitle}
                  callToAction={callToAction}
                  footerText={footerText}
                  brand={brand}
                  logoUrl={settings.logoUrl}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FlyerPreview({ templateId, ...props }: FlyerTemplateProps & { templateId: TemplateId }) {
  if (templateId === 'menu-grid') return <MenuGridFlyer {...props} />;
  if (templateId === 'combo-offer') return <ComboOfferFlyer {...props} />;
  if (templateId === 'new-arrival') return <NewArrivalFlyer {...props} />;
  if (templateId === 'premium-minimal') return <PremiumMinimalFlyer {...props} />;
  if (templateId === 'quick-craving') return <QuickCravingFlyer {...props} />;
  if (templateId === 'vertical-catalog') return <VerticalCatalogFlyer {...props} />;
  return <SpotlightFlyer {...props} />;
}

function BrandMark({ brand, logoUrl, dark = false }: { brand: string; logoUrl?: string; dark?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
      {logoUrl ? (
        <img src={logoUrl} alt={brand} style={{ width: '92px', height: '92px', objectFit: 'contain', background: 'rgba(255,255,255,0.85)', borderRadius: '18px', padding: '10px' }} />
      ) : (
        <div style={{ width: '92px', height: '92px', borderRadius: '50%', background: dark ? '#241B14' : '#F3E7D3', color: dark ? '#F3E7D3' : '#241B14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '34px', fontWeight: 800 }}>
          K
        </div>
      )}
      <strong style={{ fontSize: '34px', color: dark ? '#241B14' : '#FBF6EA' }}>{brand}</strong>
    </div>
  );
}

function EmptyImage({ name }: { name?: string }) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '320px', background: '#F3E7D3', color: '#5c4d42', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px', fontSize: '34px', fontWeight: 700 }}>
      {name || 'Producto'}
    </div>
  );
}

function SpotlightFlyer({ size, products, getImageUrl, getPrice, title, subtitle, callToAction, footerText, brand, logoUrl }: {
  size: { width: number; height: number };
  products: Product[];
  getImageUrl: (product: Product) => string | undefined;
  getPrice: (product: Product) => number;
  title: string;
  subtitle: string;
  callToAction: string;
  footerText: string;
  brand: string;
  logoUrl?: string;
}) {
  const product = products[0];
  const imageUrl = product ? getImageUrl(product) : undefined;

  return (
    <div style={{ width: `${size.width}px`, height: `${size.height}px`, background: '#241B14', color: '#FBF6EA', position: 'relative', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #241B14 0%, #2F6E68 58%, #C1662B 100%)' }} />
      <div style={{ position: 'relative', height: '100%', padding: size.height > size.width ? '92px 86px' : '64px 70px', display: 'flex', flexDirection: 'column' }}>
        <BrandMark brand={brand} logoUrl={logoUrl} />
        <div style={{ marginTop: size.height > size.width ? '110px' : '48px' }}>
          <p style={{ margin: '0 0 22px', fontSize: '42px', textTransform: 'uppercase', letterSpacing: '3px', color: '#F3E7D3' }}>{title}</p>
          <h1 style={{ margin: 0, fontSize: size.height > size.width ? '108px' : '78px', lineHeight: 0.95, color: '#FBF6EA', maxWidth: '900px' }}>{product?.name || 'Elige un producto'}</h1>
          <p style={{ margin: '34px 0 0', fontSize: '42px', lineHeight: 1.25, color: '#F3E7D3', maxWidth: '820px' }}>{subtitle}</p>
        </div>
        <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: size.height > size.width ? '1fr' : '1fr 0.9fr', gap: '42px', alignItems: 'end' }}>
          <div style={{ borderRadius: '42px', overflow: 'hidden', border: '10px solid rgba(251,246,234,0.22)', height: size.height > size.width ? '720px' : '420px', background: '#F3E7D3' }}>
            {imageUrl ? <img src={imageUrl} alt={product?.name || 'Producto'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <EmptyImage name={product?.name} />}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '30px', alignItems: 'end' }}>
            <div>
              <p style={{ margin: '0 0 12px', fontSize: '34px', color: '#F3E7D3' }}>{callToAction}</p>
              <strong style={{ fontSize: '38px', color: '#FBF6EA' }}>{footerText}</strong>
            </div>
            <div style={{ background: '#FBF6EA', color: '#241B14', padding: '30px 38px', borderRadius: '34px', textAlign: 'center', minWidth: '260px' }}>
              <p style={{ margin: '0 0 4px', fontSize: '28px' }}>{product?.yield ? 'Por pieza' : 'Precio'}</p>
              <strong style={{ fontSize: '70px', lineHeight: 1 }}>${product ? getPrice(product).toFixed(2) : '0.00'}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuGridFlyer({ size, products, getImageUrl, getPrice, title, subtitle, callToAction, footerText, brand, logoUrl }: {
  size: { width: number; height: number };
  products: Product[];
  getImageUrl: (product: Product) => string | undefined;
  getPrice: (product: Product) => number;
  title: string;
  subtitle: string;
  callToAction: string;
  footerText: string;
  brand: string;
  logoUrl?: string;
}) {
  const cells = products.slice(0, 4);
  const visibleCells: Array<Product | undefined> = cells.length > 0 ? cells : [undefined];
  const gridColumns = visibleCells.length === 1 ? '1fr' : '1fr 1fr';

  return (
    <div style={{ width: `${size.width}px`, height: `${size.height}px`, background: '#FBF6EA', color: '#241B14', position: 'relative', overflow: 'hidden', fontFamily: 'Arial, sans-serif', padding: size.height > size.width ? '78px 70px' : '54px 60px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '30px', alignItems: 'center' }}>
        <BrandMark brand={brand} logoUrl={logoUrl} dark />
        <div style={{ background: '#C1662B', color: 'white', padding: '20px 28px', borderRadius: '22px', fontSize: '30px', fontWeight: 800 }}>
          {callToAction}
        </div>
      </div>
      <div style={{ margin: size.height > size.width ? '76px 0 54px' : '42px 0 32px' }}>
        <p style={{ margin: '0 0 12px', fontSize: '36px', color: '#2F6E68', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 800 }}>{title}</p>
        <h1 style={{ margin: 0, color: '#241B14', fontSize: size.height > size.width ? '92px' : '68px', lineHeight: 0.95 }}>Mini menú</h1>
        <p style={{ margin: '28px 0 0', fontSize: '36px', color: '#5c4d42', maxWidth: '830px' }}>{subtitle}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: gridColumns, gap: '28px', flex: 1 }}>
        {visibleCells.map((product, index) => {
          const imageUrl = product ? getImageUrl(product) : undefined;
          return (
            <div key={product?.id || index} style={{ background: 'white', border: '3px solid rgba(36,27,20,0.1)', borderRadius: '34px', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ flex: 1, minHeight: 0, background: '#F3E7D3' }}>
                {imageUrl ? <img src={imageUrl} alt={product?.name || 'Producto'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <EmptyImage name={product?.name || 'Producto'} />}
              </div>
              <div style={{ padding: '24px 28px', display: 'flex', justifyContent: 'space-between', gap: '18px', alignItems: 'center' }}>
                <strong style={{ fontSize: '30px', lineHeight: 1.05 }}>{product?.name || 'Producto'}</strong>
                <span style={{ background: '#2F6E68', color: 'white', padding: '14px 18px', borderRadius: '18px', fontSize: '32px', fontWeight: 800 }}>${product ? getPrice(product).toFixed(2) : '0.00'}</span>
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ margin: '36px 0 0', textAlign: 'center', fontSize: '32px', color: '#5c4d42', fontWeight: 700 }}>{footerText}</p>
    </div>
  );
}

function ComboOfferFlyer({ size, products, getImageUrl, getPrice, title, subtitle, callToAction, footerText, brand, logoUrl }: FlyerTemplateProps) {
  const comboProducts: Array<Product | undefined> = products.slice(0, 2);
  const visibleProducts = comboProducts.length > 0 ? comboProducts : [undefined];
  const comboTotal = comboProducts.reduce((sum, product) => sum + (product ? getPrice(product) : 0), 0);
  const isStory = size.height > size.width;

  return (
    <div style={{ width: `${size.width}px`, height: `${size.height}px`, background: '#F3E7D3', color: '#241B14', position: 'relative', overflow: 'hidden', fontFamily: 'Arial, sans-serif', padding: isStory ? '72px 70px' : '56px 62px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, rgba(193,102,43,0.28), transparent 45%), linear-gradient(315deg, rgba(47,110,104,0.32), transparent 52%)' }} />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '30px' }}>
        <BrandMark brand={brand} logoUrl={logoUrl} dark />
        <div style={{ background: '#241B14', color: '#FBF6EA', padding: '18px 26px', borderRadius: '999px', fontSize: '30px', fontWeight: 800 }}>
          Combo
        </div>
      </div>
      <div style={{ position: 'relative', margin: isStory ? '74px 0 46px' : '42px 0 28px' }}>
        <p style={{ margin: '0 0 14px', color: '#C1662B', fontSize: '40px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>{title}</p>
        <h1 style={{ margin: 0, color: '#241B14', fontSize: isStory ? '94px' : '70px', lineHeight: 0.92 }}>Llévate el par</h1>
        <p style={{ margin: '26px 0 0', color: '#5c4d42', fontSize: '36px', lineHeight: 1.25, maxWidth: '820px' }}>{subtitle}</p>
      </div>
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: visibleProducts.length === 1 ? '1fr' : '1fr 1fr', gap: '28px', flex: 1, minHeight: 0 }}>
        {visibleProducts.map((product, index) => {
          const imageUrl = product ? getImageUrl(product) : undefined;
          return (
            <div key={product?.id || index} style={{ background: '#FBF6EA', borderRadius: '42px', overflow: 'hidden', border: '6px solid rgba(36,27,20,0.09)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ flex: 1, minHeight: 0, background: '#ead7bb' }}>
                {imageUrl ? <img src={imageUrl} alt={product?.name || 'Producto'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <EmptyImage name={product?.name || 'Producto'} />}
              </div>
              <div style={{ padding: '26px' }}>
                <strong style={{ display: 'block', fontSize: '34px', lineHeight: 1.05 }}>{product?.name || 'Producto'}</strong>
                <span style={{ display: 'inline-block', marginTop: '14px', background: '#2F6E68', color: 'white', borderRadius: '18px', padding: '12px 18px', fontSize: '34px', fontWeight: 900 }}>${product ? getPrice(product).toFixed(2) : '0.00'}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: 'relative', marginTop: '34px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '28px' }}>
        <strong style={{ color: '#2F6E68', fontSize: '38px' }}>{callToAction}</strong>
        <div style={{ background: '#241B14', color: '#FBF6EA', padding: '22px 32px', borderRadius: '28px', textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '26px', color: '#F3E7D3' }}>Total</p>
          <strong style={{ display: 'block', fontSize: '58px', lineHeight: 1 }}>${comboTotal.toFixed(2)}</strong>
        </div>
      </div>
      <p style={{ position: 'relative', margin: '24px 0 0', textAlign: 'center', fontSize: '28px', color: '#5c4d42', fontWeight: 700 }}>{footerText}</p>
    </div>
  );
}

function NewArrivalFlyer({ size, products, getImageUrl, getPrice, title, subtitle, callToAction, footerText, brand, logoUrl }: FlyerTemplateProps) {
  const product = products[0];
  const imageUrl = product ? getImageUrl(product) : undefined;
  const isStory = size.height > size.width;

  return (
    <div style={{ width: `${size.width}px`, height: `${size.height}px`, background: '#FBF6EA', color: '#241B14', position: 'relative', overflow: 'hidden', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: isStory ? '76px 76px 42px' : '56px 62px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <BrandMark brand={brand} logoUrl={logoUrl} dark />
        <div style={{ background: '#C1662B', color: 'white', borderRadius: '50%', width: '170px', height: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '34px', lineHeight: 1, fontWeight: 900 }}>
          Nuevo
        </div>
      </div>
      <div style={{ padding: '0 76px', zIndex: 1 }}>
        <p style={{ margin: '0 0 18px', color: '#2F6E68', fontSize: '38px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>{title}</p>
        <h1 style={{ margin: 0, color: '#241B14', fontSize: isStory ? '104px' : '76px', lineHeight: 0.92 }}>{product?.name || 'Nuevo producto'}</h1>
        <p style={{ margin: '28px 0 0', color: '#5c4d42', fontSize: '38px', lineHeight: 1.25, maxWidth: '830px' }}>{subtitle}</p>
      </div>
      <div style={{ flex: 1, marginTop: isStory ? '70px' : '34px', position: 'relative', borderTopLeftRadius: '72px', borderTopRightRadius: '72px', overflow: 'hidden', background: '#F3E7D3' }}>
        {imageUrl ? <img src={imageUrl} alt={product?.name || 'Producto'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <EmptyImage name={product?.name || 'Producto'} />}
        <div style={{ position: 'absolute', left: '70px', right: '70px', bottom: '62px', background: 'rgba(251,246,234,0.94)', color: '#241B14', borderRadius: '34px', padding: '28px 34px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
          <div>
            <strong style={{ display: 'block', fontSize: '36px' }}>{callToAction}</strong>
            <span style={{ display: 'block', marginTop: '8px', fontSize: '28px', color: '#5c4d42' }}>{footerText}</span>
          </div>
          <strong style={{ color: '#C1662B', fontSize: '66px', lineHeight: 1 }}>${product ? getPrice(product).toFixed(2) : '0.00'}</strong>
        </div>
      </div>
    </div>
  );
}

function PremiumMinimalFlyer({ size, products, getImageUrl, getPrice, title, subtitle, callToAction, footerText, brand, logoUrl }: FlyerTemplateProps) {
  const product = products[0];
  const imageUrl = product ? getImageUrl(product) : undefined;
  const isStory = size.height > size.width;

  return (
    <div style={{ width: `${size.width}px`, height: `${size.height}px`, background: '#F7F1E6', color: '#241B14', position: 'relative', overflow: 'hidden', fontFamily: 'Arial, sans-serif', padding: isStory ? '84px 84px' : '62px 70px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <BrandMark brand={brand} logoUrl={logoUrl} dark />
        <span style={{ color: '#5c4d42', fontSize: '28px', fontWeight: 700 }}>{footerText}</span>
      </div>
      <div style={{ marginTop: isStory ? '88px' : '44px', display: 'grid', gridTemplateRows: 'auto 1fr auto', flex: 1, minHeight: 0 }}>
        <div>
          <p style={{ margin: '0 0 20px', fontSize: '30px', letterSpacing: '5px', textTransform: 'uppercase', color: '#2F6E68', fontWeight: 900 }}>{title}</p>
          <h1 style={{ margin: 0, color: '#241B14', fontSize: isStory ? '92px' : '70px', lineHeight: 0.96, maxWidth: '880px' }}>{product?.name || 'Producto especial'}</h1>
        </div>
        <div style={{ margin: isStory ? '72px 0' : '36px 0', borderRadius: '18px', overflow: 'hidden', background: '#E8D7C0', minHeight: 0 }}>
          {imageUrl ? <img src={imageUrl} alt={product?.name || 'Producto'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <EmptyImage name={product?.name || 'Producto'} />}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '42px', alignItems: 'end', borderTop: '3px solid rgba(36,27,20,0.14)', paddingTop: '34px' }}>
          <div>
            <p style={{ margin: '0 0 20px', color: '#5c4d42', fontSize: '36px', lineHeight: 1.3 }}>{subtitle}</p>
            <strong style={{ color: '#2F6E68', fontSize: '34px' }}>{callToAction}</strong>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '0 0 8px', color: '#5c4d42', fontSize: '26px' }}>Precio</p>
            <strong style={{ color: '#241B14', fontSize: '76px', lineHeight: 1 }}>${product ? getPrice(product).toFixed(2) : '0.00'}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickCravingFlyer({ size, products, getImageUrl, getPrice, title, subtitle, callToAction, footerText, brand, logoUrl }: FlyerTemplateProps) {
  const product = products[0];
  const imageUrl = product ? getImageUrl(product) : undefined;
  const isStory = size.height > size.width;

  return (
    <div style={{ width: `${size.width}px`, height: `${size.height}px`, background: '#C1662B', color: '#FBF6EA', position: 'relative', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ position: 'absolute', inset: '42px', border: '8px solid rgba(251,246,234,0.32)', borderRadius: '42px' }} />
      <div style={{ position: 'relative', height: '100%', padding: isStory ? '82px 74px' : '58px 64px', display: 'flex', flexDirection: 'column' }}>
        <BrandMark brand={brand} logoUrl={logoUrl} />
        <div style={{ marginTop: isStory ? '82px' : '42px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '34px' }}>
          <div>
            <p style={{ margin: 0, fontSize: '48px', color: '#241B14', fontWeight: 900, textTransform: 'uppercase' }}>{title}</p>
            <h1 style={{ margin: '18px 0 0', color: '#FBF6EA', fontSize: isStory ? '116px' : '76px', lineHeight: 0.88 }}>{product?.name || 'Antojo del día'}</h1>
          </div>
          <div style={{ background: '#241B14', color: '#FBF6EA', borderRadius: '50%', width: isStory ? '260px' : '210px', height: isStory ? '260px' : '210px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '28px' }}>Hoy</span>
            <strong style={{ fontSize: isStory ? '66px' : '50px', lineHeight: 1 }}>${product ? getPrice(product).toFixed(2) : '0.00'}</strong>
          </div>
        </div>
        <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: isStory ? '1fr' : '1fr 1fr', gap: '36px', alignItems: 'end' }}>
          <div style={{ height: isStory ? '720px' : '430px', borderRadius: '46px', overflow: 'hidden', background: '#F3E7D3', boxShadow: '0 28px 70px rgba(36,27,20,0.35)' }}>
            {imageUrl ? <img src={imageUrl} alt={product?.name || 'Producto'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <EmptyImage name={product?.name || 'Producto'} />}
          </div>
          <div style={{ background: 'rgba(36,27,20,0.86)', borderRadius: '34px', padding: '32px' }}>
            <p style={{ margin: '0 0 18px', fontSize: '36px', lineHeight: 1.25 }}>{subtitle}</p>
            <strong style={{ display: 'block', fontSize: '40px', color: '#F3E7D3' }}>{callToAction}</strong>
            <span style={{ display: 'block', marginTop: '18px', color: '#F3E7D3', fontSize: '28px' }}>{footerText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerticalCatalogFlyer({ size, products, getImageUrl, getPrice, title, subtitle, callToAction, footerText, brand, logoUrl }: FlyerTemplateProps) {
  const rows = products.slice(0, 5);
  const visibleRows: Array<Product | undefined> = rows.length > 0 ? rows : [undefined];
  const isStory = size.height > size.width;

  return (
    <div style={{ width: `${size.width}px`, height: `${size.height}px`, background: '#241B14', color: '#FBF6EA', position: 'relative', overflow: 'hidden', fontFamily: 'Arial, sans-serif', padding: isStory ? '72px 68px' : '50px 58px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '28px' }}>
        <BrandMark brand={brand} logoUrl={logoUrl} />
        <div style={{ color: '#F3E7D3', fontSize: '30px', fontWeight: 800 }}>{callToAction}</div>
      </div>
      <div style={{ margin: isStory ? '58px 0 42px' : '30px 0 24px' }}>
        <p style={{ margin: '0 0 10px', color: '#C1662B', fontSize: '34px', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: 900 }}>{title}</p>
        <h1 style={{ margin: 0, color: '#FBF6EA', fontSize: isStory ? '86px' : '62px', lineHeight: 0.95 }}>Para elegir</h1>
        <p style={{ margin: '22px 0 0', color: '#F3E7D3', fontSize: '32px', lineHeight: 1.25 }}>{subtitle}</p>
      </div>
      <div style={{ display: 'grid', gap: isStory ? '22px' : '16px', flex: 1, minHeight: 0 }}>
        {visibleRows.map((product, index) => {
          const imageUrl = product ? getImageUrl(product) : undefined;
          return (
            <div key={product?.id || index} style={{ display: 'grid', gridTemplateColumns: '190px 1fr auto', gap: '24px', alignItems: 'center', background: 'rgba(251,246,234,0.08)', border: '2px solid rgba(251,246,234,0.16)', borderRadius: '28px', padding: '18px', minHeight: 0 }}>
              <div style={{ height: isStory ? '168px' : '120px', borderRadius: '20px', overflow: 'hidden', background: '#F3E7D3' }}>
                {imageUrl ? <img src={imageUrl} alt={product?.name || 'Producto'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <EmptyImage name={product?.name || 'Producto'} />}
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: isStory ? '38px' : '30px', lineHeight: 1.05 }}>{product?.name || 'Producto'}</strong>
                <span style={{ display: 'block', marginTop: '8px', color: '#F3E7D3', fontSize: '24px' }}>{product?.yield ? 'Precio por pieza' : 'Precio'}</span>
              </div>
              <strong style={{ color: '#C1662B', fontSize: isStory ? '48px' : '38px', whiteSpace: 'nowrap' }}>${product ? getPrice(product).toFixed(2) : '0.00'}</strong>
            </div>
          );
        })}
      </div>
      <p style={{ margin: '28px 0 0', color: '#F3E7D3', textAlign: 'center', fontSize: '28px', fontWeight: 800 }}>{footerText}</p>
    </div>
  );
}
