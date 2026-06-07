/**
 * CANON — the single source of truth for Le Kyoto.
 *
 * This is what every conflict resolves TOWARD. An agent's claim is only "grounded"
 * if it traces back to a value here (menu/prices/hours) or to a real data source in
 * @weavehacks/seed (POS orders, reviews, weather). Anything an agent GENERATES is
 * derived and may be stale — never write generated output back into here.
 *
 * Domain data is fine in this package (it IS the domain). Keep @weavehacks/orchestration
 * and @weavehacks/observability free of these concepts.
 *
 * ⚠️ PLACEHOLDER VALUES — the dishes/prices below are demo-plausible, not Le Kyoto's
 * real menu. The operator replaces them with the real numbers; that real data is the
 * pitch's credibility. Keep the SHAPE, swap the VALUES.
 */

export interface MenuItem {
  /** stable id used as a claim key across agents */
  id: string;
  name: string;
  /** price in euros */
  price: number;
  category: "ramen" | "gyoza" | "soba" | "side" | "drink" | "poke" | "yakisoba" | "sushi" | "box";
  /** is this item currently offerable? (canon availability) */
  available: boolean;
  /** short grounding hook agents may cite (e.g. the broth story) */
  note?: string;
}

export interface Hours {
  /** 0=Sun … 6=Sat → "HH:MM-HH:MM" or null when closed */
  [day: number]: string | null;
}

export interface Truth {
  restaurant: { name: string; city: string; cuisine: string };
  menu: MenuItem[];
  hours: Hours;
}

/** TODO(le-kyoto): replace with the real menu / prices / hours. Keep the shape. */
export const TRUTH: Truth = {
  restaurant: { name: "Le Kyoto", city: "Paris (région)", cuisine: "Japanese takeout/delivery" },
  menu: [
    { id: "tonkotsu_ramen", name: "Tonkotsu Ramen", price: 14.5, category: "ramen", available: true, note: "18-hour broth — most-mentioned item in 5★ reviews" },
    { id: "shoyu_ramen", name: "Shoyu Ramen", price: 13.0, category: "ramen", available: true },
    { id: "gyoza", name: "Gyoza (6)", price: 6.5, category: "gyoza", available: true },
    { id: "cold_soba", name: "Cold Soba", price: 11.0, category: "soba", available: true, note: "warm-weather item; demand drops in rain/cold" },
    { id: "edamame", name: "Edamame", price: 4.0, category: "side", available: true },
    // Real Le Kyoto dish NAMES (operator-confirmed); ⚠️ prices below are PLACEHOLDER — operator to set the real tariffs.
    { id: "ramen", name: "Ramen", price: 13.5, category: "ramen", available: true },
    { id: "kyotobox", name: "Kyoto Box", price: 16.9, category: "box", available: true, note: "signature assorted box" },
    { id: "poke", name: "Poke Bowl", price: 13.9, category: "poke", available: true },
    { id: "yakisoba", name: "Yakisoba", price: 12.5, category: "yakisoba", available: true },
    { id: "nems_poulet", name: "Nems Poulet", price: 5.5, category: "side", available: true },
    { id: "maki", name: "Maki", price: 6.0, category: "sushi", available: true },
    { id: "california", name: "California Roll", price: 7.0, category: "sushi", available: true },
    { id: "sushi", name: "Sushi", price: 8.5, category: "sushi", available: true },
    { id: "soupe_miso", name: "Soupe Miso", price: 3.5, category: "side", available: true },
    { id: "brochettes", name: "Brochettes", price: 6.5, category: "side", available: true },
    { id: "tempura", name: "Tempura", price: 7.5, category: "side", available: true },
    { id: "samoussas", name: "Samoussas", price: 5.0, category: "side", available: true },
    { id: "salade_chou", name: "Salade de Chou", price: 3.5, category: "side", available: true },
  ],
  hours: {
    0: null, // Sun closed
    1: "18:00-22:00",
    2: "18:00-22:00",
    3: "18:00-22:00",
    4: "18:00-22:00",
    5: "18:00-22:30", // Fri
    6: "18:00-22:30", // Sat
  },
};

/** Look up a canonical menu item by id. Returns undefined if it isn't on the menu. */
export function menuItem(id: string): MenuItem | undefined {
  return TRUTH.menu.find((m) => m.id === id);
}

/** True if a claimed value matches canon for a given menu item field. */
export function isGroundedPrice(id: string, price: number): boolean {
  return menuItem(id)?.price === price;
}

// POLICY canon (recovery/gesture rules, required disclosures, forbidden claims) + the mechanical
// detection helpers WS-C's policyOk reads and WS-B's policy_lookup surfaces. ⚠️ WS-A owns this.
export * from "./policy";
