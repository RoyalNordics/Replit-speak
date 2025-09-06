import React from 'react'
import * as FS from '../lib/files'
import { applyUnifiedDiff } from '../lib/diff'

type Props = { projectId:string; initialText?:string; onClose:()=>void; onApplied:(changed:string[])=>void }

export default function DiffApplyDialog({ projectId, initialText='', onClose, onApplied }:Props){
  const [text, setText] = React.useState(initialText)
  const [preview, setPreview] = React.useState<any[]|null>(null)
  const [errors, setErrors] = React.useState<string[]>([])
  const [changed, setChanged] = React.useState<string[]>([])

  function doPreview(){
    const snap = FS.snapshot(projectId)
    const { results } = applyUnifiedDiff(snap, text)
    setPreview(results)
    const errs:string[] = []
    const ch:string[] = []
    results.forEach(r=>{
      if (!r.ok) errs.push(r.path+': '+(r.error||'unknown error'))
      else if(r.before!==r.after) ch.push(r.path)
    })
    setChanged(ch)
    setErrors(errs)
  }

  function doApply(){
    const snap = FS.snapshot(projectId)
    const { results, nextFiles } = applyUnifiedDiff(snap, text)
    const ch:string[] = []
    results.forEach(r=>{
      if (r.ok && r.before!==r.after){
        if (r.after===''){ FS.remove(projectId, r.path) }
        else { FS.write(projectId, r.path, r.after) }
        ch.push(r.path)
      }
    })
    onApplied(ch)
    onClose()
  }

  return (
    <div style={{position:'fixed', top:0,left:0,right:0,bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{background:'#fff', padding:20, width:'80%', maxHeight:'80%', overflow:'auto'}}>
        <h3>Apply Unified Diff</h3>
        <textarea value={text} onChange={e=>setText(e.target.value)} style={{width:'100%', height:120, fontFamily:'monospace'}}/>
        <div style={{marginTop:10, display:'flex', gap:10}}>
          <button onClick={doPreview}>Preview</button>
          {preview && <button onClick={doApply}>Apply</button>}
          <button onClick={onClose}>Cancel</button>
        </div>
        {errors.length>0 && <div style={{color:'red', marginTop:10}}>
          {errors.map((e,i)=><div key={i}>{e}</div>)}
        </div>}
        {preview && <div style={{marginTop:20}}>
          {preview.map((r,i)=>(
            <div key={i} style={{marginBottom:20}}>
              <h4>{r.path} {r.ok ? (r.before!==r.after ? '(modified)' : '(unchanged)') : '(error)'}</h4>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                <pre style={{background:'#f1f5f9', padding:10, overflow:'auto'}}>{r.before}</pre>
                <pre style={{background:'#ecfdf5', padding:10, overflow:'auto'}}>{r.after}</pre>
              </div>
            </div>
          ))}
        </div>}
      </div>
    </div>
  )
}