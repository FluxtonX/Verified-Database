/**
 * Generated RPC types mark every argument as required and non-null, but several SQL functions
 * accept NULL for optional values (and omitting an argument makes PostgREST miss the function).
 * Use this to pass NULL explicitly where the SQL function expects it.
 */
export function sqlNullable<T>(value: T | null | undefined): T {
  return (value ?? null) as T;
}
