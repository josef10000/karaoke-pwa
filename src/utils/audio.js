/**
 * Módulo de Captura e Processamento de Áudio (Pitch Detection)
 * Utiliza a Web Audio API nativa e algoritmo de Autocorrelação de alta performance.
 */

// Algoritmo de autocorrelação para estimar a frequência fundamental (Hz) de um buffer de áudio
export function detectPitch(buffer, sampleRate, threshold = 0.015) {
  const SIZE = buffer.length;
  let rms = 0;

  // 1. Calcula o RMS (Root Mean Square) para medir o volume/energia do sinal
  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

  // Se o volume estiver abaixo do limiar (silêncio ou ruído muito baixo), ignora
  if (rms < threshold) {
    return -1;
  }

  // 2. Aplica recorte de pico para limpar o sinal (melhora a detecção)
  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = SIZE - 1; i >= SIZE / 2; i--) {
    if (Math.abs(buffer[i]) < thres) {
      r2 = i;
      break;
    }
  }

  const signal = buffer.slice(r1, r2);
  const signalSize = signal.length;

  // 3. Autocorrelação matemática
  const c = new Float32Array(signalSize);
  for (let i = 0; i < signalSize; i++) {
    for (let j = 0; j < signalSize - i; j++) {
      c[i] = c[i] + signal[j] * signal[j + i];
    }
  }

  // Acha o primeiro pico significativo
  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < signalSize; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  let T0 = maxpos;

  // Interpolação parabólica para ajuste fino do pico
  const x1 = c[T0 - 1];
  const x2 = c[T0];
  const x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  // Retorna a frequência fundamental encontrada em Hertz
  return sampleRate / T0;
}

// Converte frequência (Hz) em número de nota MIDI
export function hzToMidi(frequency) {
  if (!frequency || frequency <= 0 || isNaN(frequency)) return -1;
  const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  return Math.round(noteNum) + 69;
}

// Dicionário de nomes de notas musicais MIDI
const NOTE_STRINGS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Converte nota MIDI em representação textual (ex: 60 -> "C4")
export function midiToNoteName(midiNote) {
  if (midiNote < 0 || isNaN(midiNote)) return "-";
  const noteIndex = midiNote % 12;
  const octave = Math.floor(midiNote / 12) - 1;
  return NOTE_STRINGS[noteIndex] + octave;
}

// Inicializador da Web Audio API para gravação
export async function initAudioStream(onAudioProcess, thresholdGetter) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false, // Desliga para maior precisão de notas musicais singulares
        noiseSuppression: false,
        autoGainControl: false
      }
    });

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    
    analyser.fftSize = 2048; // Alta resolução de buffer para maior precisão de tom
    source.connect(analyser);

    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    const sampleRate = audioContext.sampleRate;

    let isRunning = true;

    // Loop recursivo para obter dados do microfone continuamente
    const draw = () => {
      if (!isRunning) return;
      
      analyser.getFloatTimeDomainData(dataArray);
      
      // Obtém o limiar (threshold) de sensibilidade atual configurado na tela
      const currentThreshold = thresholdGetter ? thresholdGetter() : 0.015;
      
      const pitchHz = detectPitch(dataArray, sampleRate, currentThreshold);
      const midiNote = hzToMidi(pitchHz);
      const noteName = midiToNoteName(midiNote);

      // Callback enviando os dados processados para a interface em React
      onAudioProcess({
        pitchHz,
        midiNote,
        noteName,
        rms: calculateRMS(dataArray)
      });

      requestAnimationFrame(draw);
    };

    draw();

    // Retorna uma função para encerrar a gravação
    return {
      stop: () => {
        isRunning = false;
        stream.getTracks().forEach(track => track.stop());
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }
      },
      audioContext
    };
  } catch (err) {
    console.error("Erro ao acessar microfone: ", err);
    throw err;
  }
}

// Função auxiliar para calcular o RMS (volume médio) de forma independente
function calculateRMS(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}
