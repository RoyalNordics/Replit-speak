import React, { useEffect, useState } from "react"
import { normalizePreviewUrl, isValidHttpUrl } from "../lib/url"

interface Props {
  projectId: string
}

interface Status {
  running: boolean
  url?: string | null
  error?: string | null
}

export const ProjectRunPanel: React.FC<Props> = ({ projectId }) => {
  const [status, setStatus] = useState<Status>({ running: false })
  const [loading, setLoading] = useState(false)

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/projects/${projectId}/run/status`)
      const data = await res.json()
      setStatus(data)
    } catch (err) {
      console.error(err)
    }
  }

  const start = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/projects/${projectId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      })
      const data = await res.json()
      setStatus({ running: true, url: data.url })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const stop = async () => {
    setLoading(true)
    try {
      await fetch(`/projects/${projectId}/run`, { method: "DELETE" })
      setStatus({ running: false })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const timer = setInterval(fetchStatus, 5000)
    return () => clearInterval(timer)
  }, [projectId])

  return (
    <div className="project-run-panel">
      <h3>Runtime</h3>
      {status.running ? (
        <div>
          {isValidHttpUrl(status?.url) ? (
            <p>Running at: <a href={normalizePreviewUrl(status?.url) || "#"} target="_blank" rel="noreferrer">{normalizePreviewUrl(status?.url) ?? "Unknown URL"}</a></p>
          ) : (
            <span style={{color:"#64748b"}}>No runtime URL yet</span>
          )}
          <button onClick={stop} disabled={loading}>Stop Project</button>
        </div>
      ) : (
        <div>
          <p>Project stopped</p>
          <button onClick={start} disabled={loading}>Start Project</button>
        </div>
      )}
    </div>
  )
}