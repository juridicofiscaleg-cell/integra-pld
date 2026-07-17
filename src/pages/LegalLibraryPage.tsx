import { useState, useRef } from 'react'
import { BookOpen, Download, Plus, Search, Trash2, Upload } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { deleteLegalResource, getLegalResourceUrl, uploadLegalResource } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useProtectedAction } from '../hooks/useProtectedAction'
import { canDelete as roleCanDelete, needsApprovalForSensitive } from '../lib/permissions'
import { useLegalResources } from '../hooks/useData'
import { LFPIORPI_ARTICLES, LEGAL_CATEGORIES } from '../lib/lfpiorpi'
import { formatDate } from '../lib/utils'
import type { LegalCategory } from '../lib/types'

export function LegalLibraryPage() {
  const { user, profile } = useAuth()
  const { resources, loading, refetch } = useLegalResources()
  const fileRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'lfpiorpi' | 'archivos'>('lfpiorpi')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<LegalCategory>('formato')
  const [description, setDescription] = useState('')
  const [articleRef, setArticleRef] = useState('')
  const [deleteId, setDeleteId] = useState<{ id: string; path?: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { runSensitiveAction } = useProtectedAction()
  const mayDelete = roleCanDelete(profile?.role) || needsApprovalForSensitive(profile?.role)

  const filteredArticles = LFPIORPI_ARTICLES.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.article.toLowerCase().includes(search.toLowerCase()) ||
      a.summary.toLowerCase().includes(search.toLowerCase()),
  )

  const filteredResources = resources.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase()),
  )

  async function handleUpload(file: File) {
    if (!title.trim()) {
      setError('El título es obligatorio.')
      return
    }
    setSubmitting(true)
    setError('')
    const result = await uploadLegalResource(
      file,
      { title, category, description, article_ref: articleRef, is_template: category === 'plantilla' },
      user?.id,
    )
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setUploadOpen(false)
    setTitle('')
    setDescription('')
    setArticleRef('')
    refetch()
  }

  async function handleDelete() {
    if (!deleteId) return
    setSubmitting(true)
    const resource = resources.find((r) => r.id === deleteId.id)
    await runSensitiveAction({
      actionType: 'delete_legal_resource',
      title: `Eliminar recurso: ${resource?.title ?? deleteId.id}`,
      payload: { resourceId: deleteId.id, storagePath: deleteId.path },
      direct: () => deleteLegalResource(deleteId.id, deleteId.path),
    })
    setSubmitting(false)
    setDeleteId(null)
    refetch()
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Biblioteca legal</h1>
          <p>LFPIORPI, formatos y plantillas del despacho</p>
        </div>
        {mayDelete && (
          <Button onClick={() => setUploadOpen(true)}>
            <Plus size={16} /> Subir formato
          </Button>
        )}
      </header>

      <div className="search-box">
        <Search size={20} />
        <Input
          placeholder="Buscar artículo, formato o plantilla..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="tab-row">
        <button type="button" className={tab === 'lfpiorpi' ? 'tab active' : 'tab'} onClick={() => setTab('lfpiorpi')}>
          <BookOpen size={16} /> LFPIORPI
        </button>
        <button type="button" className={tab === 'archivos' ? 'tab active' : 'tab'} onClick={() => setTab('archivos')}>
          Mis formatos ({resources.length})
        </button>
      </div>

      {tab === 'lfpiorpi' ? (
        <div className="legal-articles-grid">
          {filteredArticles.map((art) => (
            <article key={art.id} className="card legal-article-card">
              <Badge variant="info">{art.article}</Badge>
              <h3>{art.title}</h3>
              <p>{art.summary}</p>
              <div className="tag-row">
                {art.tags.map((t) => (
                  <span key={t} className="tag">{t}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : loading ? (
        <p className="loading">Cargando...</p>
      ) : filteredResources.length === 0 ? (
        <div className="empty-card">
          <h2>Sin formatos subidos</h2>
          <p>Sube tus plantillas KYC, manuales PLD y formatos para tenerlos aquí en lugar del Drive.</p>
        </div>
      ) : (
        <div className="legal-files-list">
          {filteredResources.map((r) => (
            <div key={r.id} className="doc-row">
              <BookOpen size={18} />
              <div className="doc-info">
                <strong>{r.title}</strong>
                <span>
                  {LEGAL_CATEGORIES[r.category]} · {formatDate(r.created_at)}
                  {r.article_ref && ` · ${r.article_ref}`}
                </span>
                {r.description && <p className="doc-desc">{r.description}</p>}
              </div>
              {r.storage_path && (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={async () => {
                    const url = await getLegalResourceUrl(r.storage_path!)
                    if (url) window.open(url, '_blank')
                  }}
                >
                  <Download size={16} />
                </button>
              )}
              {mayDelete && (
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => setDeleteId({ id: r.id, path: r.storage_path })}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Subir formato / plantilla">
        <Input label="Título *" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Select label="Categoría" value={category} onChange={(e) => setCategory(e.target.value as LegalCategory)}>
          {(Object.keys(LEGAL_CATEGORIES) as LegalCategory[]).map((k) => (
            <option key={k} value={k}>{LEGAL_CATEGORIES[k]}</option>
          ))}
        </Select>
        <Input label="Referencia (ej. Art. 18)" value={articleRef} onChange={(e) => setArticleRef(e.target.value)} />
        <Input label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input
          ref={fileRef}
          type="file"
          hidden
          accept=".pdf,.doc,.docx,.xlsx,.xls,.odt"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleUpload(f)
            e.target.value = ''
          }}
        />
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setUploadOpen(false)}>Cancelar</Button>
          <Button disabled={submitting} onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> {submitting ? 'Subiendo...' : 'Elegir archivo'}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar recurso"
        message="¿Eliminar este formato de la biblioteca?"
        confirmLabel="Eliminar"
        danger
        loading={submitting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
