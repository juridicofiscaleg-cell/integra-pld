import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useProfiles } from '../hooks/useData'
import { updateProfileRole } from '../lib/api'
import { isSupabaseConfigured } from '../lib/supabase'
import { canManageTeam } from '../lib/permissions'
import { MATTER_TYPE_LABELS, ROLE_LABELS, type UserRole } from '../lib/types'
import { DEFAULT_WORKFLOWS } from '../lib/workflows'
import { Select } from '../components/ui/Select'

export function SettingsPage() {
  const { profile, user } = useAuth()
  const { profiles, loading, refetch } = useProfiles()
  const [teamMessage, setTeamMessage] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const canManage = canManageTeam(profile?.role)

  async function handleRoleChange(memberId: string, role: UserRole) {
    setSavingId(memberId)
    setTeamMessage('')
    const result = await updateProfileRole(memberId, role, user?.id)
    setSavingId(null)
    if (result.error) setTeamMessage(result.error)
    else {
      setTeamMessage('Rol actualizado.')
      refetch()
    }
  }

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
              ? 'Como auxiliar puedes registrar y subir información. Eliminar, aprobar KYC y exportar expedientes requieren autorización del abogado.'
              : profile?.role === 'admin'
                ? 'Como administrador tienes acceso completo y puedes asignar roles al equipo.'
                : 'Como abogado tienes acceso completo y puedes autorizar solicitudes de tu auxiliar.'}
          </p>
        </section>

        <section className="card">
          <h2>Conexión a Supabase</h2>
          {isSupabaseConfigured ? (
            <p className="status-ok">✓ Supabase conectado — datos en la nube</p>
          ) : (
            <p className="status-warn">Modo demo activo. Configura .env para datos reales.</p>
          )}
          {!isSupabaseConfigured && (
            <p className="card-desc">Las autorizaciones en demo se guardan en este navegador.</p>
          )}
        </section>

        <section className="card card-wide">
          <h2>Equipo y roles</h2>
          {loading ? (
            <p className="loading">Cargando equipo...</p>
          ) : profiles.length === 0 ? (
            <p className="card-desc">
              Cada miembro crea su cuenta con el mismo proyecto Supabase.
              Asigna rol <strong>asistente</strong> a tu auxiliar desde aquí (requiere migración de autorizaciones).
            </p>
          ) : (
            <>
              {teamMessage && <p className="form-success">{teamMessage}</p>}
              <div className="team-list">
                {profiles.map((p) => (
                  <div key={p.id} className="team-row">
                    <div className="user-avatar">{p.full_name.charAt(0)}</div>
                    <div>
                      <strong>{p.full_name}</strong>
                      <span>{p.email}</span>
                    </div>
                    {canManage && p.id !== profile?.id ? (
                      <Select
                        label=""
                        value={p.role}
                        disabled={savingId === p.id}
                        onChange={(e) => handleRoleChange(p.id, e.target.value as UserRole)}
                      >
                        {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </Select>
                    ) : (
                      <span className="team-role">{ROLE_LABELS[p.role]}</span>
                    )}
                  </div>
                ))}
              </div>
              {canManage && (
                <p className="card-desc">
                  Tip: asigna <strong>Asistente</strong> a personal de apoyo; podrá trabajar pero las eliminaciones irán a Autorizaciones.
                </p>
              )}
            </>
          )}
        </section>

        <section className="card">
          <h2>Permisos por rol</h2>
          <dl className="detail-list compact-perms">
            <dt>Asistente</dt>
            <dd>Ver, crear, editar, subir docs. Eliminar/aprobar/exportar → solicita autorización.</dd>
            <dt>Abogado</dt>
            <dd>Acceso completo + revisar autorizaciones + reportes y bitácora.</dd>
            <dt>Admin</dt>
            <dd>Igual que abogado + gestión de roles del equipo.</dd>
          </dl>
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
