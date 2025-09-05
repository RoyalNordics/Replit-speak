import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()
const PORT = Number(process.env.PORT || 8787)

app.use(cors())
app.use(express.json({ limit: '2mb' }))

// Health probe
app.get('/health', (_req, res) => res.json({ ok: true }))

// Echo endpoint (verificerer POST end-to-end)
app.post('/echo', (req, res) => res.json({ received: req.body }))

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})