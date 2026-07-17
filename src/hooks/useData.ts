import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { syncKycAlerts, fetchComplianceOfficers, fetchComplianceManuals } from '../lib/api'
import {
  DEMO_ACTIVITY,
  DEMO_ALERTS,
  DEMO_CLIENTS,
  DEMO_EXPEDIENTES,
  DEMO_KYC,
  DEMO_NOTICES,
  DEMO_MANUALS,
  DEMO_OFFICERS,
  DEMO_OPERATIONS,
  DEMO_PROFILE,
  DEMO_STAGES,
  DEMO_TRAININGS,
} from '../lib/demo-data'
import type {
  ActivityLog,
  Alert,
  Client,
  Document,
  Expediente,
  ExpedienteStage,
  KycRecord,
  LegalResource,
  PldOperation,
  Profile,
  UnusualNotice,
} from '../lib/types'

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchClients() {
    if (!isSupabaseConfigured) {
      setClients(DEMO_CLIENTS)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase!.from('clients').select('*').order('name')
    setClients(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()
  }, [])

  return { clients, loading, refetch: fetchClients }
}

export function useExpedientes() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchExpedientes() {
    if (!isSupabaseConfigured) {
      setExpedientes(DEMO_EXPEDIENTES)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase!
      .from('expedientes')
      .select('*, clients(*)')
      .order('updated_at', { ascending: false })
    setExpedientes(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchExpedientes()
  }, [])

  return { expedientes, loading, refetch: fetchExpedientes }
}

export function useExpediente(id: string) {
  const [expediente, setExpediente] = useState<Expediente | null>(null)
  const [stages, setStages] = useState<ExpedienteStage[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchExpediente() {
    if (!id) return
    if (!isSupabaseConfigured) {
      setExpediente(DEMO_EXPEDIENTES.find((e) => e.id === id) ?? null)
      setStages(DEMO_STAGES[id] ?? [])
      setLoading(false)
      return
    }
    setLoading(true)
    const [exp, stg] = await Promise.all([
      supabase!.from('expedientes').select('*, clients(*)').eq('id', id).single(),
      supabase!.from('expediente_stages').select('*').eq('expediente_id', id).order('stage_index'),
    ])
    setExpediente(exp.data)
    setStages(stg.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchExpediente()
  }, [id])

  return { expediente, stages, loading, refetch: fetchExpediente }
}

export function useKycRecords() {
  const [records, setRecords] = useState<KycRecord[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchKyc() {
    if (!isSupabaseConfigured) {
      setRecords(DEMO_KYC)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase!
      .from('kyc_records')
      .select('*, clients(*)')
      .order('updated_at', { ascending: false })
    setRecords(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchKyc()
  }, [])

  return { records, loading, refetch: fetchKyc }
}

export function useDocuments(filters: {
  expedienteId?: string
  clientId?: string
  kycId?: string
}) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchDocs() {
    if (!isSupabaseConfigured) {
      setDocuments([])
      setLoading(false)
      return
    }
    setLoading(true)
    let query = supabase!.from('documents').select('*').order('uploaded_at', { ascending: false })
    if (filters.expedienteId) query = query.eq('expediente_id', filters.expedienteId)
    else if (filters.clientId) query = query.eq('client_id', filters.clientId)
    else if (filters.kycId) query = query.eq('kyc_id', filters.kycId)
    const { data } = await query
    setDocuments(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchDocs()
  }, [filters.expedienteId, filters.clientId, filters.kycId])

  return { documents, loading, refetch: fetchDocs }
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchAlerts() {
    if (!isSupabaseConfigured) {
      setAlerts(DEMO_ALERTS)
      setLoading(false)
      return
    }
    setLoading(true)
    await syncKycAlerts()
    const { data } = await supabase!
      .from('alerts')
      .select('*, clients(*), expedientes(*)')
      .eq('resolved', false)
      .order('due_date')
    setAlerts(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  return { alerts, loading, refetch: fetchAlerts }
}

export function useActivity() {
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setActivity(DEMO_ACTIVITY)
      setLoading(false)
      return
    }
    supabase!
      .from('activity_log')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setActivity(data ?? [])
        setLoading(false)
      })
  }, [])

  return { activity, loading }
}

export function useActivityLog(limit = 500) {
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchActivity() {
    if (!isSupabaseConfigured) {
      setActivity(DEMO_ACTIVITY)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase!
      .from('activity_log')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false })
      .limit(limit)
    setActivity(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchActivity()
  }, [limit])

  return { activity, loading, refetch: fetchActivity }
}

export function useClientActivity(clientId: string) {
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) return
    if (!isSupabaseConfigured) {
      setActivity(DEMO_ACTIVITY.filter((a) => a.client_id === clientId))
      setLoading(false)
      return
    }
    supabase!
      .from('activity_log')
      .select('*, profiles(*)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setActivity(data ?? [])
        setLoading(false)
      })
  }, [clientId])

  return { activity, loading }
}

