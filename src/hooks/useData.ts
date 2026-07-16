import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import {
  DEMO_ACTIVITY,
  DEMO_ALERTS,
  DEMO_CLIENTS,
  DEMO_EXPEDIENTES,
  DEMO_KYC,
  DEMO_STAGES,
} from '../lib/demo-data'
import type {
  ActivityLog,
  Alert,
  Client,
  Document,
  Expediente,
  ExpedienteStage,
  KycRecord,
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

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAlerts(DEMO_ALERTS)
      setLoading(false)
      return
    }
    supabase!
      .from('alerts')
      .select('*, clients(*), expedientes(*)')
      .eq('resolved', false)
      .order('due_date')
      .then(({ data }) => {
        setAlerts(data ?? [])
        setLoading(false)
      })
  }, [])

  return { alerts, loading }
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
      supabase!.from('clients').select('*').ilike('name', `%${query}%`),
      supabase!.from('expedientes').select('*, clients(*)').ilike('title', `%${query}%`),
      supabase!.from('kyc_records').select('*, clients(*)'),
    ]).then(([c, e, k]) => {
      setResults({
        clients: c.data ?? [],
        expedientes: e.data ?? [],
        kyc: (k.data ?? []).filter((r) => r.clients?.name?.toLowerCase().includes(q)),
      })
      setLoading(false)
    })
  }, [query])

  return { results, loading }
}
