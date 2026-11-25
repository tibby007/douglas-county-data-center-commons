import assert from 'node:assert/strict'
import { test } from 'node:test'
import { index, validateIndex, safeSourceUrl, csvCell, makeCsv, makeJson } from '../src/index-data.ts'

test('the live index is valid and preserves the draft scope and both dates', () => {
  assert.deepEqual(validateIndex(index), [])
  assert.equal(index.cases.length, 1)
  assert.equal(index.sources.length, 1)
  assert.equal(index.sources[0].status, 'draft')
  assert.equal(index.sources[0].documentDate, '2026-06-02')
  assert.equal(index.sources[0].meetingDate, '2026-07-07')
  assert.deepEqual(index.events.map(event => event.kind), ['document', 'scheduled'])
  for (const field of ['decision', 'permits', 'resourceUse']) {
    const claim = index.claims.find(claim => claim.field === field)
    assert.equal(claim?.value, null)
  }
})

test('invalid dates, unsafe links and conflicting claims are rejected', () => {
  const fixture = structuredClone(index)
  fixture.sources[0].meetingDate = '2026-02-30'
  fixture.sources[0].url = 'javascript:alert(1)'
  fixture.claims.push({ ...fixture.claims[0], id: 'synthetic-conflict', value: 'Conflicting applicant' })
  assert.match(validateIndex(fixture).join('\n'), /Invalid date/)
  assert.match(validateIndex(fixture).join('\n'), /Unsupported URL/)
  assert.match(validateIndex(fixture).join('\n'), /Conflicting claim/)
  for (const link of ['#', 'data:text/html,sample', 'http://douglascountyga.gov/', 'https://douglascountyga.gov.example.org/', 'https://person@douglascountyga.gov/']) {
    assert.equal(safeSourceUrl(link), undefined)
  }
})

test('valid evidence is required and a draft cannot establish a measured actual value or meeting occurrence', () => {
  const fixture = structuredClone(index)
  fixture.claims[0].locator = null
  fixture.claims[1].state = 'actual'
  fixture.events[1].kind = 'documented'
  const errors = validateIndex(fixture).join('\n')
  assert.match(errors, /Missing reviewed evidence/)
  assert.match(errors, /Actual value requires authoritative evidence/)
  assert.match(errors, /Draft cannot establish event occurrence/)
})

test('CSV protects formula prefixes and quotes delimiters and newlines', () => {
  for (const text of ['=1+2', '+1', '-1', '@SUM(A1)', '  =1', '\tmalicious', '\uFEFF=5', '\n=1']) {
    assert.equal(csvCell(text), '"\'' + text + '"')
  }
  assert.equal(csvCell('Douglas, "Georgia"'), '"Douglas, ""Georgia"""')
  assert.equal(csvCell(null), '""')
})

test('both exports include coverage, original sources, review and reuse details', () => {
  const csv = makeCsv(index)
  const output = JSON.parse(makeJson(index))
  for (const expected of ['coverage_date', '2026-11-23', index.sources[0].url, 'owner_review', 'third_party_exclusions', 'Link only']) {
    assert.ok(csv.includes(expected), expected)
  }
  assert.equal(output.coverageDate, index.coverageDate)
  assert.equal(output.claimRows[0].source_url, index.sources[0].url)
  assert.ok(output.claimRows.every(row => row.index_license && row.third_party_exclusions))
  assert.equal(output.claimRows.find(row => row.field === 'resourceUse').value, null)
})