export function useSearch(query: string) {
  const [results, setResults] = useState<{
    clients: Client[]
    expedientes: Expediente[]
    kyc: KycRecord[]
  }>({ clients: [], expedientes: [], kyc: [] })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setResults({ clients: [], expedientes: [], kyc: [] })
      return
    }
    const q = query.toLowerCase()
    setLoading(true)

    if (!isSupabaseConfigured) {
      setResults({
        clients: DEMO_CLIENTS.filter((c) => c.name.toLowerCase().includes(q)),
        expedientes: DEMO_EXPEDIENTES.filter((e) => e.title.toLowerCase().includes(q)),
        kyc: DEMO_KYC.filter((k) => k.clients?.name.toLowerCase().includes(q)),
      })
      setLoading(false)
      return
    }

    Promise.all([
      supabase!.from('clients').select('*').or(`name.ilike.%${query}%,rfc.ilike.%${query}%,email.ilike.%${query}%`),
      supabase!.from('expedientes').select('*, clients(*)').ilike('title', `%${query}%`),
      supabase!.from('kyc_records').select('*, clients(*)'),
    ]).then(([c, e, k]) => {
      setResults({
        clients: c.data ?? [],
        expedientes: e.data ?? [],
        kyc: (k.data ?? []).filter(
          (r) =>
            r.clients?.name?.toLowerCase().includes(q) ||
            r.beneficial_owner?.toLowerCase().includes(q),
        ),
      })
      setLoading(false)
    })
  }, [query])

  return { results, loading }
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setProfiles([DEMO_PROFILE])
      setLoading(false)
      return
    }
    supabase!
      .from('profiles')
      .select('*')
      .order('full_name')
      .then(({ data }) => {
        setProfiles(data ?? [])
        setLoading(false)
      })
  }, [])

  return { profiles, loading }
}

export function useLegalResources() {
  const [resources, setResources] = useState<LegalResource[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchResources() {
    if (!isSupabaseConfigured) {
      setResources([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase!
      .from('legal_resources')
      .select('*')
      .order('created_at', { ascending: false })
    setResources(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchResources()
  }, [])

  return { resources, loading, refetch: fetchResources }
}

export function usePldOperations() {
  const [operations, setOperations] = useState<PldOperation[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchOps() {
    if (!isSupabaseConfigured) {
      setOperations(DEMO_OPERATIONS)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase!
      .from('pld_operations')
      .select('*, clients(*)')
      .order('operation_date', { ascending: false })
    setOperations(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchOps()
  }, [])

  return { operations, loading, refetch: fetchOps }
}

export function useUnusualNotices() {
  const [notices, setNotices] = useState<UnusualNotice[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchNotices() {
    if (!isSupabaseConfigured) {
      setNotices(DEMO_NOTICES)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase!
      .from('unusual_notices')
      .select('*, clients(*)')
      .order('detected_at', { ascending: false })
    setNotices(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchNotices()
  }, [])

  return { notices, loading, refetch: fetchNotices }
}

export function usePldOperationsByClient(clientId: string) {
  const { operations, loading, refetch } = usePldOperations()
  return {
    operations: operations.filter((o) => o.client_id === clientId),
    loading,
    refetch,
  }
}

export function useUnusualNoticesByClient(clientId: string) {
  const { notices, loading, refetch } = useUnusualNotices()
  return {
    notices: notices.filter((n) => n.client_id === clientId),
    loading,
    refetch,
  }
}

export function useExpedienteComments(expedienteId: string) {
  const [comments, setComments] = useState<import('../lib/types').ExpedienteComment[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchComments() {
    if (!expedienteId || !isSupabaseConfigured) {
      setComments([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase!
      .from('expediente_comments')
      .select('*, profiles(*)')
      .eq('expediente_id', expedienteId)
      .order('created_at', { ascending: false })
    setComments(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchComments()
  }, [expedienteId])

  return { comments, loading, refetch: fetchComments }
}

export function useComplianceOfficers() {
  const [officers, setOfficers] = useState<import('../lib/types').ClientComplianceOfficer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  async function fetchOfficers() {
    if (!isSupabaseConfigured) {
      setOfficers(DEMO_OFFICERS)
      setLoading(false)
      setError(undefined)
      return DEMO_OFFICERS
    }
    setLoading(true)
    const { officers: data, error: err } = await fetchComplianceOfficers()
    setError(err)
    setOfficers(data)
    setLoading(false)
    return data
  }

  useEffect(() => {
    fetchOfficers()
  }, [])

  return { officers, loading, error, refetch: fetchOfficers }
}

export function useTrainingSessions() {
  const [sessions, setSessions] = useState<import('../lib/types').TrainingSession[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchSessions() {
    if (!isSupabaseConfigured) {
      setSessions(DEMO_TRAININGS)
      setLoading(false)
      return DEMO_TRAININGS
    }
    setLoading(true)
    const { data } = await supabase!
      .from('training_sessions')
      .select('*, clients(*), officers:client_compliance_officers(*)')
      .order('session_date', { ascending: false })
    const list = data ?? []
    setSessions(list)
    setLoading(false)
    return list
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  return { sessions, loading, refetch: fetchSessions }
}

export function useComplianceManuals() {
  const [manuals, setManuals] = useState<import('../lib/types').ComplianceManual[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  async function fetchManuals() {
    if (!isSupabaseConfigured) {
      setManuals(DEMO_MANUALS)
      setLoading(false)
      setError(undefined)
      return DEMO_MANUALS
    }
    setLoading(true)
    const { manuals: data, error: err } = await fetchComplianceManuals()
    setError(err)
    setManuals(data)
    setLoading(false)
    return data
  }

  useEffect(() => {
    fetchManuals()
  }, [])

  return { manuals, loading, error, refetch: fetchManuals }
}
