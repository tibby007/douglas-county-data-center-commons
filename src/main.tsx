import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, ChevronDown,
  CircleHelp, Download, FileText, Layers3, MapPin, Search, X,
} from 'lucide-react'
import { claimsFor, index, makeCsv, makeJson, safeSourceUrl, type Source } from './index-data.ts'
import './style.css'

const source = index.sources[0]
const boardUrl = safeSourceUrl(source.listingUrl)
const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' })
const dateLabel = (date: string) => dateFormat.format(new Date(date + 'T00:00:00Z'))
const date = (value: string) => <time dateTime={value}>{dateLabel(value)}</time>
const blankFilters = { query: '', type: '', jurisdiction: '', review: '' }

function download(format: 'csv' | 'json') {
  const data = format === 'csv' ? makeCsv(index) : makeJson(index)
  const url = URL.createObjectURL(new Blob([data], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `douglas-county-index-${index.coverageDate}.${format}`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function EvidenceDialog({ evidence, locator, close }: { evidence: Source; locator: string; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const focused = document.activeElement as HTMLElement | null
    const dialog = ref.current
    dialog?.showModal()
    return () => {
      dialog?.close()
      focused?.focus()
    }
  }, [])
  const url = safeSourceUrl(evidence.url)
  return <dialog className="evidence-dialog" ref={ref} aria-labelledby="evidence-title"
    onCancel={event => { event.preventDefault(); close() }}>
    <div className="dialog-inner">
      <div className="dialog-top">
        <span className="eyebrow"><FileText size={16} /> Source evidence</span>
        <button type="button" className="icon-button" aria-label="Close evidence" onClick={close}><X size={22} /></button>
      </div>
      <span className="badge">{evidence.status}</span>
      <h2 id="evidence-title">{evidence.listingTitle}</h2>
      <dl className="source-fields">
        <div><dt>Original title</dt><dd>{evidence.title}</dd></div>
        <div><dt>Issuing body</dt><dd>{evidence.issuer}</dd></div>
        <div><dt>Locator</dt><dd>{locator}</dd></div>
        <div><dt>Document date</dt><dd>{date(evidence.documentDate)}</dd></div>
        <div><dt>Meeting date listed</dt><dd>{evidence.meetingDate ? date(evidence.meetingDate) : 'Unavailable'}</dd></div>
        <div><dt>Retrieved</dt><dd>{date(evidence.retrievedAt)}</dd></div>
        <div><dt>Review</dt><dd>{evidence.reviewState === 'source_matched' ? 'Source matched' : 'Needs review'}. {evidence.reviewer}, {date(evidence.reviewDate)}. Owner review {evidence.ownerReview}.</dd></div>
        <div><dt>Reuse</dt><dd>{evidence.reuseNotes}</dd></div>
        <div><dt>Exact source URL</dt><dd>{url && <a className="break-link" href={url} target="_blank" rel="noreferrer">{url}</a>}</dd></div>
      </dl>
      {url && <a className="button dark" href={url + '#page=1'} target="_blank" rel="noreferrer">Open original PDF <ArrowUpRight size={17} /></a>}
    </div>
  </dialog>
}

function DownloadCard() {
  return <section className="side-card download-card" id="data">
    <div className="side-icon"><Download size={19} /></div>
    <h2>Take the data with you</h2>
    <p>Download the factual index with source links, dates, and reuse notes.</p>
    <div className="download-buttons">
      <button className="button outline" onClick={() => download('csv')}><ArrowDown size={16} /> CSV</button>
      <button className="button outline" onClick={() => download('json')}><ArrowDown size={16} /> JSON</button>
    </div>
    <p className="small">Index license pending approval. County documents and other third-party material are excluded.</p>
  </section>
}

function ScopeCard() {
  return <section className="side-card scope-card">
    <div className="side-icon"><Layers3 size={19} /></div>
    <h2>Pilot coverage</h2>
    <p>One planning case from one draft county agenda, reviewed {date(index.coverageDate)}.</p>
    <a className="text-link" href="#method">How we review records <ArrowRight size={16} /></a>
  </section>
}

function Browse() {
  const [filter, setFilter] = useState(blankFilters)
  const set = (field: keyof typeof filter, value: string) => setFilter(current => ({ ...current, [field]: value }))
  const records = index.cases.filter(record => {
    const claims = claimsFor(record)
    const evidence = index.sources.find(item => item.id === claims.listing.sourceId)!
    const searchText = [claims.applicant.value, claims.identifiers.value, claims.location.value].flat().join(' ').toLowerCase()
    return searchText.includes(filter.query.trim().toLowerCase()) &&
      (!filter.type || filter.type === evidence.recordType) &&
      (!filter.jurisdiction || filter.jurisdiction === claims.jurisdiction.value) &&
      (!filter.review || filter.review === evidence.reviewState)
  })
  const filtersActive = Object.values(filter).some(Boolean)
  return <>
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow hero-label"><span className="status-dot" /> Douglas County, Georgia</div>
        <h1 tabIndex={-1}>Data Center<br />Commons<span>.</span></h1>
        <p>Explore public records about local data center proposals. See what the documents say and what’s still unknown.</p>
      </div>
      <div className="hero-image">
        <span>Illustrative landscape</span>
      </div>
    </section>
    <div className="page-grid browse-grid">
      <section className="results" aria-labelledby="records-title">
        <div className="section-header">
          <h2 id="records-title">Browse records</h2>
          <span className="pilot-label"><span className="status-dot" /> Pilot index</span>
        </div>
        <div className="filters">
          <label className="search-field">
            <span className="sr-only">Search records</span><Search size={20} />
            <input type="search" placeholder="Search by project or case ID" value={filter.query} onChange={event => set('query', event.target.value)} />
          </label>
          <div className="selects">
            <Filter label="Record type" value={filter.type} change={value => set('type', value)} options={[[source.recordType, source.recordType]]} />
            <Filter label="Jurisdiction" value={filter.jurisdiction} change={value => set('jurisdiction', value)} options={[[String(claimsFor(index.cases[0]).jurisdiction.value), 'Douglas County, Georgia']]} />
            <Filter label="Verification" value={filter.review} change={value => set('review', value)} options={[[ 'source_matched', 'Source matched' ], ['needs_review', 'Needs review']]} />
          </div>
        </div>
        <div className="results-meta">
          <p role="status">{records.length} {records.length === 1 ? 'record' : 'records'}</p>
          {filtersActive && <button className="text-link" onClick={() => setFilter(blankFilters)}>Clear filters <X size={15} /></button>}
        </div>
        {records.map(record => {
          const claims = claimsFor(record)
          return <article className="record-card" key={record.id}>
            <div className="record-top">
              <span className="record-type"><FileText size={17} /> {source.recordType}</span>
              <span className="badge"><span className="status-dot" /> {claims.listing.value}</span>
            </div>
            <h3><a href={`#case/${record.id}`}>{claims.applicant.value}</a></h3>
            <p className="proposal">{claims.proposal.value} proposal</p>
            <div className="record-meta"><span><MapPin size={17} /> {claims.location.value}</span><span><CalendarDays size={16} /> Draft meeting date · {date(source.meetingDate!)}</span></div>
            <div className="record-bottom">
              <div className="tags">{(claims.identifiers.value as string[]).map(id => <span key={id}>{id}</span>)}</div>
              <a className="text-link" href={`#case/${record.id}`}>View case <ArrowRight size={17} /></a>
            </div>
          </article>
        })}
        {!records.length && <div className="empty"><Search size={23} /><h3>No matching records</h3><p>Try a different search or clear the filters.</p></div>}
      </section>
      <aside className="side-stack" aria-label="Pilot coverage and downloads"><ScopeCard /><DownloadCard /></aside>
    </div>
  </>
}

function Filter({ label, value, change, options }: { label: string; value: string; change: (value: string) => void; options: string[][] }) {
  return <label className="select-wrap">
    <span className="sr-only">{label}</span>
    <select value={value} onChange={event => change(event.target.value)}>
      <option value="">{label}</option>
      {options.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
    </select>
    <ChevronDown size={16} />
  </label>
}

function CaseDetail({ record, openEvidence }: { record: typeof index.cases[number]; openEvidence: (locator: string) => void }) {
  const claims = claimsFor(record)
  const events = index.events.filter(event => event.caseId === record.id)
  const cite = (locator: string) => <button className="citation" onClick={() => openEvidence(locator)}>Source <ArrowUpRight size={12} aria-hidden="true" /><span className="sr-only">, open evidence for {locator}</span></button>
  return <>
    <a className="text-link back" href="#records"><ArrowLeft size={17} /> Browse records</a>
    <div className="case-head">
      <div className="case-status"><span className="badge"><span className="status-dot" /> {claims.listing.value}</span><span>Outcome unverified</span></div>
      <h1 tabIndex={-1}>{claims.applicant.value}</h1>
      <p>{claims.proposal.value} proposal {cite(claims.proposal.locator!)}</p>
      <div className="tags">{(claims.identifiers.value as string[]).map(id => <span key={id}>{id}</span>)}{cite(claims.identifiers.locator!)}</div>
    </div>
    <div className="page-grid detail-grid">
      <div className="case-sections">
        <section className="panel">
          <h2>What the draft says</h2>
          <p>The draft agenda lists three requests for this proposal. {cite(claims.requests.locator!)}</p>
          <ul>{(claims.requests.value as string[]).map(request => <li key={request}>{request}</li>)}</ul>
          <dl className="source-fields">
            <div><dt>Location in the agenda</dt><dd>{claims.location.value} {cite(claims.location.locator!)}</dd></div>
            <div><dt>Planning record jurisdiction</dt><dd>{claims.jurisdiction.value} {cite(claims.jurisdiction.locator!)}<p className="small">{claims.jurisdiction.notes}</p></dd></div>
          </dl>
        </section>
        <section className="panel">
          <h2>Documented timeline</h2>
          <ol className="timeline">
            {events.map(event => <li key={event.id}>
              <div className="date-label">{date(event.date)}</div><div><strong>{event.label}</strong> {cite(event.locator)}</div>
            </li>)}
          </ol>
          <p className="small">The draft gives a scheduled meeting date. Whether the meeting took place as listed remains unverified.</p>
        </section>
      </div>
      <aside className="side-stack" aria-label="Evidence and gaps">
        <section className="side-card scope-card">
          <div className="side-icon"><FileText size={19} /></div>
          <h2>Primary source</h2><p>{source.listingTitle}<br />{source.issuer}</p>
          <button className="text-link" onClick={() => openEvidence(claims.listing.locator!)}>View evidence <ArrowRight size={16} /></button>
        </section>
        <section className="side-card unknown-card">
          <div className="side-icon"><CircleHelp size={19} /></div>
          <h2>What’s unknown</h2>
          <dl>
            <div><dt>Final decision · Unverified</dt><dd>{claims.decision.notes} {cite(claims.decision.locator!)}</dd></div>
            <div><dt>Issued permits · Unknown</dt><dd>{claims.permits.notes} {cite(claims.requests.locator!)}</dd></div>
            <div><dt>Measured resource use · Unknown</dt><dd>{claims.resourceUse.notes}</dd></div>
          </dl>
          <p className="small">Unknown values are left blank. They provide no basis for inferring zero use or misconduct.</p>
        </section>
        <DownloadCard />
      </aside>
    </div>
  </>
}

function Method() {
  return <div className="reading-page">
    <a className="text-link back" href="#records"><ArrowLeft size={17} /> Browse records</a>
    <span className="eyebrow">About the project</span>
    <h1 tabIndex={-1}>Method &amp; coverage</h1>
    <p className="intro">Douglas County Data Center Commons is an independent community project. Official records remain with their issuing agencies.</p>
    <section className="panel">
      <h2>What this pilot covers</h2>
      <p>The index covers one case from one draft zoning agenda as of {date(index.coverageDate)}. The evidence view links each claim to its source and page or agenda item. Parcel boundaries and parcel-level authority are outside this review.</p>
      {boardUrl && <a className="text-link" href={boardUrl} target="_blank" rel="noreferrer">County Planning &amp; Zoning Board <ArrowUpRight size={16} /></a>}
    </section>
    <section className="panel">
      <h2>How to read the labels</h2>
      <dl className="method-definitions">
        <dt>Draft</dt><dd>The issuer labels the agenda a draft. A listing establishes that an item appeared in the draft.</dd>
        <dt>Source matched</dt><dd>Codex compared the entry with the accessible source text on {date(source.reviewDate)}. Project-owner review is pending.</dd>
        <dt>Proposed</dt><dd>The document describes a request or forecast. The requested outcome remains unverified.</dd>
        <dt>Unknown</dt><dd>Information was either absent from the source reviewed or has yet to be researched. The index records which applies.</dd>
      </dl>
    </section>
    <section className="panel">
      <h2>Corrections &amp; reuse</h2>
      <p>To prepare a correction, note the case ID, the field, an official source URL and its page or item. The repository’s contribution guide explains review and how corrections are recorded. This demo collects no submissions.</p>
      <p>Downloads contain the project’s factual index and provenance. The proposed index license awaits owner approval. County PDFs and other third-party material stay with their issuers.</p>
    </section>
  </div>
}

function App() {
  const [route, setRoute] = useState(location.hash)
  const [locator, setLocator] = useState<string>()
  const previousRoute = useRef(route)
  useEffect(() => {
    const onHashChange = () => setRoute(location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  const record = index.cases.find(item => route === `#case/${item.id}`)
  const isMethod = route === '#method'
  const isDownload = route === '#download'
  useLayoutEffect(() => {
    const target = isDownload ? document.querySelector<HTMLElement>('#downloads-title') : document.querySelector<HTMLElement>('h1')
    if (previousRoute.current !== route || isDownload) {
      if (route === '#main') return
      window.scrollTo(0, 0)
      if (previousRoute.current !== route) target?.focus({ preventScroll: true })
      previousRoute.current = route
    }
  }, [route, isDownload])
  return <>
    <a className="skip" href="#main" onClick={event => {
      event.preventDefault()
      document.getElementById('main')?.focus()
    }}>Skip to content</a>
    <header className="site-header">
      <div className="shell header-inner">
        <a className="brand" href="#records">
          <span className="brand-icon"><Layers3 size={22} aria-hidden="true" /></span>
          <span><strong>Data Center Commons</strong><small>Douglas County, GA</small></span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#records" aria-current={!isMethod && !isDownload ? 'page' : undefined}>Records</a>
          <a href="#method" aria-current={isMethod ? 'page' : undefined}>Method</a>
          <a href="#download" aria-current={isDownload ? 'page' : undefined}><Download size={16} /> Data</a>
        </nav>
      </div>
    </header>
    <main className="shell main" id="main" tabIndex={-1}>
      {record ? <CaseDetail record={record} openEvidence={setLocator} /> : isMethod ? <Method /> : isDownload ?
        <div className="reading-page"><a className="text-link back" href="#records"><ArrowLeft size={17} /> Browse records</a>
          <h1 id="downloads-title" tabIndex={-1}>Download the index</h1>
          <p className="intro">One planning case, one draft source. Coverage as of {date(index.coverageDate)}.</p><DownloadCard /></div> : <Browse />}
    </main>
    <footer className="shell footer">
      <span>Independent community project · Douglas County, Georgia</span>
      <a className="text-link" href="#method">About this pilot <ArrowUpRight size={15} /></a>
    </footer>
    {locator && <EvidenceDialog evidence={source} locator={locator} close={() => setLocator(undefined)} />}
  </>
}

createRoot(document.getElementById('root')!).render(<App />)
