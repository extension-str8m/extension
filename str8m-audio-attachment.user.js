// ==UserScript==
// @name         STR8M.GG - Anexo de Áudio para Donate
// @namespace    https://str8m.gg/
// @version      1.2.0
// @description  Permite anexar arquivos de áudio (.wav, .mp3, etc.) nos donates da STR8M.GG com volume normalizado, máxima fidelidade e respeito ao limite do canal.
// @author       STR8M Audio Extension
// @match        *://*.str8m.gg/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  if (window.__STR8M_AUDIO_EXTENSION_INITIALIZED__) return;
  window.__STR8M_AUDIO_EXTENSION_INITIALIZED__ = true;

  console.log(
    "[STR8M Audio UserScript] Inicializando interceptador de áudio...",
  );

  const styleEl = document.createElement("style");
  styleEl.textContent = `
    .str8m-drag-hover {
      outline: 2px dashed #633cf5 !important;
      outline-offset: 4px !important;
      background-color: rgba(99, 60, 245, 0.05) !important;
      transition: all 0.2s ease-in-out !important;
    }
    .str8m-audio-attachment-panel {
      position: relative;
      transition: border-color 0.2s, background-color 0.2s;
      box-sizing: border-box;
    }
    .str8m-audio-attachment-panel:hover {
      border-color: #cbd5e1;
    }
    .public-dark .str8m-audio-attachment-panel {
      background-color: #161c28 !important;
      border-color: #273346 !important;
      color: #cbd5e1 !important;
    }
    .public-dark .str8m-audio-attachment-panel span.font-bold {
      color: #f1f5f9 !important;
    }
    .public-dark .str8m-attach-toggle-btn {
      color: #94a3b8 !important;
    }
    .public-dark .str8m-attach-toggle-btn:hover {
      background-color: #232d3f !important;
      color: #f8fafc !important;
    }
    .str8m-volume-select {
      cursor: pointer;
      font-family: inherit;
      transition: border-color 0.15s ease;
    }
    .public-dark .str8m-volume-select {
      background-color: #1e293b !important;
      color: #f8fafc !important;
      border-color: #334155 !important;
    }
    .str8m-btn-attach-primary {
      background-color: #633cf5;
      cursor: pointer;
      border: none;
      font-family: inherit;
      transition: background-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
    }
    .str8m-btn-attach-primary:hover {
      background-color: #5127ee;
      box-shadow: 0 4px 12px rgba(99, 60, 245, 0.25);
    }
    .str8m-btn-attach-primary:active {
      transform: scale(0.97);
    }
    .str8m-attach-toggle-btn {
      cursor: pointer;
      border: none;
      font-family: inherit;
    }
    #str8m-toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      max-width: 380px;
      width: calc(100vw - 40px);
    }
    .str8m-toast {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 1rem;
      background-color: #ffffff;
      color: #0f172a;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.4;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
      opacity: 0;
      transform: translateY(-10px) scale(0.95);
      transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .str8m-toast-show {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    .str8m-toast-success { border-left: 4px solid #10b981; }
    .str8m-toast-error { border-left: 4px solid #ef4444; }
    .str8m-toast-warning { border-left: 4px solid #f59e0b; }
    .str8m-toast-info { border-left: 4px solid #633cf5; }
    .public-dark .str8m-toast {
      background-color: #1e293b;
      color: #f8fafc;
      border-color: #334155;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);
    }
  `;
  (document.head || document.documentElement).appendChild(styleEl);

  let pendingAudioData = null;
  let isAutomatingRecording = false;
  let activeChannelMaxSeconds = 25;
  let currentVolumeBoost = parseFloat(
    localStorage.getItem("str8m_audio_volume_boost") || "1.0",
  );
  const channelLimitsCache = new Map();

  function getCurrentHandle() {
    const params = new URLSearchParams(window.location.search);
    const qHandle = params.get("handle");
    if (qHandle) return qHandle.replace("@", "").toLowerCase();

    const segments = window.location.pathname.split("/").filter(Boolean);
    const reserved = [
      "dashboard",
      "checkout",
      "overlay",
      "login",
      "signup",
      "termos",
      "api",
      "widget",
      "sounds",
    ];
    for (const seg of segments) {
      const clean = seg.replace("@", "").toLowerCase();
      if (!reserved.includes(clean)) {
        return clean;
      }
    }
    return null;
  }

  async function resolveChannelMaxSeconds() {
    const handle = getCurrentHandle();

    if (handle && channelLimitsCache.has(handle)) {
      return channelLimitsCache.get(handle);
    }

    if (handle) {
      try {
        const res = await fetch(
          `https://api.str8m.gg/api/public/channel/${encodeURIComponent(handle)}`,
        );
        if (res.ok) {
          const data = await res.json();
          const sec = data?.donation_settings?.donate_audio_max_seconds;
          if (Number.isFinite(sec) && sec > 0 && sec <= 60) {
            channelLimitsCache.set(handle, sec);
            activeChannelMaxSeconds = sec;
            console.log(
              `[STR8M Audio UserScript] Limite do canal @${handle} obtido via API: ${sec}s`,
            );
            return sec;
          }
        }
      } catch (e) {
        console.warn(
          "[STR8M Audio UserScript] Não foi possível obter limite via API:",
          e,
        );
      }
    }

    const bodyText = document.body ? document.body.innerText : "";
    const matchExplicit = bodyText.match(
      /(?:maximo|máximo)\s+(\d+)\s+segundos/i,
    );
    if (matchExplicit && matchExplicit[1]) {
      const val = parseInt(matchExplicit[1], 10);
      if (val > 0 && val <= 60) {
        if (handle) channelLimitsCache.set(handle, val);
        activeChannelMaxSeconds = val;
        return val;
      }
    }

    return activeChannelMaxSeconds || 25;
  }

  setTimeout(() => {
    resolveChannelMaxSeconds();
  }, 100);

  const OrigAudioContext = window.AudioContext || window.webkitAudioContext;
  const origGetUserMedia = navigator.mediaDevices?.getUserMedia?.bind(
    navigator.mediaDevices,
  );

  window.AudioContext = function (options) {
    if (pendingAudioData || isAutomatingRecording) {
      options = Object.assign({}, options, { sampleRate: 16000 });
      console.log(
        "[STR8M Audio UserScript] AudioContext calibrado para 16000 Hz",
      );
    }
    return new OrigAudioContext(options);
  };
  window.AudioContext.prototype = OrigAudioContext.prototype;
  if (window.webkitAudioContext) {
    window.webkitAudioContext = window.AudioContext;
  }

  if (navigator.mediaDevices && origGetUserMedia) {
    navigator.mediaDevices.getUserMedia = async function (constraints) {
      if (pendingAudioData || isAutomatingRecording) {
        try {
          const dummyCtx = new OrigAudioContext({ sampleRate: 16000 });
          const osc = dummyCtx.createOscillator();
          const dst = dummyCtx.createMediaStreamDestination();
          osc.connect(dst);
          osc.start();
          const stream = dst.stream;

          const track = stream.getAudioTracks()[0];
          if (track) {
            const origTrackStop = track.stop.bind(track);
            track.stop = function () {
              origTrackStop();
              try {
                dummyCtx.close();
              } catch (e) {}
            };
          }
          return stream;
        } catch (e) {
          console.warn(
            "[STR8M Audio UserScript] Erro ao criar stream virtual:",
            e,
          );
        }
      }
      return origGetUserMedia(constraints);
    };
  }

  if (OrigAudioContext && OrigAudioContext.prototype.createScriptProcessor) {
    const origCreateScriptProcessor =
      OrigAudioContext.prototype.createScriptProcessor;

    OrigAudioContext.prototype.createScriptProcessor = function (
      bufferSize,
      numberOfInputChannels,
      numberOfOutputChannels,
    ) {
      const processorNode = origCreateScriptProcessor.apply(this, arguments);
      const audioCtx = this;

      if (pendingAudioData) {
        const audioPayload = pendingAudioData;
        const actualBufferSize = bufferSize || 4096;

        let userProcessHandler = null;

        Object.defineProperty(processorNode, "onaudioprocess", {
          configurable: true,
          enumerable: true,
          get() {
            return userProcessHandler;
          },
          set(handler) {
            userProcessHandler = handler;

            if (typeof handler === "function" && pendingAudioData) {
              setTimeout(() => {
                feedAudioData(
                  handler,
                  audioPayload,
                  actualBufferSize,
                  audioCtx.sampleRate,
                );
              }, 15);
            }
          },
        });
      }

      return processorNode;
    };
  }

  function feedAudioData(handler, audioPayload, bufferSize, ctxSampleRate) {
    try {
      const pcm = audioPayload.pcm;
      const totalSamples = pcm.length;

      console.log(
        `[STR8M Audio UserScript] Injetando ${totalSamples} amostras PCM (${(totalSamples / 16000).toFixed(2)}s)...`,
      );

      for (let offset = 0; offset < totalSamples; offset += bufferSize) {
        const end = Math.min(offset + bufferSize, totalSamples);
        const chunkSlice = pcm.subarray(offset, end);
        const sliceLen = chunkSlice.length;

        const inputChunk = new Float32Array(sliceLen);
        inputChunk.set(chunkSlice);

        const dummyOutput = new Float32Array(sliceLen);

        const fakeEvent = {
          inputBuffer: {
            getChannelData: () => inputChunk,
            length: sliceLen,
          },
          outputBuffer: {
            getChannelData: () => dummyOutput,
            fill: () => {},
          },
        };

        handler(fakeEvent);
      }

      pendingAudioData = null;

      setTimeout(() => {
        triggerStopButton();
      }, 60);
    } catch (err) {
      console.error(
        "[STR8M Audio UserScript] Erro ao alimentar dados de áudio:",
        err,
      );
      pendingAudioData = null;
      isAutomatingRecording = false;
    }
  }

  function triggerStopButton() {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const stopBtn =
        document.querySelector('button[title="Parar gravação"]') ||
        document.querySelector('button[title="Parar"]') ||
        Array.from(document.querySelectorAll("button")).find(
          (b) => b.textContent && b.textContent.trim() === "Parar",
        );

      if (stopBtn) {
        clearInterval(interval);
        stopBtn.click();
        isAutomatingRecording = false;
        showToast("Áudio anexado com sucesso!", "success");
      } else if (attempts >= 20) {
        clearInterval(interval);
        isAutomatingRecording = false;
      }
    }, 50);
  }

  async function enhanceAndResampleAudio(
    decodedBuffer,
    targetDuration,
    volumeBoost = 1.0,
  ) {
    const numChannels = decodedBuffer.numberOfChannels;
    const originalSampleRate = decodedBuffer.sampleRate;
    const effectiveDuration = Math.min(decodedBuffer.duration, targetDuration);
    const effectiveSamples = Math.floor(effectiveDuration * originalSampleRate);

    const left = decodedBuffer.getChannelData(0);
    const right = numChannels > 1 ? decodedBuffer.getChannelData(1) : null;
    const mixed = new Float32Array(effectiveSamples);

    if (right) {
      const factor = 1 / Math.sqrt(2);
      for (let i = 0; i < effectiveSamples; i++) {
        mixed[i] = (left[i] + right[i]) * factor;
      }
    } else {
      mixed.set(left.subarray(0, effectiveSamples));
    }

    let sum = 0;
    for (let i = 0; i < effectiveSamples; i++) sum += mixed[i];
    const dcOffset = sum / effectiveSamples;
    if (Math.abs(dcOffset) > 1e-4) {
      for (let i = 0; i < effectiveSamples; i++) mixed[i] -= dcOffset;
    }

    let maxPeak = 0;
    for (let i = 0; i < effectiveSamples; i++) {
      const abs = Math.abs(mixed[i]);
      if (abs > maxPeak) maxPeak = abs;
    }

    if (maxPeak > 1e-4) {
      const targetPeak = 0.98;
      let gain = (targetPeak / maxPeak) * volumeBoost;

      if (gain * maxPeak > 1.0) {
        for (let i = 0; i < effectiveSamples; i++) {
          mixed[i] = Math.tanh(mixed[i] * gain);
        }
      } else {
        for (let i = 0; i < effectiveSamples; i++) {
          mixed[i] *= gain;
        }
      }
    }

    const tempBuffer = new AudioBuffer({
      numberOfChannels: 1,
      length: effectiveSamples,
      sampleRate: originalSampleRate,
    });
    tempBuffer.copyToChannel(mixed, 0);

    const targetSampleRate = 16000;
    const targetLength = Math.floor(effectiveDuration * targetSampleRate);
    const offlineCtx = new OfflineAudioContext(
      1,
      targetLength,
      targetSampleRate,
    );
    const src = offlineCtx.createBufferSource();
    src.buffer = tempBuffer;
    src.connect(offlineCtx.destination);
    src.start(0);

    const rendered = await offlineCtx.startRendering();
    return {
      pcm: rendered.getChannelData(0),
      duration: effectiveDuration,
      sampleRate: targetSampleRate,
    };
  }

  async function processAudioFile(file) {
    if (!file) return;

    const validExtensions = [
      ".wav",
      ".mp3",
      ".ogg",
      ".m4a",
      ".aac",
      ".flac",
      ".webm",
    ];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!file.type.startsWith("audio/") && !hasValidExt) {
      showToast(
        "Formato não suportado. Escolha um arquivo .wav, .mp3, .ogg ou .m4a.",
        "error",
      );
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast("O arquivo excede o limite máximo de 8 MB.", "error");
      return;
    }

    showToast(`Otimizando e preparando "${file.name}"...`, "info", 2000);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const decodeCtx = new OrigAudioContext();
      let decodedBuffer;

      try {
        decodedBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
      } catch (decodeErr) {
        await decodeCtx.close();
        throw new Error("Não foi possível decodificar o arquivo de áudio.");
      }
      await decodeCtx.close();

      const originalDuration = decodedBuffer.duration;
      const channelMaxSeconds = await resolveChannelMaxSeconds();
      console.log(
        `[STR8M Audio UserScript] Limite: ${channelMaxSeconds}s, Duração: ${originalDuration.toFixed(2)}s`,
      );

      let targetDuration = originalDuration;

      if (originalDuration > channelMaxSeconds) {
        targetDuration = Math.max(1, channelMaxSeconds - 0.1);
        showToast(
          `Áudio possui ${originalDuration.toFixed(1)}s. Ajustado para ${channelMaxSeconds}s (limite máximo do canal).`,
          "warning",
          4500,
        );
      } else if (originalDuration < 0.4) {
        showToast("O áudio é muito curto (mínimo de 0.5s).", "error");
        return;
      }

      const processed = await enhanceAndResampleAudio(
        decodedBuffer,
        targetDuration,
        currentVolumeBoost,
      );

      pendingAudioData = {
        pcm: processed.pcm,
        duration: processed.duration,
        fileName: file.name,
      };

      console.log(
        `[STR8M Audio UserScript] Áudio pronto: duração=${processed.duration.toFixed(2)}s (${processed.pcm.length} amostras).`,
      );

      initiateRecordingFlow();
    } catch (err) {
      console.error("[STR8M Audio UserScript] Erro no processamento:", err);
      showToast(err.message || "Erro ao processar áudio.", "error");
      pendingAudioData = null;
      isAutomatingRecording = false;
    }
  }

  function initiateRecordingFlow() {
    isAutomatingRecording = true;

    const audioModeBtn = document.querySelector('button[title="Modo áudio"]');
    const isAudioModeActive =
      audioModeBtn &&
      (audioModeBtn.classList.contains("bg-white") ||
        audioModeBtn.classList.contains("text-primary"));

    if (audioModeBtn && !isAudioModeActive) {
      audioModeBtn.click();
    }

    setTimeout(() => {
      const recordBtn =
        document.querySelector('button[title="Gravar áudio"]') ||
        document.querySelector('button[title="Gravar novamente"]') ||
        Array.from(document.querySelectorAll("button")).find((b) => {
          const t = b.textContent?.trim();
          return t === "Começar gravação" || t === "Gravar novamente";
        });

      if (recordBtn) {
        recordBtn.click();
      } else {
        isAutomatingRecording = false;
      }
    }, 120);
  }

  const hiddenFileInput = document.createElement("input");
  hiddenFileInput.type = "file";
  hiddenFileInput.accept = ".wav,.mp3,.ogg,.m4a,.aac,.flac,.webm,audio/*";
  hiddenFileInput.style.display = "none";
  hiddenFileInput.id = "str8m-audio-file-input";
  hiddenFileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      processAudioFile(e.target.files[0]);
      e.target.value = "";
    }
  });
  document.documentElement.appendChild(hiddenFileInput);

  function injectToggleBarButton(toggleGroup) {
    if (!toggleGroup || toggleGroup.querySelector(".str8m-attach-toggle-btn"))
      return;

    const attachBtn = document.createElement("button");
    attachBtn.type = "button";
    attachBtn.className =
      "str8m-attach-toggle-btn flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-white hover:text-primary hover:shadow-sm";
    attachBtn.title =
      "Anexar arquivo de áudio (.wav, .mp3, etc.) com volume normalizado";
    attachBtn.innerHTML = `
      <svg class="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
      </svg>
      <span>Anexar</span>
    `;

    attachBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      hiddenFileInput.click();
    });

    toggleGroup.appendChild(attachBtn);
  }

  function injectAudioBoxArea(audioBox) {
    if (
      !audioBox ||
      audioBox.parentElement.querySelector(".str8m-audio-attachment-panel")
    )
      return;

    const panel = document.createElement("div");
    panel.className =
      "str8m-audio-attachment-panel mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-xs text-slate-600 shadow-sm";
    panel.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
        </div>
        <div>
          <span class="font-bold text-slate-800">Anexar arquivo</span>
          <span class="text-[10px] text-slate-400 block sm:inline sm:ml-1">(.wav, .mp3, etc.)</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1 text-[11px] font-medium text-slate-500" title="Ajuste o volume do áudio para a live">
          <span>Vol:</span>
          <select class="str8m-volume-select rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-700 outline-none focus:border-primary">
            <option value="1.0" ${currentVolumeBoost === 1.0 ? "selected" : ""}>100% (Padrão)</option>
            <option value="1.25" ${currentVolumeBoost === 1.25 ? "selected" : ""}>125% (+25%)</option>
            <option value="1.5" ${currentVolumeBoost === 1.5 ? "selected" : ""}>150% (Max)</option>
          </select>
        </div>

        <button type="button" class="str8m-btn-attach-primary inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90 active:scale-95">
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span>Anexar Áudio</span>
        </button>
      </div>
    `;

    const volSelect = panel.querySelector(".str8m-volume-select");
    if (volSelect) {
      volSelect.addEventListener("change", (e) => {
        currentVolumeBoost = parseFloat(e.target.value);
        localStorage.setItem(
          "str8m_audio_volume_boost",
          String(currentVolumeBoost),
        );
        showToast(
          `Volume calibrado para ${(currentVolumeBoost * 100).toFixed(0)}% com normalização de pico.`,
          "info",
          2000,
        );
      });
    }

    const btn = panel.querySelector(".str8m-btn-attach-primary");
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      hiddenFileInput.click();
    });

    setupDragAndDrop(audioBox);
    setupDragAndDrop(panel);

    audioBox.parentElement.appendChild(panel);
  }

  function setupDragAndDrop(element) {
    if (!element || element.dataset.str8mDropReady) return;
    element.dataset.str8mDropReady = "true";

    ["dragenter", "dragover"].forEach((eventName) => {
      element.addEventListener(
        eventName,
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          element.classList.add("str8m-drag-hover");
        },
        false,
      );
    });

    ["dragleave", "drop"].forEach((eventName) => {
      element.addEventListener(
        eventName,
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          element.classList.remove("str8m-drag-hover");
        },
        false,
      );
    });

    element.addEventListener(
      "drop",
      (e) => {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files[0]) {
          processAudioFile(dt.files[0]);
        }
      },
      false,
    );
  }

  function injectCheckoutArea() {
    const checkoutRecordBtn = Array.from(
      document.querySelectorAll("button"),
    ).find((b) => {
      const t = b.textContent?.trim();
      return t === "Começar gravação" || t === "Gravar novamente";
    });

    if (
      checkoutRecordBtn &&
      !document.querySelector(".str8m-checkout-attach-btn")
    ) {
      const btnContainer = checkoutRecordBtn.parentElement;
      if (btnContainer) {
        const attachBtn = document.createElement("button");
        attachBtn.type = "button";
        attachBtn.className =
          "str8m-checkout-attach-btn rounded-full border border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium h-10 px-4 py-2 transition-colors";
        attachBtn.innerHTML = `
          <svg class="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
          </svg>
          <span>Anexar Áudio (.wav, .mp3)</span>
        `;
        attachBtn.addEventListener("click", (e) => {
          e.preventDefault();
          hiddenFileInput.click();
        });

        btnContainer.appendChild(attachBtn);
      }
    }
  }

  function scanAndInject() {
    const toggleGroup = document.querySelector(
      'button[title="Modo áudio"]',
    )?.parentElement;
    if (toggleGroup) {
      injectToggleBarButton(toggleGroup);
    }

    const audioBoxes = document.querySelectorAll(".bg-\\[\\#eef0f6\\]");
    audioBoxes.forEach((box) => {
      injectAudioBoxArea(box);
    });

    injectCheckoutArea();
  }

  const observer = new MutationObserver(() => {
    scanAndInject();
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
    scanAndInject();
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, { childList: true, subtree: true });
      scanAndInject();
    });
  }

  function showToast(message, type = "info", duration = 3500) {
    let container = document.getElementById("str8m-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "str8m-toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `str8m-toast str8m-toast-${type}`;

    const iconSvg =
      type === "success"
        ? `
        <svg class="h-4 w-4 shrink-0 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `
        : type === "error"
          ? `
        <svg class="h-4 w-4 shrink-0 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      `
          : type === "warning"
            ? `
        <svg class="h-4 w-4 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      `
            : `
        <svg class="h-4 w-4 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      `;

    toast.innerHTML = `
      ${iconSvg}
      <span class="flex-1">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add("str8m-toast-show"), 10);
    setTimeout(() => {
      toast.classList.remove("str8m-toast-show");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
})();
