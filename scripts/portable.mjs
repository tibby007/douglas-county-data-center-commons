import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const directory = resolve('dist/portable')
let html = await readFile(resolve(directory, 'index.html'), 'utf8')
const script = html.match(/<script type="module" crossorigin src="(\.\/assets\/[^"]+\.js)"><\/script>/)
const stylesheet = html.match(/<link rel="stylesheet" crossorigin href="(\.\/assets\/[^"]+\.css)">/)
if (!script || !stylesheet) throw new Error('Expected one Vite script and one stylesheet.')

const [js, css] = await Promise.all([script, stylesheet].map(match => readFile(resolve(directory, match[1]), 'utf8')))
const noticeDirectory = 'docs/dependency-notices'
const files = await readdir(noticeDirectory)
const notices = await Promise.all(files.map(async name => name + '\n' + await readFile(resolve(noticeDirectory, name), 'utf8')))
html = html.replace(script[0], () => '<script type="module">' + js.replace(/<\/script/gi, '<\\/script') + '</script>')
html = html.replace(stylesheet[0], () => '<style>' + css + '</style>')
html += '\n<!-- Bundled dependency notices\n' + notices.join('\n\n').replaceAll('-->', '-- >') + '\n-->\n'
await writeFile(resolve('dist', 'douglas-county-commons-demo.html'), html)
