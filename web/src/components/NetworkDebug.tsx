import React from 'react'

export default function NetworkDebug(){
  const [status,setStatus] = React.useState<any>(null)
  const [last,setLast] = React.useState<any>(null)

  React.useEffect(()=>{
    let cancel=false
    async function tick(){
      try{
        const [a,b] = await Promise.all([
          fetch('http://localhost:8787/config/status').then(r=>r.json()).catch(()=>null),
          fetch('http://localhost:8787/debug/realtime/last').then(r=>r.json()).catch(()=>null)
        ])
        if(!cancel){ setStatus(a); setLast(b?.last ?? null) }
      }catch{}
    }
    tick(); const t = setInterval(tick, 3000)
    return ()=>{ cancel=true; clearInterval(t) }
  },[])

  return (
    <div style={{fontSize:12, padding:8, border:'1px solid #e5e7eb', borderRadius:8, background:'#fff', marginTop:8}}>
      <div><b>Network Debug</b></div>
      <div>Active profile: {status?.hasActiveProfile ? 'YES' : 'NO'}</div>
      <div>Model: {status?.model ?? '—'}</div>
      <div style={{marginTop:6}}>
        <div>Last Realtime Error:</div>
        <pre style={{whiteSpace:'pre-wrap'}}>{ last ? JSON.stringify(last, null, 2) : '(none)' }</pre>
      </div>
    </div>
  )
}