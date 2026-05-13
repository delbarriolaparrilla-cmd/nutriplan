import { useState } from 'react';

const INGREDIENTES_COMUNES = [
  'Pollo', 'Huevo', 'Atún', 'Nopal', 'Espinaca', 'Brócoli', 'Zanahoria',
  'Jitomate', 'Cebolla', 'Ajo', 'Aguacate', 'Frijoles', 'Lentejas',
  'Arroz integral', 'Avena', 'Tortilla de maíz', 'Pan integral',
  'Leche', 'Yogur', 'Queso cottage', 'Aceite de oliva', 'Limón', 'Chile',
];

interface IngredientSelectorProps {
  seleccionados: string[];
  onChange: (ingredientes: string[]) => void;
}

export function IngredientSelector({ seleccionados, onChange }: IngredientSelectorProps) {
  const [custom, setCustom] = useState('');

  const toggle = (ing: string) => {
    if (seleccionados.includes(ing)) {
      onChange(seleccionados.filter((i) => i !== ing));
    } else {
      onChange([...seleccionados, ing]);
    }
  };

  const agregarCustom = () => {
    const trimmed = custom.trim();
    if (trimmed && !seleccionados.includes(trimmed)) {
      onChange([...seleccionados, trimmed]);
      setCustom('');
    }
  };

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">Ingredientes disponibles</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {INGREDIENTES_COMUNES.map((ing) => (
          <button
            key={ing}
            onClick={() => toggle(ing)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              seleccionados.includes(ing)
                ? 'text-white border-transparent'
                : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
            }`}
            style={seleccionados.includes(ing) ? { backgroundColor: '#1D9E75', borderColor: '#1D9E75' } : {}}
          >
            {ing}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && agregarCustom()}
          placeholder="Agregar ingrediente..."
          className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-green-400"
        />
        <button
          onClick={agregarCustom}
          className="text-sm px-4 py-2 rounded-xl font-medium text-white"
          style={{ backgroundColor: '#1D9E75' }}
        >
          +
        </button>
      </div>
      {seleccionados.length > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          {seleccionados.length} ingrediente(s) seleccionado(s)
        </p>
      )}
    </div>
  );
}
