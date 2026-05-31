/**
 * Módulo de Lógica de Pontuação em Tempo Real.
 * Compara a nota cantada (MIDI) com a nota original e calcula pontuações acumulativas.
 */

// Compara a nota cantada com a nota alvo da música
// Retorna um objeto indicando se foi 'perfect', 'good' ou 'miss'
export function evaluatePitch(sungNote, targetNote, toleranceSemitones = 1.2) {
  if (sungNote < 0 || targetNote < 0) {
    return { rating: 'miss', points: 0 };
  }

  // Diferença absoluta em semitones
  // Como a voz masculina e feminina têm alturas diferentes (oitavas diferentes),
  // nós ignoramos a oitava e comparamos apenas a classe da nota musical (C, D, E, etc.)
  // para dar uma pontuação de oitava neutra (Octave Neutral Scoring)!
  // Isso é essencial para que qualquer pessoa (homens, mulheres, crianças) consiga pontuar sem esforço!
  const sungClass = sungNote % 12;
  const targetClass = targetNote % 12;

  // Calcula a menor distância circular em semitones
  let diff = Math.abs(sungClass - targetClass);
  if (diff > 6) {
    diff = 12 - diff;
  }

  if (diff <= toleranceSemitones) {
    return { rating: 'perfect', points: 100 }; // Faixa perfeita (dentro de ~1 semitom)
  } else if (diff <= toleranceSemitones * 2.2) {
    return { rating: 'good', points: 50 };     // Faixa boa (dentro de ~2.5 semitons)
  }

  return { rating: 'miss', points: 0 };
}

// Retorna uma mensagem de feedback dinâmico baseada no rating da nota
export function getFeedbackStyle(rating) {
  switch (rating) {
    case 'perfect':
      return { text: 'PERFEITO!', color: 'var(--color-perfect)' };
    case 'good':
      return { text: 'BOM!', color: 'var(--color-secondary)' };
    default:
      return { text: '', color: 'transparent' };
  }
}

// Retorna feedback textual final para o painel de resultados com base no percentual (0 a 100)
export function getFinalFeedback(scorePercent) {
  if (scorePercent >= 95) return { rank: "SS", message: "Fenomenal! Uma performance de estrela mundial!", emoji: "🌟" };
  if (scorePercent >= 85) return { rank: "S", message: "Espetacular! Você cantou com extrema precisão!", emoji: "🎤" };
  if (scorePercent >= 70) return { rank: "A", message: "Muito bom! Mostrou afinação e ritmo excelentes!", emoji: "👏" };
  if (scorePercent >= 50) return { rank: "B", message: "Bom trabalho! Continue praticando para afinar mais!", emoji: "👍" };
  return { rank: "C", message: "Valeu a tentativa! O importante é se divertir e soltar a voz!", emoji: "🎵" };
}

// Acha a nota musical alvo para o tempo atual do player em segundos
export function findTargetNoteAtTime(time, notesList) {
  if (!notesList || notesList.length === 0) return null;

  // Busca binária ou linear simples (as notas estão ordenadas e são poucas por música)
  for (let i = 0; i < notesList.length; i++) {
    const note = notesList[i];
    // Se o tempo atual está dentro do intervalo da nota
    if (time >= note.time && time <= (note.time + note.duration)) {
      return note;
    }
  }
  return null;
}
