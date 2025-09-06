export type ChatMsg = { id:string; role:'user'|'assistant'|'system'; text:string; at:number }
const KEY = (pid:string) => `replit-speak-chat-${pid}`

function uid(){ return Math.random().toString(36).slice(2,10) }

export function loadChat(pid:string): ChatMsg[] { try { return JSON.parse(localStorage.getItem(KEY(pid)) || '[]') } catch { return [] } }
export function saveChat(pid:string, list: ChatMsg[]){ localStorage.setItem(KEY(pid), JSON.stringify(list)) }
export function appendUser(pid:string, text:string){ const l=loadChat(pid); l.push({id:uid(),role:'user',text,at:Date.now()}); saveChat(pid,l) }
export function appendAssistant(pid:string, text:string){ const l=loadChat(pid); l.push({id:uid(),role:'assistant',text,at:Date.now()}); saveChat(pid,l) }
export function clearChat(pid:string){ saveChat(pid, []) }