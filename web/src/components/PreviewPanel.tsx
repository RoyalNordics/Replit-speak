import React from 'react'
import * as FS from '../lib/files'
import { normalizePreviewUrl, isValidHttpUrl } from '../lib/url'

type Props = { projectId:string }

export default function PreviewPanel({ projectId }:Props){
  const [preview, setPreview] = React.useState<{id:string;url:string}|null>(null)
  const [busy, setBusy] = React.useState(false)

  async function startPreview(){
    if (!projectId) return
    setBusy(true)
    const files = FS.snapshot(projectId)
    if(!('index.html' in files)){ alert('Tilføj en index.html i projektet for preview'); setBusy(false); return }
    try{
      const r = await fetch('http://localhost:8787/preview/start',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ files })
      })
      if(!r.ok) throw new Error(await r.text())
      const j = await r.json()
      setPreview(j)
    }catch(e:any){ alert('Preview failed: '+e.message) }
    setBusy(false)
  }

  async function stopPreview(){
    if(!preview) return
    try{
      await fetch('http://localhost:8787/preview/'+preview.id,{method:'DELETE'})
    }catch{}
    setPreview(null)
  }

  return (
    <div style={{padding:10}}>
      <h3>Live Preview</h3>
      {preview ? (
        <div>
          <div>URL: <a href={preview.url} target="_blank" rel="noreferrer">{preview.url}</a></div>
          <button onClick={stopPreview} disabled={busy} style={{padding:'6px 10px', marginTop:8}}>Stop Preview</button>
        </div>
      ):(
        <button onClick={startPreview} disabled={busy} style={{padding:'6px 10px'}}>Start Preview</button>
      )}
    </div>
  )
}