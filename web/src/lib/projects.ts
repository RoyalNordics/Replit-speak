export type Project = { id: string; name: string; createdAt: number }
const KEY = 'replit-speak-projects-v1'
const ACTIVE_KEY = 'replit-speak-active-project-v1'

function load(): Project[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
function save(list: Project[]) { localStorage.setItem(KEY, JSON.stringify(list)) }
function uid(){ return Math.random().toString(36).slice(2,10) }

export function listProjects(){ return load() }
export function ensureDefault(){
  let list = load()
  if (list.length === 0) {
    list = [{ id: uid(), name: 'Default Project', createdAt: Date.now() }]
    save(list); localStorage.setItem(ACTIVE_KEY, list[0].id)
  }
  if (!localStorage.getItem(ACTIVE_KEY)) localStorage.setItem(ACTIVE_KEY, list[0].id)
}
export function createProject(name: string){
  const list = load()
  const p = { id: uid(), name: name || `Project ${list.length+1}`, createdAt: Date.now() }
  list.push(p); save(list)
  localStorage.setItem(ACTIVE_KEY, p.id)
  return p
}
export function deleteProject(id: string){
  const list = load().filter(p => p.id !== id)
  save(list)
  const active = localStorage.getItem(ACTIVE_KEY)
  if (active === id) {
    if (list[0]) localStorage.setItem(ACTIVE_KEY, list[0].id)
    else localStorage.removeItem(ACTIVE_KEY)
  }
}
export function getActiveProjectId(){ return localStorage.getItem(ACTIVE_KEY) || '' }
export function setActiveProjectId(id: string){ localStorage.setItem(ACTIVE_KEY, id) }