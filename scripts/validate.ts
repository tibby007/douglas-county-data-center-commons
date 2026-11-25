import { index, validateIndex } from '../src/index-data.ts'

const errors = validateIndex(index)
if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Validated ${index.cases.length} case, ${index.sources.length} source, and ${index.claims.length} claims.`)
}
