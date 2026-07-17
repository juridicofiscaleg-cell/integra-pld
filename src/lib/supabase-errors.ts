/** Mensaje claro cuando falta una tabla o migración en Supabase */
export function formatSupabaseMigrationError(message: string, migrationFile?: string): string {
  if (
    !/schema cache|could not find the table|does not exist|42P01|PGRST205/i.test(message)
  ) {
    return message
  }

  let file = migrationFile
  if (!file) {
    if (/approval_requests/i.test(message)) file = 'migration-approvals.sql'
    else if (/compliance_officers|compliance_manuals|training_sessions/i.test(message)) {
      file = 'migration-cumplimiento.sql'
    } else {
      file = 'migration-cumplimiento.sql'
    }
  }

  return `Falta ejecutar la migración SQL en Supabase. Abre SQL Editor → pega y ejecuta el archivo supabase/${file} completo. Detalle: ${message}`
}
