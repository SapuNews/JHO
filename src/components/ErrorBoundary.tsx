import React from "react";
import { AlertTriangle, RefreshCw, Trash2, Smartphone } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Uncaught runtime error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleResetSettings = (): void => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.reload();
  };

  public override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-neutral-950 text-white flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="max-w-xl w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center space-x-3 text-amber-400">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">SN-trean - Recuperação do Sistema</h1>
                <p className="text-xs text-neutral-400 font-mono">Modo de Segurança Ativado</p>
              </div>
            </div>

            <div className="bg-black/60 border border-white/10 rounded-xl p-4 space-y-2 text-xs font-mono">
              <p className="text-rose-400 font-bold">
                {this.state.error?.name}: {this.state.error?.message || "Erro inesperado durante a inicialização."}
              </p>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-[11px] text-neutral-500 max-h-36 overflow-y-auto whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div className="space-y-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-400">Ações Rápidas:</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={this.handleReload}
                  className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded-xl flex items-center justify-center space-x-2 transition-all text-xs"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Recarregar Aplicativo</span>
                </button>
                <button
                  onClick={this.handleResetSettings}
                  className="px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold rounded-xl flex items-center justify-center space-x-2 border border-white/10 transition-all text-xs"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Limpar Cache & Resetar</span>
                </button>
              </div>
            </div>

            <div className="bg-neutral-800/40 border border-white/5 rounded-xl p-4 space-y-2 text-xs text-neutral-400">
              <div className="flex items-center space-x-2 text-neutral-300 font-medium">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>Executando no Android Studio / APK:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Certifique-se de que as permissões de <code>CAMERA</code> e <code>RECORD_AUDIO</code> foram concedidas no <code>AndroidManifest.xml</code> e que a conexão seja via <code>https://</code> ou <code>localhost</code>.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
