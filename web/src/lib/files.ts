export type FileMap = Record<string,string>
const KEY = (pid:string) => `replit-speak-files-${pid}`

export function list(projectId: string): string[] { return Object.keys(load(projectId)).sort() }
export function read(projectId: string, path: string): string { return load(projectId)[path] ?? '' }
export function write(projectId: string, path: string, content: string){ const f = load(projectId); f[path] = content; save(projectId, f) }
export function remove(projectId: string, path: string){ const f = load(projectId); delete f[path]; save(projectId, f) }
export function exists(projectId: string, path: string){ return Object.prototype.hasOwnProperty.call(load(projectId), path) }
export function snapshot(projectId: string): FileMap { return load(projectId) }

function load(projectId: string): FileMap { try { return JSON.parse(localStorage.getItem(KEY(projectId)) || '{}') } catch { return {} } }
function save(projectId: string, files: FileMap){ localStorage.setItem(KEY(projectId), JSON.stringify(files)) }

export function seedIfEmpty(projectId: string){
  const f = load(projectId)
  if (Object.keys(f).length === 0) {
    f['index.js'] = `console.log("Hello from ${projectId}")\n`
    save(projectId, f)
  }
}