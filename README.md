# STR8M.GG - Extensão de Anexo de Áudio para Donate

Permite que apoiadores anexem arquivos de áudio locais (como `.wav`, `.mp3`, `.ogg`, `.m4a`, etc.) nos donates da [STR8M.GG](https://www.str8m.gg/) (ex: [str8m.gg/yulla](https://www.str8m.gg/yulla)), sem precisar de microfone físico ou permissão de gravação em tempo real.

---

## 🎯 Como Funciona

Na STR8M.GG, streamers podem ativar doações com áudio de até um limite de segundos (no caso do canal da **Yulla**, o limite é de **25 segundos** com valor mínimo de **R$ 3,00**).

Normalmente, a plataforma exige que o usuário segure ou clique no botão de gravar e fale no microfone. Esta extensão:
1. **Intercepta o pipeline da Web Audio API** da página no momento em que você seleciona um arquivo de áudio.
2. Fornece um **stream virtual silencioso**, sem solicitar acesso ao microfone físico.
3. Converte e reamostra o áudio nativamente para **16 kHz Mono PCM WAV** (exatamente o formato que a STR8M exige).
4. Alimenta as amostras de áudio diretamente no gravador oficial da página em menos de 100ms.
5. Deixa o sistema oficial da STR8M calcular o hash SHA-256 e habilitar o player de áudio com a duração exata.
6. Permite que você ouça a prévia do áudio no player da STR8M antes de avançar para o PIX.

---

## 🚀 Instalação

Você pode usar esta extensão de duas formas: como **Extensão do Chrome/Brave/Edge** ou via **Tampermonkey**.

### Opção 1: Como Extensão do Navegador (Recomendado)

Compatível com **Google Chrome**, **Brave**, **Microsoft Edge**, **Opera** e navegadores baseados em Chromium.

1. Abra o navegador e acesse a página de extensões:
   - **Chrome / Brave**: `chrome://extensions`
   - **Edge**: `edge://extensions`
2. No canto superior direito, ative a chave **"Modo do desenvolvedor"** (*Developer mode*).
3. Clique no botão **"Carregar sem compactação"** (*Load unpacked*).
4. Selecione a pasta deste projeto:
   `c:\Projetos\extension-str8m-audio`
5. Pronto! A extensão estará instalada e ativa.

---

### Opção 2: Como UserScript (Tampermonkey / Violentmonkey)

Se você já usa a extensão [Tampermonkey](https://www.tampermonkey.net/) ou [Violentmonkey]:

1. Abra o painel do Tampermonkey no navegador.
2. Clique em **"Adicionar novo script"** (*Create a new script*).
3. Copie todo o conteúdo do arquivo [`str8m-audio-attachment.user.js`](./str8m-audio-attachment.user.js) e cole no editor.
4. Clique em **Salvar** (`Ctrl + S`).

---

## 🎧 Como Usar no Canal da Yulla

1. Acesse **[https://www.str8m.gg/yulla](https://www.str8m.gg/yulla)**.
2. Preencha seu nickname e o valor (para áudio no canal da Yulla, o valor mínimo é **R$ 3,00**).
3. Ao lado do campo de mensagem, você verá o grupo de botões:
   - Botão de Texto
   - Botão de Microfone (Modo Áudio)
   - **Novo Botão: "📎 Anexar"**
4. Clique em **"Anexar"** ou no botão **"Anexar Áudio"** que aparece na barra inferior de áudio.
5. Escolha o seu arquivo de áudio (`.wav`, `.mp3`, `.ogg`, `.m4a`, etc.).
   - *Dica:* Você também pode **arrastar e soltar (Drag & Drop)** o arquivo diretamente na caixa de áudio!
6. O áudio será carregado instantaneamente no player oficial da STR8M.
7. Você pode clicar no botão de Play do player para ouvir como ficou.
8. Clique em **"Continuar para o PIX"** e finalize seu donate normalmente!

---

## ⚙️ Recursos e Validações

- **Formatos suportados**: `.wav`, `.mp3`, `.ogg`, `.m4a`, `.aac`, `.flac`, `.webm`.
- **Normalização de Volume Inteligente**: O áudio é normalizado para 98% do volume máximo (-0.2 dBFS), garantindo que arquivos baixos fiquem nítidos e audíveis na live sem distorção digital.
- **Equal-Power Downmix**: Preserva a potência acústica de arquivos estéreo (músicas e efeitos) sem a queda de volume de 6dB do mono convencional.
- **Sinc Resampling C++**: Reamostra com filtros anti-aliasing de estúdio via `OfflineAudioContext`, contornando a redução bruta de agudos do gravador padrão da STR8M.
- **Seletor de Volume / Boost**: Permite escolher entre 100% (Padrão Normalizado), 125% (+25% Boost) e 150% (Max) diretamente no painel.
- **Ajuste automático de duração**: Se o seu arquivo for mais longo do que o limite do canal (ex: 25s na Yulla), a extensão recorta automaticamente os primeiros segundos válidos e avisa você via notificação visual.
- **Limite de tamanho**: Respeita o limite oficial de 8 MB da STR8M.
- **Não requer microfone**: Funciona perfeitamente mesmo em computadores sem microfone instalado.
- **Totalmente compatível**: O áudio passa pelo mesmo processo de segurança (SHA-256 e upload seguro de token) que a STR8M utiliza nativamente.
