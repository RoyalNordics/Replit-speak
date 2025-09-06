import React from 'react'

type Profile = { id:string; name:string; model:string }

export default function ApiKeyPanel(){
  const [profiles,setProfiles] = React.useState<Profile[]>([])
  const [active,setActive] = React.useState<string|null>(null)
  const [name,setName] = React.useState('')
  const [key,setKey] = React.useState('')
  const [model,setModel] = React.useState('gpt-5-realtime')

  async function refresh(){
    try{
      const r = await fetch('http://localhost:8787/config/profiles')
      const j = await r.json()
      setProfiles(j.profiles||[])
      setActive(j.active||null)
    }catch(e){ console.error(e) }
  }
  React.useEffect(()=>{ refresh() },[])

  async function addProfile(){
    if(!name||!key||!model) return
    const p={id:Math.random().toString(36).slice(2,8), name, key, model}
    try{
      await fetch('http://localhost:8787/config/profiles',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(p)
      })
      setName(''); setKey(''); setModel('gpt-5-realtime')
      refresh()
    }catch(e){ alert('Add failed') }
  }

  async function activate(id:string){
    try{
      await fetch('http://localhost:8787/config/activate/'+id,{method:'POST'})
      refresh()
    }catch(e){ alert('Activate failed') }
  }

  async function remove(id:string){
    try{
      await fetch('http://localhost:8787/config/profiles/'+id,{method:'DELETE'})
      refresh()
    }catch(e){ alert('Delete failed') }
  }

  return (
    <div style={{padding:10, borderBottom:'1px solid #e5e7eb'}}>
      <h3>API Profiles</h3>
      <div>
        Active: {active?profiles.find(p=>p.id===active)?.name+' ('+profiles.find(p=>p.id===active)?.model+')':'None'}
      </div>
      <div style={{marginTop:8}}>
        <select value={active||''} onChange={e=>activate(e.target.value)}>
          <option value=''>-- select active --</option>
          {profiles.map(p=><option key={p.id} value={p.id}>{p.name} ({p.model})</option>)}
        </select>
      </div>
      <ul>
        {profiles.map(p=>(
          <li key={p.id}>
            {p.name} ({p.model}) <button onClick={()=>remove(p.id)}>x</button>
          </li>
        ))}
      </ul>
      <div style={{marginTop:10, display:'grid', gap:6}}>
        <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)}/>
        <input type="password" placeholder="sk-..." value={key} onChange={e=>setKey(e.target.value)}/>
        <input placeholder="Model" value={model} onChange={e=>setModel(e.target.value)}/>
        <button onClick={addProfile}>Add profile</button>
      </div>
    </div>
  )
}