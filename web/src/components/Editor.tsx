import React from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import * as FS from '../lib/files'

export default function Editor({ path }:{ path:string }){
  const [code, setCode] = React.useState(FS.read(path))
  React.useEffect(()=> setCode(FS.read(path)), [path])

  function save(){ FS.write(path, code) }

  return (
    <div style={{height:'100%', display:'grid', gridTemplateRows:'auto 1fr'}}>
      <div style={{display:'flex', alignItems:'center', gap:8, padding:8, borderBottom:'1px solid #e5e7eb', background:'white'}}>
        <div style={{fontSize:12, color:'#475569', flex:1}}>Editing: {path}</div>
        <button onClick={save} style={{padding:'6px 10px'}}>Save</button>
      </div>
      <CodeMirror
        value={code}
        height="100%"
        extensions={[javascript({ jsx: true, typescript: true })]}
        onChange={(v)=>setCode(v)}
      />
    </div>
  )
}