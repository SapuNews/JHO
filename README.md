# 🎥 SN-trean — Transmissor de Câmera & Áudio WebRTC de Ultra-Baixa Latência

Sistema profissional de transmissão de vídeo e áudio sem fio em tempo real (estilo Larix Broadcaster) para **OBS Studio, vMix, PCs e Navegadores**, otimizado para **Web, GitHub e Android Studio (Capacitor / Native WebView)**.

---

## ⚡ 1. Executando Localmente via GitHub (Node.js)

Se você clonou ou baixou o código do GitHub em seu computador:

```bash
# 1. Instalar as dependências do projeto
npm install

# 2. Iniciar o servidor de desenvolvimento local (Porta 3000)
npm run dev

# 3. Opcional: Para gerar a versão de produção otimizada
npm run build
npm start
```

Abra no navegador em seu celular ou PC: `http://SEU_IP_LOCAL:3000` (Exemplo: `http://192.168.1.100:3000`).

---

## 📱 2. Compilando para Android Studio / Gerando o APK

O código foi especialmente adaptado com **caminhos relativos (`base: './'`)** e **proteção de permissões de hardware** para rodar perfeitamente sem tela branca no Android Studio.

### Opção A: Usando Capacitor (Recomendado & Rápido)

```bash
# 1. Gere os arquivos otimizados
npm run build

# 2. Instale o Capacitor Android (se ainda não tiver instalado)
npm install @capacitor/core @capacitor/cli @capacitor/android

# 3. Inicialize e adicione a plataforma Android
npx cap add android

# 4. Sincronize a pasta dist com o Android Studio
npx cap sync

# 5. Abra o projeto no Android Studio
npx cap open android
```
No Android Studio:
1. Clique em **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
2. O APK gerado estará pronto para instalar em qualquer smartphone Android.

---

### Opção B: WebView Nativo no Android Studio

Os arquivos de modelo já estão configurados na pasta `/android-setup/`:
- `android-setup/AndroidManifest.xml`: Contém as permissões `CAMERA`, `RECORD_AUDIO`, `INTERNET`, `WAKE_LOCK` e `usesCleartextTraffic="true"`.
- `android-setup/MainActivity.kt`: Contém o `WebChromeClient` com `onPermissionRequest` para conceder acesso ao sensor de câmera e microfone dentro do WebView sem bloqueios.

Basta copiar a pasta gerada `dist/` para a pasta `app/src/main/assets/dist/` do seu projeto no Android Studio.

---

## 🔧 3. Por que a tela branca ocorria e como foi corrigido:

1. **Caminhos de Recursos Absolutos vs Relativos**: No Vite tradicional, os arquivos de script eram importados como `/assets/index.js`, o que falhava quando o app era aberto em arquivos locais ou WebViews do Android (`file:///android_asset/`). Configuramos `base: './'` no `vite.config.ts`.
2. **Permissões WebRTC / MediaDevices**: Em conexões sem HTTPS ou no WebView padrão do Android, chamar `navigator.mediaDevices` podia lançar exceção. Agora há verificação defensiva completa e interface de instrução de permissões.
3. **ErrorBoundary de Proteção Global**: O app agora possui uma camada de recuperação que captura qualquer imprevisto e permite recarregar ou resetar as configurações com um clique.

---

## 🛰️ 4. Recursos do SN-trean
- **Ultra-Baixa Latência**: WebRTC P2P direto via rede local Wi-Fi / Hotspot.
- **Controles de Câmera**: Pinch-to-zoom (pinça com 2 dedos), atalhos 0.5x, 1x, 2x, 3x, 5x e compensação de luz/exposição (EV).
- **Modo Tela Cheia**: Oculta barra de status e navegação do Android com um toque.
- **Saída Limpa (Clean Feed)**: Sinal bruto puro para o OBS Studio sem botões sobrepostos.
