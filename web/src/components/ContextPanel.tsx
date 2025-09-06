import React from 'react'
type Uploaded = { filename:string; url:string; mimetype:string; size:number; text?:string }

export default function ContextPanel({ projectId, onApply }:{ projectId:string; onApply:(s:string)=>void }){
  const [files, setFiles] = React.useState<Uploaded[]>([])
  const [pending, setPending] = React.useState<FileList | null>(null)
  const [contextText, setContextText] = React.useState('')

  async function doUpload(){
    if (!pending || pending.length===0) return
    const fd = new FormData()
    Array.from(pending).forEach(f => fd.append('files', f))
    const r = await fetch(`http://localhost:8787/upload?project=${projectId}`, { method:'POST', body: fd })
    if (!r.ok) { alert('Upload failed'); return }
    const j = await r.json()
    const arr: Uploaded[] = j.files || []
    setFiles(prev => [...prev, ...arr])
    const texts = arr.map(x => x.text).filter(Boolean) as string[]
    if (texts.length){
      setContextText(v => (v ? (v + '\n\n' + texts.join('\n\n')) : texts.join('\n\n')))
    }
    setPending(null)
  }

  async function refreshUploads(){
    try{
      const r = await fetch(`http://localhost:8787/projects/${projectId}/uploads`)
      if(!r.ok) throw new Error(await r.text())
      const j = await r.json()
      setFiles(j.files||[])
    }catch(e:any){ alert('Refresh failed: '+e.message) }
  }

  return (
    <div style={{padding:10}}>
      <div style={{fontSize:12, color:'#475569', marginBottom:6}}>Project Context</div>

      <div style={{display:'grid', gap:8, marginBottom:10}}>
        <input type="file" multiple onChange={e=>setPending(e.target.files)} />
        <button onClick={doUpload} style={{padding:'6px 10px'}}>Upload files</button>
      </div>

      <div style={{marginBottom:10}}>
        {files.length===0 ? <div style={{fontSize:12, color:'#64748b'}}>(No files yet)</div> :
          files.map((f,i)=>(
            <div key={i} style={{display:'flex', justifyContent:'space-between', gap:8, marginBottom:6}}>
              <a href={f.url} target="_blank" rel="noreferrer">{f.filename}</a>
              <span style={{fontSize:12, color:'#64748b'}}>{f.mimetype} · {Math.round(f.size/1024)} KB</span>
            </div>
          ))
        }
      </div>

      <div style={{fontSize:12, color:'#475569', marginBottom:6}}>Context Preview (editable)</div>
      <textarea
        value={contextText}
        onChange={e=>setContextText(e.target.value)}
        placeholder="Combined text from uploaded files..."
        style={{width:'100%', height:160}}
      />

      <div style={{marginTop:8}}>
        <button onClick={()=>onApply(contextText)} style={{padding:'6px 10px'}}>Apply to Agent</button>
        <button onClick={refreshUploads} style={{padding:'6px 10px', marginLeft:8}}>Refresh</button>
      </div>
    </div>
  )
}