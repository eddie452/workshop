/**
 * Category Icon
 *
 * Renders a brand-compliant SVG icon for each allergen category.
 * Per brand guide: round + simple, white stroke on Champ Blue circle.
 */

import type { AllergenCategory } from "@/lib/supabase/types";

interface CategoryIconProps {
  category: AllergenCategory;
  /** Size in pixels (default 32) */
  size?: number;
}

/** SVG path data for each category — simple, rounded strokes */
const CATEGORY_PATHS: Record<AllergenCategory, { d: string; label: string }> = {
  tree: {
    label: "Tree pollen",
    d: "M12 22V12M12 12C12 12 8 9 8 6.5C8 4 10 2 12 2C14 2 16 4 16 6.5C16 9 12 12 12 12ZM9 18C7 18 5 16.5 5 14.5C5 12.5 7 11 9 11M15 18C17 18 19 16.5 19 14.5C19 12.5 17 11 15 11",
  },
  grass: {
    label: "Grass pollen",
    d: "M12 22V8M12 8L8 4M12 8L16 4M7 22C7 18 9 16 12 16M17 22C17 18 15 16 12 16M5 14L9 12M19 14L15 12",
  },
  weed: {
    label: "Weed pollen",
    d: "M12 22V10M12 10C9 10 7 8 7 5.5C7 3 9 2 12 2C15 2 17 3 17 5.5C17 8 15 10 12 10ZM8 18L5 15M16 18L19 15M8 14L5 11M16 14L19 11",
  },
  mold: {
    label: "Mold",
    d: "M12 22V16M12 16C8.5 16 6 13.5 6 10C6 6.5 8.5 4 12 4C15.5 4 18 6.5 18 10C18 13.5 15.5 16 12 16ZM9 8.5C9 8.5 10 10 12 10C14 10 15 8.5 15 8.5M9 12C10 13 14 13 15 12",
  },
  indoor: {
    label: "Indoor allergen",
    d: "M3 12L12 4L21 12M5 10V20H19V10M9 20V14H15V20",
  },
  food: {
    label: "Food allergen",
    d: "M12 2C6.5 2 2 6 2 11C2 16 6.5 20 12 20C17.5 20 22 16 22 11C22 6 17.5 2 12 2ZM12 6V11L16 14M8 11H12",
  },
};

export function CategoryIcon({ category, size = 32 }: CategoryIconProps) {
  const config = CATEGORY_PATHS[category];

  return (
    <span
      role="img"
      aria-label={config.label}
      data-testid="category-icon"
      data-category={category}
      className="inline-flex items-center justify-center rounded-full bg-brand-primary"
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={config.d} />
      </svg>
    </span>
  );
}
