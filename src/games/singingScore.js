const SAMPLE_STRIDE = 4;
const MIN_PITCH_HZ = 75;
const MAX_PITCH_HZ = 1000;
const MIN_PITCH_CONFIDENCE = 0.45;
const MIN_PITCH_FRAMES = 30;

export function analyzeVoiceFrame(waveform, sampleRate) {
  const sampleCount = Math.floor(waveform.length / SAMPLE_STRIDE);
  const samples = new Float32Array(sampleCount);
  let mean = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const sample = waveform[index * SAMPLE_STRIDE];
    samples[index] = sample;
    mean += sample;
  }

  mean /= Math.max(1, sampleCount);
  for (let index = 0; index < sampleCount; index += 1) samples[index] -= mean;

  const effectiveSampleRate = sampleRate / SAMPLE_STRIDE;
  const minLag = Math.max(2, Math.floor(effectiveSampleRate / MAX_PITCH_HZ));
  const maxLag = Math.min(sampleCount - 2, Math.ceil(effectiveSampleRate / MIN_PITCH_HZ));
  const correlations = new Float32Array(maxLag + 1);
  let bestLag = 0;
  let bestConfidence = 0;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0;
    let firstPower = 0;
    let secondPower = 0;

    for (let index = 0; index < sampleCount - lag; index += 1) {
      const first = samples[index];
      const second = samples[index + lag];
      correlation += first * second;
      firstPower += first * first;
      secondPower += second * second;
    }

    const denominator = Math.sqrt(firstPower * secondPower);
    const confidence = denominator > 0 ? correlation / denominator : 0;
    correlations[lag] = confidence;
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestLag = lag;
    }
  }

  if (bestLag === 0 || bestConfidence < MIN_PITCH_CONFIDENCE) {
    return { pitch: null, confidence: 0 };
  }

  const left = correlations[bestLag - 1];
  const center = correlations[bestLag];
  const right = correlations[bestLag + 1];
  const curve = left - (2 * center) + right;
  const offset = curve === 0 ? 0 : Math.max(-0.5, Math.min(0.5, 0.5 * (left - right) / curve));
  const refinedLag = bestLag + offset;

  return {
    pitch: effectiveSampleRate / refinedLag,
    confidence: Math.min(1, bestConfidence),
  };
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function percentile(sortedValues, fraction) {
  if (sortedValues.length === 0) return 0;
  return sortedValues[Math.floor((sortedValues.length - 1) * fraction)];
}

function median(values) {
  const sortedValues = [...values].sort((first, second) => first - second);
  if (sortedValues.length === 0) return 0;
  const middle = Math.floor(sortedValues.length / 2);
  return sortedValues.length % 2 === 0
    ? (sortedValues[middle - 1] + sortedValues[middle]) / 2
    : sortedValues[middle];
}

export function calculateSingingScore(frames) {
  const voicedFrames = frames
    .map((frame, index) => ({ ...frame, index }))
    .filter((frame) => frame.pitch !== null && frame.pitch > 0);
  if (voicedFrames.length < MIN_PITCH_FRAMES) {
    return { score: null, insufficientData: true };
  }

  const toneQuality = voicedFrames.length === 0
    ? 0
    : voicedFrames.reduce((total, frame) => total + frame.confidence, 0) / voicedFrames.length;
  const semitones = voicedFrames.map((frame) => 12 * Math.log2(frame.pitch / 440));
  const pitchByIndex = new Map(voicedFrames.map((frame, index) => [frame.index, semitones[index]]));
  const localPitchDeviations = voicedFrames.flatMap((frame) => {
    const neighbors = [];
    for (let index = Math.max(0, frame.index - 2); index <= Math.min(frames.length - 1, frame.index + 2); index += 1) {
      const pitch = pitchByIndex.get(index);
      if (pitch !== undefined) neighbors.push(pitch);
    }
    return neighbors.length >= 3 ? [Math.abs(pitchByIndex.get(frame.index) - median(neighbors))] : [];
  }).sort((first, second) => first - second);
  const pitchJitter = percentile(localPitchDeviations, 0.75);
  const pitchStability = localPitchDeviations.length === 0 ? 0 : clamp(1 - pitchJitter / 1.5);
  const baseScore = Math.round(((toneQuality + pitchStability) / 2) * 100);
  const judgments = [];

  if (toneQuality >= 0.86) {
    judgments.push({ type: 'bonus', points: 5, reason: 'โทนเสียงมีความเป็นคาบชัด' });
  } else if (toneQuality < 0.55) {
    judgments.push({ type: 'penalty', points: -5, reason: 'โทนเสียงมีความเป็นคาบต่ำ' });
  }

  if (pitchStability >= 0.86) {
    judgments.push({ type: 'bonus', points: 5, reason: 'ควบคุมระดับโน้ตได้สม่ำเสมอ' });
  } else if (pitchStability < 0.55) {
    judgments.push({ type: 'penalty', points: -5, reason: 'ระดับโน้ตแกว่งมาก' });
  }

  if (toneQuality >= 0.8 && pitchStability >= 0.8) {
    judgments.push({ type: 'bonus', points: 5, reason: 'โทนเสียงและโน้ตนิ่งต่อเนื่อง' });
  }

  const adjustment = judgments.reduce((total, judgment) => total + judgment.points, 0);
  const score = Math.max(1, Math.min(100, baseScore + adjustment));

  return {
    score,
    baseScore,
    adjustment,
    judgments,
    toneQuality: Math.round(toneQuality * 100),
    pitchStability: Math.round(pitchStability * 100),
  };
}
