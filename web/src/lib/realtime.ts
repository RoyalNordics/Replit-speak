export type RTHandle = {
  start: () => Promise<void>
  stop: () => void
  sendText: (text: string) => void
  setInstructions: (text: string) => void
}

export async function createRealtime(remoteAudio: HTMLAudioElement, onText?: (s:string)=>void): Promise<RTHandle> {
  const pc = new RTCPeerConnection()
  let dc: RTCDataChannel | null = null
  let stream: MediaStream | null = null

  pc.ontrack = (e) => { remoteAudio.srcObject = e.streams[0] }

  function setupDC(){
    dc = pc.createDataChannel('oai-events')
    dc.onopen = () => console.log('Realtime datachannel open')
    let buffer = ''
    dc.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        if(msg.type==='response.output_text.delta'){
          buffer += msg.delta
          if(onText) onText(msg.delta)
        }
        if(msg.type==='response.completed'){
          buffer=''
        }
        console.debug('RT event:', msg)
      } catch {}
    }
  }
  setupDC()

  async function start(){
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    for (const t of stream.getTracks()) pc.addTrack(t, stream)

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    const r = await fetch('http://localhost:8787/realtime/sdp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sdp: offer.sdp })
    })
    if (!r.ok) throw new Error(await r.text())
    const answerSdp = await r.text()
    await pc.setRemoteDescription({ type:'answer', sdp: answerSdp })
  }

  function stop(){
    try { dc?.close() } catch {}
    pc.getSenders().forEach(s => s.track && s.track.stop())
    try { pc.close() } catch {}
  }

  function sendText(text: string){
    const event = { type: 'response.create', response: { instructions: text } }
    dc?.send(JSON.stringify(event))
  }

  function setInstructions(text: string){
    const event = { type: 'session.update', session: { instructions: text } }
    dc?.send(JSON.stringify(event))
  }

  return { start, stop, sendText, setInstructions }
}