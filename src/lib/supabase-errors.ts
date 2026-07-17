/** Mensaje claro cuando falta una tabla o migración en Supabase */
export function formatSupabaseMigrationError(message: string, migrationFile = 'migration-cumplimiento.sql'): string {
  if (
    /schema cache|could not find the table|does not exist|42P01|PGRST205/i.test(message)
  ) {
    return `Falta ejecutar la migración SQL en Supabase. Abre SQL Editor → pega y ejecuta el archivo supabase/${migrationFile} completo. Detalle: ${message}`
  }
  return message
}
