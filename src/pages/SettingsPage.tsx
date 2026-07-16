import { ExternalLink } from 'lucide-react'
import { isSupabaseConfigured } from '../lib/supabase'
import { MATTER_TYPE_LABELS } from '../lib/types'
import { DEFAULT_WORKFLOWS } from '../lib/workflows'

export function SettingsPage() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Configuración</h1>
          <p>Conexión, etapas de proceso y equipo</p>
        </div>
      </header>

      <div className="settings-grid">
        <section className="card">
          <h2>Conexión a Supabase</h2>
          {isSupabaseConfigured ? (
            <p className="status-ok">✓ Supabase conectado</p>
          ) : (
            <>
              <p className="status-warn">
                Modo demo activo. Para datos reales en la nube:
              </p>
              <ol className="setup-steps">
                <li>Crea un proyecto gratis en <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com <ExternalLink size={14} /></a></li>
                <li>En SQL Editor, ejecuta el archivo <code>supabase/schema.sql</code></li>
                <li>Copia la URL y la anon key del proyecto</li>
                <li>Crea un archivo <code>.env</code> con:
                  <pre>{`VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key`}</pre>
                </li>
                <li>Reinicia el servidor de desarrollo</li>
              </ol>
            </>
          )}
        </section>

        <section className="card">
          <h2>Etapas de proceso</h2>
          <p className="card-desc">
            Las etapas se pueden modificar en la base de datos (tabla workflow_templates).
            Estas son las plantillas actuales:
          </p>
          {(Object.keys(DEFAULT_WORKFLOWS) as Array<keyof typeof DEFAULT_WORKFLOWS>).map((type) => (
            <div key={type} className="workflow-preview">
              <h3>{MATTER_TYPE_LABELS[type]}</h3>
              <ol>
                {DEFAULT_WORKFLOWS[type].map((stage, i) => (
                  <li key={i}>{stage.name}</li>
                ))}
              </ol>
            </div>
          ))}
        </section>

        <section className="card">
          <h2>Equipo</h2>
          <p className="card-desc">
            Cada miembro del equipo crea su cuenta con el mismo proyecto Supabase.
            Los roles disponibles son: admin, abogado y asistente.
          </p>
          <p>
            Todos los usuarios autenticados pueden ver y editar clientes, expedientes,
            KYC y documentos (configurable en las políticas RLS de Supabase).
          </p>
        </section>
      </div>
    </div>
  )
}
