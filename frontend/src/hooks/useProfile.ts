import { useEffect, useState } from 'react';
import { PerfilNutricional } from '../types/index.js';
import { getPerfil } from '../lib/api.js';

export function useProfile() {
  const [perfil, setPerfil] = useState<PerfilNutricional | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPerfil()
      .then(({ perfil }) => setPerfil(perfil))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { perfil, loading, error, setPerfil };
}
