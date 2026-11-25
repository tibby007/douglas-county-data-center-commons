import rawIndex from '../data/index.json' with { type: 'json' }

export type ClaimState = 'documented' | 'proposed' | 'not_found' | 'not_researched' | 'conflicting' | 'actual'
type ClaimValue = string | number | string[] | null
export type Source = {
  id: string
  title: string
  listingTitle: string
  issuer: string
  url: string
  listingUrl: string
  documentDate: string
  meetingDate: string | null
  retrievedAt: string
  status: 'draft' | 'final' | 'approved' | 'unknown'
  recordType: string
  reviewState: 'source_matched' | 'needs_review'
  reviewer: string
  reviewDate: string
  ownerReview: 'pending' | 'complete'
  reuseNotes: string
}
export type Claim = {
  id: string
  caseId: string
  field: string
  value: ClaimValue
  unit: string | null
  sourceId: string | null
  locator: string | null
  state: ClaimState
  notes: string
  version: number
}
type TimelineEvent = {
  id: string
  caseId: string
  sourceId: string
  date: string
  kind: 'document' | 'scheduled' | 'documented'
  label: string
  locator: string
}
export type Index = {
  schemaVersion: number
  coverageDate: string
  scope: string
  licenseStatus: string
  thirdPartyExclusions: string
  cases: { id: string }[]
  sources: Source[]
  events: TimelineEvent[]
  claims: Claim[]
  history: { date: string; version: number; claimIds: string[]; note: string }[]
}

export const countyHosts = new Set([
  'douglascountyga.gov',
  'www.douglascountyga.gov',
  'douglascountyga.portal.civicclerk.com',
  'douglascountyga.civicclerk.com',
])

export function safeSourceUrl(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' && countyHosts.has(url.hostname) && !url.username && !url.password && !url.port) {
      return url.href
    }
  } catch {
    return undefined
  }
  return undefined
}

function validDate(date: string) {
  const value = new Date(date)
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(value.getTime()) &&
    value.toISOString().slice(0, 10) === date
}

export function validateIndex(index: Index) {
  const errors: string[] = []
  function checkDate(date: string, label: string) {
    if (!validDate(date)) errors.push(`Invalid date: ${label}`)
  }

  function ids(items: { id: string }[], type: string) {
    const values = new Set(items.map(item => item.id))
    if (values.size !== items.length || values.has('')) errors.push(`Invalid ${type} identifiers`)
    return values
  }

  const caseIds = ids(index.cases, 'case')
  const sourceIds = ids(index.sources, 'source')
  const claimIds = ids(index.claims, 'claim')
  ids(index.events, 'event')
  checkDate(index.coverageDate, 'coverage')
  for (const source of index.sources) {
    if (!safeSourceUrl(source.url) || !safeSourceUrl(source.listingUrl)) errors.push(`Unsupported URL: ${source.id}`)
    checkDate(source.documentDate, source.id)
    if (source.meetingDate !== null) checkDate(source.meetingDate, source.id)
    checkDate(source.retrievedAt, source.id)
    checkDate(source.reviewDate, source.id)
    if (source.retrievedAt > source.reviewDate || source.reviewDate > index.coverageDate) errors.push(`Review chronology: ${source.id}`)
    if (!['draft', 'final', 'approved', 'unknown'].includes(source.status)) errors.push(`Invalid source status: ${source.id}`)
    if (!['source_matched', 'needs_review'].includes(source.reviewState) ||
        !['pending', 'complete'].includes(source.ownerReview) ||
        ![source.title, source.listingTitle, source.issuer, source.reviewer, source.recordType, source.reuseNotes].every(text => text?.trim())) {
      errors.push(`Incomplete source: ${source.id}`)
    }
  }
  const fields = new Set<string>()
  for (const claim of index.claims) {
    const key = `${claim.caseId}:${claim.field}`
    if (fields.has(key) || claim.state === 'conflicting') errors.push(`Conflicting claim requires review: ${key}`)
    fields.add(key)
    if (!caseIds.has(claim.caseId)) errors.push(`Missing case: ${claim.id}`)
    const source = index.sources.find(source => source.id === claim.sourceId)
    if (claim.value !== null) {
      if (!['documented', 'proposed', 'actual'].includes(claim.state)) errors.push(`Unsupported claim state: ${claim.id}`)
      if (!source || source.reviewState !== 'source_matched' || !claim.locator?.trim()) errors.push(`Missing reviewed evidence: ${claim.id}`)
      if (claim.state === 'actual' && (!source || !['final', 'approved'].includes(source.status))) errors.push(`Actual value requires authoritative evidence: ${claim.id}`)
    } else if (!['not_found', 'not_researched', 'conflicting'].includes(claim.state) || !claim.notes.trim() || claim.unit !== null) {
      errors.push(`Unknown value requires a reason: ${claim.id}`)
    }
    if (!index.history.some(entry => entry.version === claim.version && entry.claimIds.includes(claim.id))) errors.push(`Missing claim history: ${claim.id}`)
  }
  for (const event of index.events) {
    checkDate(event.date, event.id)
    if (!caseIds.has(event.caseId) || !sourceIds.has(event.sourceId) || !event.locator.trim()) errors.push(`Missing event evidence: ${event.id}`)
    const source = index.sources.find(source => source.id === event.sourceId)
    if (event.kind === 'scheduled' && event.date !== source?.meetingDate) errors.push(`Scheduled date differs from source: ${event.id}`)
    if (event.kind === 'document' && event.date !== source?.documentDate) errors.push(`Document date differs from source: ${event.id}`)
    if (event.kind === 'documented' && source?.status === 'draft') errors.push(`Draft cannot establish event occurrence: ${event.id}`)
  }
  for (const entry of index.history) {
    checkDate(entry.date, 'history')
    if (!entry.note.trim() || entry.claimIds.some(id => !claimIds.has(id))) errors.push('Invalid history entry')
  }
  return errors
}

