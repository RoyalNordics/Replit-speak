import React from 'react'
import { createRealtime } from './lib/realtime'
import ContextPanel from './components/ContextPanel'
import * as FS from './lib/files'
import FileTree from './components/FileTree'
import Editor from './components/Editor'
import ProjectBar from './components/ProjectBar'
import { ensureDefault, getActiveProjectId } from './lib/projects'
import { seedIfEmpty } from './lib/files'
import ChatPanel from './components/ChatPanel'
import { loadChat, appendUser, appendAssistant } from './lib/chat'
import PreviewPanel from './components/PreviewPanel'
import ApiKeyPanel from './components/ApiKeyPanel'
import { ProjectRunPanel } from './components/ProjectRunPanel'
import NetworkDebug from './components/NetworkDebug'

export default function App(){
  const [projectId, setProjectId] = React.useState<string>(()=>{ ensureDefault(); return getActiveProjectId() })
  const [apiReply, setApiReply] = React.useState<string>('(klik knappen for at kalde backend)')
  const [wsLogs, setWsLogs] = React.useState<string[]>([])
  const wsRef = React.useRef<WebSocket | null>(null)

  const audioRef = React.useRef<HTMLAudioElement>(null)
  const rt = React.useRef<Awaited<ReturnType<typeof createRealtime>> | null>(null)
  const [running, setRunning] = React.useState(false)
  const [voiceText, setVoiceText] = React.useState('Create a hello.js that logs "Hi"')

  const [activePath, setActivePath] = React.useState(FS.list(projectId)[0] || 'index.js')
  const [useActiveFile, setUseActiveFile] = React.useState(true)
  const [snippet, setSnippet] = React.useState<string>("console.log('hi from runner')")

  const [messages, setMessages] = React.useState(loadChat(projectId))

  async function ping(){
    try{
      const backendUrl = `http://${window.location.hostname}:8787/health`
      const r = await fetch(backendUrl)
      const j = await r.json()
      setApiReply(JSON.stringify(j))
    }catch(e:any){
      setApiReply('Backend error: '+e.message)
    }
  }

  function connectWs(){
    if (wsRef.current) return
    const ws = new WebSocket(`ws://${window.location.hostname}:8787`)
    ws.onopen = () => setWsLogs(prev => [...prev, "Connected to WS"])
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        if(msg.type === "log"){
          setWsLogs(prev => [...prev, "> " + msg.data])
        } else if(msg.type === "done"){
          setWsLogs(prev => [...prev, "-- done --"])
        } else if(msg.type === "error"){
          setWsLogs(prev => [...prev, "Error: " + msg.data])
        }
      } catch(e){
        setWsLogs(prev => [...prev, ev.data])
      }
    }
    wsRef.current = ws
  }

  function runSnippet(){
    connectWs()
    let payload = snippet
    if (useActiveFile && projectId && activePath) payload = FS.read(projectId, activePath)
    if(wsRef.current && payload){
      wsRef.current.send(payload)
    }
  }

  async function startVoice(){
    if (!audioRef.current) return
    rt.current = await createRealtime(audioRef.current, (chunk)=>{
      appendAssistant(projectId, chunk)
      setMessages(loadChat(projectId))
    })
    await rt.current.start()
    rt.current.setInstructions("You are a coding assistant for a Replit-style IDE. Keep replies short. When suggesting file edits, include unified diffs in ```diff blocks.")
    setRunning(true)
  }
  function stopVoice(){ rt.current?.stop(); rt.current = null; setRunning(false) }
  function sendVoice(){ const t = voiceText.trim(); if(!t || !rt.current) return; rt.current.sendText(t); }

  function applyContextToAgent(ctx: string){
    if (!rt.current) { alert('Start voice først, så forbindelsen er aktiv.'); return }
    const trimmed = (ctx || '').trim()
    if (!trimmed) { alert('Context is empty'); return }
    rt.current.setInstructions("ADDITIONAL CONTEXT (persist in session):\n" + trimmed)
    alert('Context applied to agent session')
  }

  function onSendChat(t:string){
    appendUser(projectId, t)
    setMessages(loadChat(projectId))
    if(rt.current) rt.current.sendText(t)
  }

  React.useEffect(()=>{
    setMessages(loadChat(projectId))
    seedIfEmpty(projectId)
    setActivePath(FS.list(projectId)[0] || 'index.js')
  },[projectId])

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100vh'}}>
      <ProjectBar onChange={id=>setProjectId(id)}/>
      <div style={{flex:1, display:'grid', gridTemplateColumns:'240px 1fr 420px'}}>
        <div style={{borderRight:'1px solid #e5e7eb', overflow:'auto'}}>
          {projectId && <FileTree projectId={projectId} onSelect={setActivePath}/>}
        </div>
        <div style={{display:'grid', gridTemplateRows:'1fr auto auto auto', minHeight:0}}>
          {projectId && activePath && <Editor projectId={projectId} path={activePath}/>}
          <div style={{padding:10}}>
            <h3>Runner</h3>
            <textarea
              disabled={useActiveFile}
              value={snippet}
              onChange={e => setSnippet(e.target.value)}
              rows={4}
              style={{width:'100%', fontFamily:'monospace'}}
            />
            <button onClick={runSnippet} style={{padding:'8px 12px', marginTop:8}}>Run snippet</button>
            <label style={{display:'flex', alignItems:'center', gap:8, marginTop:8}}>
              <input type="checkbox" checked={useActiveFile} onChange={e=>setUseActiveFile(e.target.checked)}/>
              Run active file ({activePath})
            </label>
            <pre style={{background:'#111', color:'#0f0', padding:10, maxHeight:200, overflowY:'auto', marginTop:10}}>
              {wsLogs.join('\n')}
            </pre>
          </div>
          <div style={{padding:10}}>
            <h3>Ping backend</h3>
            <button onClick={ping} style={{padding:'8px 12px'}}>Ping backend</button>
            <div><code>{apiReply}</code></div>
          </div>
          <PreviewPanel projectId={projectId}/>
        </div>
        <div style={{borderLeft:'1px solid #e5e7eb', overflow:'auto', display:'grid', gridTemplateRows:'auto 1fr auto auto auto'}}>
          <ApiKeyPanel/>
          <ChatPanel projectId={projectId} messages={messages} onSend={onSendChat}/>
          <ProjectRunPanel projectId={projectId}/>
          <div style={{borderTop:'1px solid #e5e7eb', padding:10}}>
            <h2>Voice Assistant</h2>
            <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', padding:10}}>
              {!running ? <button onClick={startVoice} style={{padding:'6px 12px'}}>Start voice</button>
                        : <button onClick={stopVoice} style={{padding:'6px 12px'}}>Stop voice</button>}
              <audio ref={audioRef} autoPlay />
            </div>
            <div style={{marginTop:8, display:'flex', gap:8, padding:10}}>
              <input
                value={voiceText}
                onChange={e=>setVoiceText(e.target.value)}
                placeholder="Type a request the model will speak back"
                style={{flex:1, padding:'6px 8px'}}
              />
              <button onClick={sendVoice} style={{padding:'6px 12px'}}>Send</button>
            </div>
            <ContextPanel onApply={applyContextToAgent} projectId={projectId}/>
          </div>
        </div>
        <NetworkDebug/>
      </div>
    </div>
  )
}