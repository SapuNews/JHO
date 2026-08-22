import React, { useState } from "react";
import { Download, Package, Smartphone, Terminal, FileCode, Check, Copy, ExternalLink, ShieldCheck } from "lucide-react";

interface ApkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkExportModal: React.FC<ApkExportModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const androidManifestContent = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.sntrean.studio">

    <!-- Camera and Audio Permissions -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.FLASHLIGHT" />

    <!-- Network and Wi-Fi Multicast Permissions (No internet required) -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />
    <uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />

    <!-- Storage and Screen WakeLock (Prevent sleep during broadcast) -->
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />

    <uses-feature android:name="android.hardware.camera" android:required="true" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
    <uses-feature android:name="android.hardware.camera.flash" android:required="false" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="SN-trean"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true"
        android:hardwareAccelerated="true">
        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:exported="true"
            android:label="SN-trean"
            android:screenOrientation="sensorLandscape"
            android:theme="@style/AppTheme.NoActionBarLaunch">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

  const capacitorConfig = `{
  "appId": "com.sntrean.studio",
  "appName": "SN-trean",
  "webDir": "dist",
  "bundledWebRuntime": false,
  "server": {
    "cleartext": true,
    "androidScheme": "http"
  },
  "android": {
    "allowMixedContent": true,
    "captureInput": true,
    "webContentsDebuggingEnabled": true
  }
}`;

  const downloadApkConfigZip = () => {
    // Generate downloadable configuration files bundle
    const manifestBlob = new Blob([androidManifestContent], { type: "text/xml" });
    const manifestUrl = URL.createObjectURL(manifestBlob);
    const a = document.createElement("a");
    a.href = manifestUrl;
    a.download = "AndroidManifest.xml";
    a.click();
    URL.revokeObjectURL(manifestUrl);

    setTimeout(() => {
      const capBlob = new Blob([capacitorConfig], { type: "application/json" });
      const capUrl = URL.createObjectURL(capBlob);
      const b = document.createElement("a");
      b.href = capUrl;
      b.download = "capacitor.config.json";
      b.click();
      URL.revokeObjectURL(capUrl);
    }, 300);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-neutral-950 border border-neutral-800 w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-black">
          <div className="flex items-center space-x-3">
            <div className="p-2 border border-neutral-800 bg-neutral-900 text-white">
              <Package className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-xs uppercase font-black tracking-widest flex items-center space-x-2">
                <span>Gerar APK Nativo para Android</span>
                <span className="text-[9px] px-2 py-0.5 border border-neutral-800 bg-neutral-900 text-green-400 font-mono font-bold">
                  CAPACITOR / PWA / ANDROID STUDIO
                </span>
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Instale no smartphone como app nativo para desempenho de transmissão máximo com aceleração por hardware
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 text-sm text-neutral-300">
          {/* Quick Install Direct PWA Option */}
          <div className="p-4 bg-black border border-green-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-black text-green-400 uppercase tracking-widest flex items-center space-x-1.5">
                <Smartphone className="w-4 h-4" /> <span>Opção 1: Instalação Instantânea PWA (Sem compilar)</span>
              </span>
              <p className="text-xs text-neutral-300 font-mono">
                No Chrome do celular, toque em <strong>⋮ (Menu) &gt; Adicionar à tela inicial</strong> ou <strong>Instalar aplicativo</strong> para rodar em tela cheia imersiva com suporte a WakeLock.
              </p>
            </div>
            <button
              onClick={() => {
                if ((window as any).deferredPrompt) {
                  (window as any).deferredPrompt.prompt();
                } else {
                  alert("Para instalar: No navegador do celular, abra o menu ⋮ e toque em 'Adicionar à tela de início' / 'Instalar Aplicativo'.");
                }
              }}
              className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-black uppercase tracking-wider transition-colors shrink-0 shadow-lg"
            >
              Instalar no Smartphone
            </button>
          </div>

          {/* Option 2: 1-Click Android Studio & Capacitor Build */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-green-400" />
                <span>Opção 2: Gerar arquivo .APK Nativo com Capacitor &amp; Android Studio</span>
              </h3>
              <button
                onClick={downloadApkConfigZip}
                className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-green-400 text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors border border-neutral-700 font-mono"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloadSuccess ? "ARQUIVOS BAIXADOS" : "BAIXAR MANIFEST"}</span>
              </button>
            </div>

            <div className="bg-black p-4 border border-neutral-800 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-neutral-400">
                <span className="text-[11px] uppercase tracking-wider">Comandos de compilação do APK:</span>
                <button
                  onClick={() =>
                    copyText(
                      `npm install @capacitor/core @capacitor/cli @capacitor/android\nnpx cap init "SN-trean" "com.sntrean.studio"\nnpm run build\nnpx cap add android\nnpx cap build android`,
                      "capCommands"
                    )
                  }
                  className="text-green-400 hover:text-green-300 font-bold uppercase text-[10px] tracking-wider flex items-center space-x-1"
                >
                  {copiedKey === "capCommands" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === "capCommands" ? "COPIADO" : "COPIAR COMANDOS"}</span>
                </button>
              </div>
              <pre className="text-green-400 overflow-x-auto p-3.5 bg-neutral-950 border border-neutral-800 text-xs font-mono">
                {`# 1. Instalar as ferramentas do Capacitor Android
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Inicializar o projeto nativo
npx cap init "SN-trean" "com.sntrean.studio"

# 3. Gerar o build da aplicação web
npm run build

# 4. Criar a pasta do Android Studio
npx cap add android

# 5. Compilar o arquivo .APK de release
npx cap build android`}
              </pre>
            </div>
          </div>

          {/* Android Permissions Overview */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-black text-neutral-400 uppercase tracking-widest flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              <span>Permissões incluídas no AndroidManifest.xml gerado:</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
              <div className="p-3 bg-black border border-neutral-800 text-neutral-300">
                📸 <strong className="text-white">Câmera 4K/60fps</strong> (Acesso direto a lentes traseira/frontal e lanterna)
              </div>
              <div className="p-3 bg-black border border-neutral-800 text-neutral-300">
                🎙️ <strong className="text-white">Áudio 48kHz</strong> (Gravação estéreo sem compressão e cancelamento de ruído)
              </div>
              <div className="p-3 bg-black border border-neutral-800 text-neutral-300">
                📡 <strong className="text-white">Wi-Fi Multicast</strong> (Transmissão de rede local sem internet)
              </div>
              <div className="p-3 bg-black border border-neutral-800 text-neutral-300">
                🔋 <strong className="text-white">WakeLock</strong> (Impede a tela de apagar durante a live)
              </div>
              <div className="p-3 bg-black border border-neutral-800 text-neutral-300">
                💾 <strong className="text-white">Armazenamento</strong> (Gravação simultânea no cartão SD / memória)
              </div>
              <div className="p-3 bg-black border border-neutral-800 text-neutral-300">
                ⚡ <strong className="text-white">Aceleração Gráfica</strong> (Hardware encoding H.264/HEVC)
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-neutral-800 bg-black">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-black uppercase tracking-wider transition-colors shadow-lg"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
