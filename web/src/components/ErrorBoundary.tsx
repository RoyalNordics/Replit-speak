import React from 'react'

type State = { hasError: boolean; error?: any }

export default class ErrorBoundary extends React.Component<{children: React.ReactNode}, State> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }
  componentDidCatch(error: any, info: any) {
    console.error("ErrorBoundary caught:", error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding:20, color:'#b91c1c', fontFamily:'monospace'}}>
          <h2>⚠️ Something went wrong</h2>
          <pre>{String(this.state.error)}</pre>
          <button onClick={()=>this.setState({hasError:false,error:undefined})}>
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}