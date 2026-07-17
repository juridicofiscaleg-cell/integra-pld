import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = {}

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Integra PLD:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="login-page">
          <div className="login-card card">
            <h1>No se pudo cargar la aplicación</h1>
            <p className="form-error">{this.state.error.message}</p>
            <p className="cell-sub">
              Prueba recargar con <strong>Cmd+Shift+R</strong> (Mac) o <strong>Ctrl+Shift+R</strong> (Windows).
              Si persiste, borra datos del sitio en el navegador.
            </p>
            <button
              type="button"
              className="auth-tab auth-tab-active"
              style={{ width: '100%', marginTop: '1rem' }}
              onClick={() => window.location.reload()}
            >
              Recargar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
