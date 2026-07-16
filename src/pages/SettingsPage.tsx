import { useAuth } from '../context/AuthContext'
import { useProfiles } from '../hooks/useData'
import { isSupabaseConfigured } from '../lib/supabase'
import { MATTER_TYPE_LABELS, ROLE_LABELS } from '../lib/types'
import { DEFAULT_WORKFLOWS } from '../lib/workflows'

export function SettingsPage() {
  const { profile } = useAuth()
  const { profiles, loading } = useProfiles()

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Configuración</h1>
          <p>Conexión, equipo, etapas de proceso y permisos</p>
        </div>
      </header>

      <div className="settings-grid">
        <section className="card">
          <h2>Tu cuenta</h2>
          <dl className="detail-list">
            <dt>Nombre</dt><dd>{profile?.full_name ?? '—'}</dd>
            <dt>Email</dt><dd>{profile?.email ?? '—'}</dd>
            <dt>Rol</dt><dd>{profile ? ROLE_LABELS[profile.role] : '—'}</dd>
          </dl>
          <p className="card-desc">
            {profile?.role === 'asistente'
              ? 'Como asistente puedes ver y subir documentos, pero no eliminarlos.'
              : profile?.role === 'admin'
                ? 'Como administrador tienes acceso completo al sistema.'
                : 'Como abogado tienes acceso completo a clientes, expedientes y KYC.'}
          </p>
        </section>

        <section className="card">
          <h2>Conexión a Supabase</h2>
          {isSupabaseConfigured ? (
            <p className="status-ok">✓ Supabase conectado — datos en la nube</p>
          ) : (
            <p className="status-warn">Modo demo activo. Configura .env para datos reales.</p>
          )}
        </section>

        <section className="card">
          <h2>Equipo</h2>
          {loading ? (
            <p className="loading">Cargando equipo...</p>
          ) : profiles.length === 0 ? (
            <p className="card-desc">
              Cada miembro crea su cuenta con el mismo proyecto Supabase.
              Los roles son: admin, abogado y asistente.
            </p>
          ) : (
            <div className="team-list">
              {profiles.map((p) => (
                <div key={p.id} className="team-row">
                  <div className="user-avatar">{p.full_name.charAt(0)}</div>
                  <div>
                    <strong>{p.full_name}</strong>
                    <span>{p.email}</span>
                  </div>
                  <span className="team-role">{ROLE_LABELS[p.role]}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2>Etapas de proceso PLD</h2>
          <p className="card-desc">
            Plantillas de timeline por tipo de asunto. Editables en Supabase (workflow_templates).
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
      </div>
    </div>
  )
}
