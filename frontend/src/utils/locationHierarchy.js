/**
 * Helpers for building hierarchical location selectors.
 *
 * Locations use a self-referencing `parentLocationId` tree. Different
 * laboratories/rooms/cabinets may share identical names, so the parent selector
 * must always show the full path (e.g. "Phase 1 → Room 01 → Cabinet A")
 * and only allow parents of a valid type for the selected child type.
 */

export const LOCATION_TYPES = [
  { value: "LAB", label: "Laboratory" },
  { value: "ROOM", label: "Room" },
  { value: "CABINET", label: "Cabinet / Cupboard" },
  { value: "SHELF", label: "Shelf" },
  { value: "FRIDGE", label: "Refrigerator / Freezer" },
  { value: "OTHER", label: "Other" },
];

// Hierarchy rules: selected child type -> allowed parent types ("" = no parent)
const PARENT_TYPES = {
  LAB: [],
  ROOM: ["LAB"],
  CABINET: ["ROOM"],
  SHELF: ["CABINET"],
  FRIDGE: ["ROOM", "CABINET"],
  OTHER: ["LAB", "ROOM", "CABINET", "SHELF", "FRIDGE", "OTHER"],
};

/**
 * Given a flat list of locations, return a map keyed by id for quick lookups.
 */
export const buildLocationMap = (locations) => {
  const map = new Map();
  locations.forEach((loc) => map.set(loc.id, loc));
  return map;
};

/**
 * Compute the full ancestor path name for a location, e.g. "Phase 1 → Room 01".
 * @param {string} locationId
 * @param {Map} locationMap - id -> location
 * @param {string} [separator=' → ']
 */
export const getLocationPath = (locationId, locationMap, separator = " → ") => {
  const path = [];
  let current = locationMap.get(locationId);
  let guard = 0;
  while (current && guard < 50) {
    path.unshift(current.name);
    current = locationMap.get(current.parentLocationId);
    guard += 1;
  }
  return path.join(separator);
};

/**
 * Returns an array of locations that are valid parents for the given type,
 * each annotated with a full path label (`→ path`), sorted alphabetically by path.
 *
 * Allowed parents: see PARENT_TYPES.
 */
export const getValidParentOptions = (type, locations) => {
  const allowedTypes = PARENT_TYPES[type] || [];
  if (!type || allowedTypes.length === 0) {
    return [];
  }

  const map = buildLocationMap(locations);

  return locations
    .filter((loc) => loc.id && allowedTypes.includes(loc.type))
    .map((loc) => ({
      ...loc,
      path: getLocationPath(loc.id, map),
    }))
    .sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: "base" }));
};

/**
 * If the currently selected parent is no longer valid for the given type,
 * return "" to clear it; otherwise keep it.
 */
export const clearInvalidParent = (type, parentLocationId, locations) => {
  if (!parentLocationId) return "";
  const allowedTypes = PARENT_TYPES[type] || [];
  const parent = locations.find((loc) => loc.id === parentLocationId);
  if (!parent) return "";
  return allowedTypes.includes(parent.type) ? parentLocationId : "";
};
