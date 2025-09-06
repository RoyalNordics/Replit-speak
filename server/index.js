import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import vm from 'vm'
import fetch from 'node-fetch'
import multer from 'multer'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, rmSync, readdirSync, statSync } from 'fs'
import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { tmpdir } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(cors())
app.use(express.json())

const PORT = Number(process.env.PORT || 8787)

let lastRealtimeError = null
function setRealtimeError(obj){ lastRealtimeError = obj }

app.get('/debug/realtime/last', (_req,res)=>{
  res.json({ last: lastRealtimeError })
})
app.get('/config/status', (_req,res)=>{
  const current = activeProfileId && apiProfiles[activeProfileId]
  res.json({ hasActiveProfile: !!current, model: current?.model || null })
})

app.post('/realtime/sdp', async (req,res)=>{
  try {
    const { sdp } = req.body || {}
    if(!sdp){
      setRealtimeError({ at: Date.now(), status:400, message:'Missing sdp' })
      return res.status(400).json({ error:'Missing sdp' })
    }
    const current = activeProfileId && apiProfiles[activeProfileId]
    if(!current){
      setRealtimeError({ at: Date.now(), status:400, message:'No API key configured' })
      return res.status(400).json({ error:'No API key configured' })
    }
    const r = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(current.model)}`,{
      method:'POST',
      headers:{
        'Authorization': `Bearer ${current.key}`,
        'Content-Type': 'application/sdp'
      },
      body: sdp
    })
    const txt = await r.text()
    if(!r.ok){
      setRealtimeError({ at: Date.now(), status:r.status, body: txt.slice(0,800) })
      return res.status(r.status).json({ error:'OpenAI realtime error', status:r.status, body: txt.slice(0,500) })
    }
    setRealtimeError(null)
    return res.type('application/sdp').send(txt)
  } catch(e){
    setRealtimeError({ at: Date.now(), status:500, message:String(e) })
    return res.status(500).json({ error:String(e) })
  }
})
console.log("Realtime debug at /debug/realtime/last, config at /config/status")

let apiProfiles = {}
let activeProfileId = null

const profilesPath = join(__dirname, 'profiles.json')

// load profiles from disk on startup
if (existsSync(profilesPath)) {
  try {
    const parsed = JSON.parse(readFileSync(profilesPath,'utf8'))
    apiProfiles = parsed.apiProfiles || {}
    activeProfileId = parsed.activeProfileId || null
  } catch(e) {
    console.error("Failed to load profiles:", e)
    apiProfiles = {}
    activeProfileId = null
  }
}

function saveProfiles() {
  try {
    const data = { apiProfiles, activeProfileId }
    writeFileSync(profilesPath, JSON.stringify(data,null,2))
  } catch(e){
    console.error("Failed to save profiles:", e)
  }
}

app.get('/config/profiles',(_req,res)=>{
  const profiles = Object.values(apiProfiles).map(p=>({id:p.id,name:p.name,model:p.model}))
  res.json({ active:activeProfileId, profiles })
})
app.post('/config/profiles',(req,res)=>{
  const {id,name,key,model} = req.body||{}
  if(!id||!name||!key||!model) return res.status(400).json({error:'Missing fields'})
  if(!key.startsWith('sk-')) return res.status(400).json({error:'Invalid key'})
  apiProfiles[id] = {id,name,key,model}
  res.json({ok:true})
})
app.delete('/config/profiles/:id',(req,res)=>{
  const id=req.params.id
  delete apiProfiles[id]
  if(activeProfileId===id) activeProfileId=null
  res.json({ok:true})
})
app.post('/config/activate/:id',(req,res)=>{
  const id=req.params.id
  if(!apiProfiles[id]) return res.status(404).json({error:'not found'})
  activeProfileId=id
  res.json({ok:true})
})

app.use(cors())
app.use(express.json({ limit: '2mb' }))

// Health and echo
app.get('/health', (_req, res) => res.json({ ok: true }))
app.post('/echo', (req, res) => res.json({ received: req.body }))

// ================== Realtime SDP ==================
app.post('/realtime/sdp', async (req, res) => {
  try {
    const { sdp } = req.body
    if(!activeProfileId||!apiProfiles[activeProfileId]){
      return res.status(400).json({error:'No active profile'})
    }
    if(!activeProfileId||!apiProfiles[activeProfileId]){
      return res.status(400).json({error:'No active profile'})
    }
    const profile=apiProfiles[activeProfileId]
    const r=await fetch(`https://api.openai.com/v1/realtime?model=${profile.model}`,{
      method:'POST',
      headers:{
        'Authorization':`Bearer ${profile.key}`,
        'Content-Type':'application/sdp'
      },
      body:sdp
    })
    const text=await r.text()
    res.setHeader('Content-Type','application/sdp')
    res.send(text)
  }catch(err){res.status(500).json({error:err.message})}
})

