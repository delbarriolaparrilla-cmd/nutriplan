import { MacroBar } from '../ui/MacroBar.js';

interface MacrosRowProps {
  calorias: number;
  caloriasMax: number;
  proteina: number;
  proteinaMax: number;
  carbs: number;
  carbsMax: number;
  grasa: number;
  grasaMax: number;
}

export function MacrosRow({
  calorias,
  caloriasMax,
  proteina,
  proteinaMax,
  carbs,
  carbsMax,
  grasa,
  grasaMax,
}: MacrosRowProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Macros de hoy</h3>
      <div className="grid grid-cols-2 gap-3">
        <MacroBar label="Calorías" value={calorias} max={caloriasMax} color="#1D9E75" unit=" kcal" />
        <MacroBar label="Proteína" value={proteina} max={proteinaMax} color="#3B82F6" />
        <MacroBar label="Carbohidratos" value={carbs} max={carbsMax} color="#F59E0B" />
        <MacroBar label="Grasas" value={grasa} max={grasaMax} color="#EF4444" />
      </div>
    </div>
  );
}
