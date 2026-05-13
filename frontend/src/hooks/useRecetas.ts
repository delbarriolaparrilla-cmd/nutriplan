import { useCallback, useEffect, useState } from 'react';
import { GenerarRecetaParams, Receta, RecetaGenerada, TipoComida } from '../types/index.js';
import { generarRecetas, guardarReceta, listarRecetas } from '../lib/api.js';

export function useRecetas(tipo?: TipoComida) {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setLoading(true);
    listarRecetas(tipo)
      .then(({ recetas }) => setRecetas(recetas))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tipo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { recetas, loading, error, recargar: cargar };
}

export function useGenerarRecetas() {
  const [sugerencias, setSugerencias] = useState<RecetaGenerada[]>([]);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generar = async (params: GenerarRecetaParams) => {
    setGenerando(true);
    setError(null);
    try {
      const { recetas } = await generarRecetas(params);
      setSugerencias(recetas);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerando(false);
    }
  };

  const guardar = async (
    receta: RecetaGenerada,
    tipoComida: TipoComida
  ): Promise<Receta> => {
    const { receta: guardada } = await guardarReceta({ ...receta, tipo_comida: tipoComida, generada_por_ia: true });
    return guardada;
  };

  const limpiar = () => setSugerencias([]);

  return { sugerencias, generando, error, generar, guardar, limpiar };
}
