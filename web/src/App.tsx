import React from 'react'

export default function App(){
  const [apiReply, setApiReply] = React.useState<string>('(klik knappen for at kalde backend)')

  async function ping(){
    const r = await fetch('http://localhost:8787/health')
    const j = await r.json()
    setApiReply(JSON.stringify(j))
  }

  return (
    <div style={{padding:20, fontFamily:'system-ui, sans-serif'}}>
      <h1>Replit Speak (minimal)</h1>
      <p>Backend status: <code>{apiReply}</code></p>
      <button onClick={ping} style={{padding:'8px 12px'}}>Ping backend</button>
    </div>
  )
}