export const index = rawIndex as Index

export function claimsFor(record: Index['cases'][number]) {
  return Object.fromEntries(index.claims.filter(claim => claim.caseId === record.id).map(claim => [claim.field, claim]))
}

export function indexRows(data: Index) {
  return data.claims.map(claim => {
    const source = data.sources.find(source => source.id === claim.sourceId)
    return {
      coverage_date: data.coverageDate,
      claim_id: claim.id,
      case_id: claim.caseId,
      field: claim.field,
      value: claim.value,
      unit: claim.unit,
      claim_state: claim.state,
      claim_version: claim.version,
      locator: claim.locator,
      source_url: source?.url ?? null,
      source_title: source?.title ?? null,
      issuing_body: source?.issuer ?? null,
      document_date: source?.documentDate ?? null,
      meeting_date: source?.meetingDate ?? null,
      retrieved_at: source?.retrievedAt ?? null,
      source_status: source?.status ?? null,
      review_state: source?.reviewState ?? null,
      reviewer: source?.reviewer ?? null,
      review_date: source?.reviewDate ?? null,
      owner_review: source?.ownerReview ?? null,
      notes: claim.notes,
      source_reuse: source?.reuseNotes ?? null,
      index_license: data.licenseStatus,
      third_party_exclusions: data.thirdPartyExclusions,
    }
  })
}

export function csvCell(value: ClaimValue) {
  let text = Array.isArray(value) ? value.join(' | ') : String(value ?? '')
  if (/^[\s\p{Cf}]*[=+\-@]|^[\t\r\n]/u.test(text)) text = "'" + text
  return '"' + text.replaceAll('"', '""') + '"'
}

export function makeCsv(data: Index) {
  const rows = indexRows(data)
  if (!rows.length) return ''
  return [Object.keys(rows[0]).map(csvCell).join(','), ...rows.map(row => Object.values(row).map(csvCell).join(','))].join('\r\n') + '\r\n'
}

export function makeJson(data: Index) {
  return JSON.stringify({ ...data, claimRows: indexRows(data) }, null, 2) + '\n'
}
