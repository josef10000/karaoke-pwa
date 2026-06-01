/**
 * Módulo de Parsing de arquivos de texto (.txt) do UltraStar Deluxe.
 * Converte a notação de beats musicais para segundos e mapeia notas de pitch.
 */

// Função principal que lê a string do arquivo e retorna um objeto JSON de música estruturado
export function parseUltraStar(txtContent) {
  const lines = txtContent.split(/\r?\n/);
  
  const song = {
    title: "",
    artist: "",
    bpm: 120,
    gap: 0,
    youtubeId: "",
    notes: []
  };

  let bpm = 120;
  let gap = 0;

  // Processa as linhas do arquivo
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // 1. Processa Cabeçalhos (Headers)
    if (line.startsWith("#")) {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) continue;

      const key = line.substring(1, separatorIndex).toUpperCase();
      const val = line.substring(separatorIndex + 1).trim();

      switch (key) {
        case "TITLE":
          song.title = val;
          break;
        case "ARTIST":
          song.artist = val;
          break;
        case "BPM":
          // Remove possíveis vírgulas se o BPM for decimal
          bpm = parseFloat(val.replace(",", "."));
          song.bpm = bpm;
          break;
        case "GAP":
          gap = parseInt(val, 10) || 0;
          song.gap = gap;
          break;
        case "VIDEO":
        case "MP3":
          // Tenta extrair o ID do YouTube caso o cabeçalho venha com um link
          const ytId = extractYouTubeId(val);
          if (ytId) {
            song.youtubeId = ytId;
          }
          break;
      }
    } 
    // 2. Processa Linhas de Notas
    // Formato UltraStar: : [start_beat] [duration] [pitch_midi] [text]
    // Ou quebra de linha: - [beat]
    else if (line.startsWith(":") || line.startsWith("*") || line.startsWith("F")) {
      const parts = line.split(/\s+/);
      if (parts.length < 4) continue;

      const type = parts[0]; // : (normal), * (golden), F (freestyle)
      const startBeat = parseInt(parts[1], 10);
      const durationBeats = parseInt(parts[2], 10);
      // O tom MIDI na escala do UltraStar precisa de conversão para escala MIDI padrão
      // Na especificação do UltraStar, a nota C4 (MIDI 60) é representada como 0.
      // Portanto, o tom MIDI padrão é: pitch = 60 + pitch_ultrastar
      const pitchUltraStar = parseInt(parts[3], 10);
      const pitchMidi = 60 + pitchUltraStar;

      // Junta o resto das partes para formar o texto da sílaba (que pode conter espaços)
      const text = parts.slice(4).join(" ");

      // Fórmula de conversão de beat para segundos (UltraStar Standard)
      // O tempo de início é: (startBeat * 60) / (BPM * 4) + (GAP / 1000)
      const startTime = (startBeat * 60) / (bpm * 4) + (gap / 1000);
      const durationSeconds = (durationBeats * 60) / (bpm * 4);

      song.notes.push({
        time: parseFloat(startTime.toFixed(3)),
        duration: parseFloat(durationSeconds.toFixed(3)),
        pitch: pitchMidi,
        text: text,
        type: type === "*" ? "golden" : type === "F" ? "freestyle" : "normal"
      });
    }
  }

  // Ordena as notas cronologicamente por garantia
  song.notes.sort((a, b) => a.time - b.time);

  return song;
}

// Extrai o ID do YouTube de URLs de vários formatos, incluindo /watch/, /live/, /shorts/, /embed/ e compartilhamento mobile
export function extractYouTubeId(url) {
  if (!url) return "";
  
  url = url.trim();
  
  // Se já for apenas um ID (11 caracteres alfanuméricos/hifens/underscores)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  // Expressão regular avançada compatível com shorts, transmissões ao vivo, watch normal, embed e links encurtados
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/;
  const match = url.match(regExp);

  return match ? match[1] : "";
}
