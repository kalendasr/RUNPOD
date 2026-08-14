export interface SaasSpec {
  projectName: string;
  siteName: string;
  siteDescription: string;
}

export interface EntitySpec {
  /** PascalCase, e.g. "Customer" — becomes the Prisma model name. */
  name: string;
  /** Plain string fields on the entity, e.g. ["name", "email"]. */
  fields: string[];
}

const PASCAL_CASE = /^[A-Z][a-zA-Z0-9]*$/;
const FIELD_NAME = /^[a-z][a-zA-Z0-9]*$/;

export function validateEntitySpec(entity: EntitySpec): void {
  if (!PASCAL_CASE.test(entity.name)) {
    throw new Error(`Entity name "${entity.name}" must be PascalCase, e.g. "Customer"`);
  }
  if (entity.fields.length === 0) {
    throw new Error(`Entity "${entity.name}" must have at least one field`);
  }
  for (const field of entity.fields) {
    if (!FIELD_NAME.test(field)) {
      throw new Error(`Field "${field}" on entity "${entity.name}" must be camelCase, e.g. "name"`);
    }
  }
}

/** Naive pluralization — good enough for the generator's route/table names. */
export function pluralize(name: string): string {
  if (/[sxz]$|[cs]h$/i.test(name)) return `${name}es`;
  if (/[^aeiou]y$/i.test(name)) return `${name.slice(0, -1)}ies`;
  return `${name}s`;
}

export function modelAccessor(entityName: string): string {
  return entityName.charAt(0).toLowerCase() + entityName.slice(1);
}

export function routeSegment(entityName: string): string {
  return pluralize(modelAccessor(entityName));
}
