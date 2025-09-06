import React from 'react'
import type { ChatMsg } from '../lib/chat'
import DiffApplyDialog from './DiffApplyDialog'

export default function ChatPanel({ projectId, messages, onSend }:{ projectId:string; messages:ChatMsg[]; onSend:(t:string)=>void }){
  const [text, setText] = React.useState('')
  const ref = React.useRef<HTMLDivElement>(null)
  const [diffText, setDiffText] = React.useState<string|null>(null)

  React.useEffect(()=>{ if(ref.current) ref.current.scrollTop = ref.current.scrollHeight }, [messages])

  function send(){ const t = text.trim(); if(!t) return; onSend(t); setText('') }

  function extractDiffBlocks(s:string){
    const blocks:string[] = []
    const regex = /```diff\\s*([\\s\\S]*?)```/g
    let m
    while((m = regex.exec(s))!==null){ blocks.push(m[1].trim()) }
    return blocks
  }

  return (
    <div style={{display:'grid', gridTemplateRows:'1fr auto', height:'100%'}}>
      <div ref={ref} style={{overflow:'auto', padding:10, border:'1px solid #e5e7eb', borderRadius:8, background:'#fff'}}>
        {messages.length===0 ? <div style={{fontSize:12, color:'#64748b'}}>(No messages)</div> :
          messages.map(m => (
            <div key={m.id} style={{margin:'8px 0'}}>
              <div style={{fontSize:12, color:'#475569'}}>{m.role}</div>
              <div>{m.text}</div>
              {m.role==='assistant' && extractDiffBlocks(m.text).map((d,i)=>(
                <button key={i} onClick={()=>setDiffText(d)} style={{marginTop:4, padding:'4px 8px'}}>Apply this diff</button>
              ))}
            </div>
          ))
        }
      </div>
      <div style={{display:'flex', gap:8, marginTop:8}}>
        <input value={text} onChange={e=>setText(e.target.value)} placeholder="Type message..." style={{flex:1, padding:'6px 8px'}}/>
        <button onClick={send} style={{padding:'6px 12px'}}>Send</button>
      </div>
      {diffText && <DiffApplyDialog projectId={projectId} initialText={diffText} onClose={()=>setDiffText(null)} onApplied={(chs)=>{ alert('Applied: '+chs.join(', ')); setDiffText(null) }}/>}
    </div>
  )
}