import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import vm from 'vm'
import fetch from 'node-fetch'
import multer from 'multer'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, rmSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { tmpdir } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = Number(process.env.PORT || 8787)

app.use(cors())
app.use(express.json({ limit: '2mb' }))

// Health and echo
app.get('/health', (_req, res) => res.json({ ok: true }))
app.post('/echo', (req, res) => res.json({ received: req.body }))

// ================== Realtime SDP ==================
app.post('/realtime/sdp', async (req, res) => {
  try {
    const { sdp } = req.body
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not set' })
    }
    const r = await fetch(`https://api.openai.com/v1/realtime?model=${process.env.REALTIME_MODEL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/sdp'
      },
      body: sdp
    })
    const text = await r.text()
    res.setHeader('Content-Type', 'application/sdp')
    res.send(text)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
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
    try{
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
    }catch(err){ ws.send(JSON.stringify({ type:"error", data:err.message })) }
  })
})

// ================== Start server ==================
server.listen(PORT, ()=> {
  console.log(`Server listening on http://localhost:${PORT}`)
  console.log("Realtime SDP proxy ready")
  console.log("Upload endpoint ready at POST /upload; static at /uploads")
  console.log("Static preview ready at /preview/:id/*")
})