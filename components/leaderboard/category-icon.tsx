/**
 * Category Icon
 *
 * Renders a text-based icon representing the allergen category.
 * Uses Unicode symbols to avoid image dependency.
 */

import type { AllergenCategory } from "@/lib/supabase/types";

interface CategoryIconProps {
  category: AllergenCategory;
}

const CATEGORY_ICONS: Record<AllergenCategory, { icon: string; label: string }> = {
  tree: { icon: "\u{1F333}", label: "Tree pollen" },
  grass: { icon: "\u{1F33F}", label: "Grass pollen" },
  weed: { icon: "\u{1F33E}", label: "Weed pollen" },
  mold: { icon: "\u{1F344}", label: "Mold" },
  indoor: { icon: "\u{1F3E0}", label: "Indoor allergen" },
  food: { icon: "\u{1F34E}", label: "Food allergen" },
};

export function CategoryIcon({ category }: CategoryIconProps) {
  const config = CATEGORY_ICONS[category];

  return (
    <span
      role="img"
      aria-label={config.label}
      data-testid="category-icon"
      data-category={category}
      className="text-lg"
    >
      {config.icon}
    </span>
  );
}
