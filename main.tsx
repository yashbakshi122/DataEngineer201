import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// --- Error Boundary ---
interface EBState { hasError: boolean; error?: Error }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif',
          backgroundColor: '#F8FAFC', padding: '24px', textAlign: 'center',
        }}>
          <div style={{
            background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14,
            padding: '40px 48px', maxWidth: 560, boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
              EventFlow failed to start
            </h1>
            <p style={{ color: '#64748B', marginBottom: 24, lineHeight: 1.6 }}>
              A runtime error occurred. The most common cause is missing Firebase
              environment variables. Make sure your <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>.env</code> file exists
              and has valid Firebase credentials.
            </p>
            <pre style={{
              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
              padding: '12px 16px', fontSize: '0.8rem', color: '#991B1B',
              textAlign: 'left', overflowX: 'auto', marginBottom: 24,
            }}>
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#4F46E5', color: '#fff', border: 'none',
                padding: '10px 24px', borderRadius: 8, cursor: 'pointer',
                fontSize: '0.9rem', fontWeight: 600,
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
// ----------------------

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
