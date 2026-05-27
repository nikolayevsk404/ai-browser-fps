let context: AudioContext | null = null;
let masterGain: GainNode | null = null;
let volume = 0.45;

export function setMasterVolume(nextVolume: number): void {
  volume = nextVolume;

  if (masterGain) {
    masterGain.gain.value = volume;
  }
}

export function playShotSound(weapon: "knife" | "pistol" | "rifle" | "sniper" = "rifle"): void {
  if (weapon === "knife") {
    playTone({ frequency: 260, duration: 0.05, type: "triangle", gain: 0.09 });
    playNoise(0.03, 0.06);
    return;
  }

  const profile = {
    pistol: { frequency: 130, duration: 0.055, gain: 0.14, noise: 0.08 },
    rifle: { frequency: 95, duration: 0.07, gain: 0.18, noise: 0.12 },
    sniper: { frequency: 62, duration: 0.12, gain: 0.24, noise: 0.18 }
  }[weapon];

  playTone({ frequency: profile.frequency, duration: profile.duration, type: "square", gain: profile.gain });
  playNoise(profile.duration, profile.noise);
}

export function playReloadSound(): void {
  playTone({ frequency: 180, duration: 0.04, type: "triangle", gain: 0.07 });
  window.setTimeout(() => playTone({ frequency: 260, duration: 0.035, type: "triangle", gain: 0.06 }), 120);
}

export function playHitSound(): void {
  playTone({ frequency: 520, duration: 0.06, type: "triangle", gain: 0.12 });
}

export function playBombBeep(): void {
  playTone({ frequency: 880, duration: 0.08, type: "sine", gain: 0.1 });
}

export function playRoundSound(winner: string): void {
  playTone({ frequency: winner === "CT" ? 420 : 310, duration: 0.18, type: "sawtooth", gain: 0.1 });
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  context ??= new AudioContext();
  masterGain ??= context.createGain();
  masterGain.gain.value = volume;
  masterGain.connect(context.destination);
  return context;
}

function playTone({
  duration,
  frequency,
  gain,
  type
}: {
  duration: number;
  frequency: number;
  gain: number;
  type: OscillatorType;
}): void {
  const audio = getContext();

  if (!audio || !masterGain) {
    return;
  }

  void audio.resume();
  const oscillator = audio.createOscillator();
  const envelope = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  envelope.gain.setValueAtTime(gain, audio.currentTime);
  envelope.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  oscillator.connect(envelope);
  envelope.connect(masterGain);
  oscillator.start();
  oscillator.stop(audio.currentTime + duration);
}

function playNoise(duration: number, gain: number): void {
  const audio = getContext();

  if (!audio || !masterGain) {
    return;
  }

  const buffer = audio.createBuffer(1, audio.sampleRate * duration, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }

  const source = audio.createBufferSource();
  const envelope = audio.createGain();
  source.buffer = buffer;
  envelope.gain.setValueAtTime(gain, audio.currentTime);
  envelope.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  source.connect(envelope);
  envelope.connect(masterGain);
  source.start();
}
