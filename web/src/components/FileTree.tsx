import React from 'react'
import * as FS from '../lib/files'

export default function FileTree({ projectId, onSelect }:{ projectId:string; onSelect:(p:string)=>void }){
  const [paths, setPaths] = React.useState(FS.list(projectId))
  const [newPath, setNewPath] = React.useState('')

  function refresh(){ setPaths(FS.list(projectId)) }

  return (
    <div style={{padding:10}}>
      <div style={{fontSize:12, color:'#475569', marginBottom:6}}>Files</div>
      <div>
        {paths.map(p =>
          <div key={p} style={{display:'flex', justifyContent:'space-between', marginBottom:6, gap:8}}>
            <a href="#" onClick={(e)=>{e.preventDefault(); onSelect(p)}}>{p}</a>
            <button onClick={()=>{ FS.remove(projectId,p); refresh() }} style={{padding:'4px 8px'}}>Delete</button>
          </div>
        )}
      </div>
      <div style={{display:'flex', gap:8, marginTop:8}}>
        <input
          placeholder="new-file.js"
          value={newPath}
          onChange={e=>setNewPath(e.target.value)}
          style={{flex:1, padding:'6px 8px'}}
        />
        <button onClick={()=>{
          const p = newPath.trim(); if(!p) return
          if (!/\.(js|mjs|cjs|ts|tsx)$/.test(p)) { alert('Use .js/.ts file extension'); return }
          if (FS.exists(projectId,p)) { alert('File exists'); return }
          FS.write(projectId,p, '')
          setNewPath(''); refresh(); onSelect(p)
        }}>Add</button>
      </div>
    </div>
  )
}