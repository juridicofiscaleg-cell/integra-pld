import { useCallback, useEffect, useState } from 'react'
import { fetchApprovalRequests } from '../lib/api'
import type { ApprovalRequest } from '../lib/types'

export function useApprovalRequests() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  const refetch = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true)
    const { requests: data, error: err } = await fetchApprovalRequests()
    setError(err)
    setRequests(data)
    setLoading(false)
    return data
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  const pending = requests.filter((r) => r.status === 'pendiente')

  return { requests, pending, loading, error, refetch }
}