// ================== Uploads ==================
const uploadsDir = join(__dirname, 'uploads')
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true })
app.use('/uploads', express.static(uploadsDir))
const upload = multer({ dest: uploadsDir, limits: { fileSize: 10 * 1024 * 1024 } })
app.post('/upload', upload.array('files', 12), (req, res) => {
  try {
    const projectId = req.query.project
    if (!projectId) return res.status(400).json({ error: "Missing project query param" })
    const projectDir = join(uploadsDir, projectId)
    if (!existsSync(projectDir)) mkdirSync(projectDir, { recursive: true })
    const files = req.files.map(f => {
      const safeName = f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
      const finalPath = join(projectDir, safeName)
      renameSync(f.path, finalPath)
      let meta = {
        filename: safeName,
        url: `/uploads/${projectId}/${safeName}`,
        mimetype: f.mimetype,
        size: f.size
      }
      if (
        /^text\//.test(f.mimetype) ||
        ['application/json','application/javascript','application/xml','application/yaml','application/x-yaml','application/toml'].includes(f.mimetype)
      ) {
        const buf = readFileSync(finalPath, { encoding:'utf8' })
        meta.text = buf.slice(0, 200 * 1024)
      }
      return meta
    })
    res.json({ files })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
app.get('/projects/:id/uploads', (req,res)=>{
  try{
    const id = req.params.id
    const dir = join(uploadsDir, id)
    if(!existsSync(dir)) return res.json({ files:[] })
    const files = readdirSync(dir).map(name=>{
      const p = join(dir,name)
      const st = statSync(p)
      return { filename:name, url:`/uploads/${id}/${name}`, size:st.size }
    })
    res.json({ files })
  }catch(e){ res.status(500).json({error:e.message}) }
})

// ================== Preview ==================
const previews = new Map()
const previewsRoot = join(tmpdir(), 'replit-speak-previews')
mkdirSync(previewsRoot, { recursive: true })
app.use('/preview', express.static(previewsRoot))

import crypto from 'crypto'
function nanoid(){ return crypto.randomBytes(6).toString('hex') }

app.post('/preview/start', (req,res)=>{
  try{
    const { files, id } = req.body
    const pid = id || nanoid()
    const dir = join(previewsRoot, pid)
    mkdirSync(dir,{recursive:true})
    for(const [path,content] of Object.entries(files)){
      const full = join(dir, path)
      mkdirSync(dirname(full),{recursive:true})
      writeFileSync(full, content)
    }
    previews.set(pid,{id:pid,dir})
    res.json({ id:pid, url:`/preview/${pid}/index.html` })
  }catch(e){ res.status(500).json({ error:e.message }) }
})
app.delete('/preview/:id',(req,res)=>{
  const id = req.params.id
  if(!previews.has(id)) return res.status(404).json({ok:false})
  const {dir} = previews.get(id)
  rmSync(dir,{recursive:true,force:true})
  previews.delete(id)
  res.json({ok:true})
})

// ================== WebSocket runner ==================
const server = createServer(app)
const wss = new WebSocketServer({ server })

wss.on('connection',(ws)=>{
  ws.send('Connected to code runner')

  ws.on('message',(msg)=>{
    try {
      const code = msg.toString()
      let logs = []
      const sandboxConsole = {
        log: (...args) => {
          const text = args.map(a=>String(a)).join(' ')
          logs.push(text)
          ws.send(JSON.stringify({ type:"log", data:text }))
        }
      }
      const context = vm.createContext({ console:sandboxConsole })
      vm.runInContext(code, context, { timeout:1000 })
      ws.send(JSON.stringify({ type:"done", logs }))
    } catch(err) {
      ws.send(JSON.stringify({ type:"error", data: err.message }))
    }
  })
})
 
let projectRuntimes = new Map()
let basePort = 3000

// ================== Runtimes ==================
app.post('/projects/:id/run',(req,res)=>{
  const id = req.params.id
  const { command } = req.body || {}
  if(projectRuntimes.has(id)){
    return res.status(400).json({error:'Already running'})
  }
  const dir = join(uploadsDir,id)
  if(!existsSync(dir)) return res.status(400).json({error:'No such project'})
  const port = basePort + projectRuntimes.size
  const cmd = command || "npm run dev"
  const child = spawn(cmd,{cwd:dir,shell:true,env:{...process.env,PORT:String(port)}})
  projectRuntimes.set(id,{process:child,port})
  child.stdout.on('data',(d)=>console.log(`[${id}]`,d.toString()))
  child.stderr.on('data',(d)=>console.error(`[${id}]`,d.toString()))
  child.on('exit',()=>{projectRuntimes.delete(id)})
  res.json({ok:true,url:`http://localhost:${port}`})
})
app.delete('/projects/:id/run',(req,res)=>{
  const id=req.params.id
  if(!projectRuntimes.has(id)) return res.json({ok:false})
  const {process}=projectRuntimes.get(id)
  process.kill()
  projectRuntimes.delete(id)
  res.json({ok:true})
})
app.get('/projects/:id/run/status',(req,res)=>{
  const id=req.params.id
  if(!projectRuntimes.has(id)) return res.json({running:false})
  const {port}=projectRuntimes.get(id)
  res.json({running:true, url:`http://localhost:${port}`})
})
// ================== File reference APIs ==================
app.get('/projects/:id/files',(req,res)=>{
  try {
    const id=req.params.id
    const dir = join(uploadsDir,id)
    if(!existsSync(dir)) return res.json({files:[]})
    const out = []
    function walk(base, rel="") {
      const ls = readdirSync(base)
      for(const name of ls){
        const full = join(base,name)
        const st = statSync(full)
        const path = rel ? rel+"/"+name : name
        if(st.isDirectory()){
          walk(full,path)
        } else {
          out.push({ path, size:st.size, mimetype:mime.lookup(name)||"application/octet-stream" })
        }
      }
    }
    walk(dir,"")
    res.json({ files: out })
  } catch(e){ res.status(500).json({error:e.message}) }
})
app.get('/projects/:id/file/*',(req,res)=>{
  try{
    const id=req.params.id
    const relPath=req.params['0']
    const dir=join(uploadsDir,id)
    const full=join(dir,relPath)
    if(!existsSync(full)) return res.status(404).send('Not found')
    const mt = mime.lookup(full)||'application/octet-stream'
    res.setHeader('Content-Type',mt)
    const data=readFileSync(full,{encoding:undefined})
    res.send(data)
  }catch(e){res.status(500).json({error:e.message})}
})

 // ================== Chat with OpenAI ==================
 app.post('/chat', async (req, res) => {
   try {
     if(!activeProfileId || !apiProfiles[activeProfileId]) {
       return res.status(400).json({ error: 'No active OpenAI profile configured' })
     }
     const { message } = req.body || {}
     if(!message) return res.status(400).json({ error: 'Missing message' })
     const profile = apiProfiles[activeProfileId]
     const r = await fetch("https://api.openai.com/v1/chat/completions", {
       method: "POST",
       headers: {
         "Authorization": "Bearer " + profile.key,
         "Content-Type": "application/json"
       },
       body: JSON.stringify({
         model: profile.model || "gpt-4o-mini",
         messages: [{ role: "user", content: message }]
       })
     })
     const json = await r.json()
     if(!r.ok) return res.status(r.status).json(json)
     const reply = json.choices?.[0]?.message?.content || "(no response)"
     res.json({ reply })
   } catch(e) {
     res.status(500).json({ error: String(e) })
   }
 })

// ================== Start server ==================
server.listen(PORT, ()=> {
  console.log(`Server listening on http://localhost:${PORT}`)
  console.log("Realtime SDP proxy ready")
  console.log("Upload endpoint ready at POST /upload; static at /uploads")
  console.log("Static preview ready at /preview/:id/*")
  console.log("Runtime endpoints ready: POST/DELETE/GET /projects/:id/run")
})
