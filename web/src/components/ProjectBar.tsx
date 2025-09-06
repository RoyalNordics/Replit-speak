import React from 'react'
import { listProjects, createProject, deleteProject, getActiveProjectId, setActiveProjectId, ensureDefault } from '../lib/projects'

export default function ProjectBar({ onChange }:{ onChange:(id:string)=>void }){
  const [list, setList] = React.useState(()=>{ ensureDefault(); return listProjects() })
  const [active, setActive] = React.useState(getActiveProjectId())
  const [name, setName] = React.useState('')

  function refresh(){
    const l = listProjects()
    setList(l)
    const a = getActiveProjectId()
    setActive(a)
    onChange(a)
  }

  return (
    <div style={{display:'flex', gap:8, alignItems:'center', padding:'8px 12px', borderBottom:'1px solid #e5e7eb', background:'white'}}>
      <strong style={{marginRight:8}}>Project:</strong>
      <select value={active} onChange={e=>{ setActive(e.target.value); setActiveProjectId(e.target.value); onChange(e.target.value) }}>
        {list.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="New project name" style={{padding:'6px 8px'}}/>
      <button onClick={()=>{ createProject(name.trim()); setName(''); refresh() }}>Add</button>
      <button onClick={()=>{ if(!active) return; if(!confirm('Delete current project incl. local data?')) return; deleteProject(active); refresh() }}>Delete</button>
    </div>
  )
}