import React, { useEffect, useState } from 'react';

/**
 * Affichage progressif des longues listes : seules les premières lignes sont dans la page,
 * les autres s'ajoutent à la demande (économise la mémoire des téléphones anciens).
 */
export function useShowMore(total: number, resetKey: unknown = '', step = 30) {
  const [shown, setShown] = useState(step);
  useEffect(() => { setShown(step); }, [resetKey, step]);
  return { shown: Math.min(shown, total), hasMore: shown < total, more: () => setShown(n => n + step), remaining: Math.max(0, total - shown) };
}

export const ShowMoreButton: React.FC<{ hasMore: boolean; remaining: number; onMore: () => void }> = ({ hasMore, remaining, onMore }) =>
  hasMore ? (
    <button
      type="button"
      onClick={onMore}
      className="w-full py-3 rounded-2xl bg-[#27150c] hover:bg-[#341b10] text-[#fed7aa] text-xs font-bold border border-[#4a2412] transition-colors"
    >
      Afficher la suite ({remaining} restante{remaining > 1 ? 's' : ''})
    </button>
  ) : null;
