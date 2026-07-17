import { supabase } from './supabase'
import type { OnboardingState } from './types'

const LOCAL_KEY = 'integra_onboarding'

export async function getOnboardingState(): Promise<OnboardingState> {
  const defaultState: OnboardingState = { completed: false, steps: {} }
  if (!supabase) {
    try {
      const raw = localStorage.getItem(LOCAL_KEY)
      return raw ? (JSON.parse(raw) as OnboardingState) : defaultState
    } catch {
      return defaultState
    }
  }
  const { data } = await supabase.from('firm_settings').select('value').eq('key', 'onboarding').maybeSingle()
  return (data?.value as OnboardingState) ?? defaultState
}

export async function saveOnboardingState(state: OnboardingState): Promise<void> {
  if (!supabase) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state))
    return
  }
  await supabase.from('firm_settings').upsert(
    { key: 'onboarding', value: state, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  )
}

export async function refreshOnboardingProgress(counts: {
  hasFirm: boolean
  hasTeam: boolean
  hasClient: boolean
  hasOfficer: boolean
  hasManual: boolean
}): Promise<OnboardingState> {
  const state = await getOnboardingState()
  state.steps = {
    firm_profile: counts.hasFirm,
    team_member: counts.hasTeam,
    first_client: counts.hasClient,
    first_officer: counts.hasOfficer,
    first_manual: counts.hasManual,
  }
  state.completed = Object.values(state.steps).every(Boolean)
  await saveOnboardingState(state)
  return state
}
