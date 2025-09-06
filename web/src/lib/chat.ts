export type ChatMsg = { id:string; role:'user'|'assistant'|'system'; text:string; at:number; type?: "text"|"file-ref" }
const KEY = (pid:string) => `replit-speak-chat-${pid}`

function uid(){ return Math.random().toString(36).slice(2,10) }

export function loadChat(pid:string): ChatMsg[] { try { return JSON.parse(localStorage.getItem(KEY(pid)) || '[]') } catch { return [] } }
export function saveChat(pid:string, list: ChatMsg[]){ localStorage.setItem(KEY(pid), JSON.stringify(list)) }
export function appendUser(pid:string, text:string){
  const l=loadChat(pid)
  const type = text.startsWith("[FileReference]") ? "file-ref" : "text"
  l.push({id:uid(),role:'user',text,at:Date.now(),type})
  saveChat(pid,l)
}
export function appendAssistant(pid:string, text:string){ const l=loadChat(pid); l.push({id:uid(),role:'assistant',text,at:Date.now()}); saveChat(pid,l) }
export function clearChat(pid:string){ saveChat(pid, []) }

export async function sendToServer(message: string) {
  try {
    const res = await fetch("http://localhost:8787/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error("Server error " + res.status);
    const data = await res.json();
    return data;
  } catch (err) {
    return { error: String(err) };
  }
}