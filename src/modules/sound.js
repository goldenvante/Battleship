
let context = null;
let enabled = true;

const ensureContext = () => {
  if (!enabled) return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!context) context = new AudioCtx();
  if (context.state === 'suspended') context.resume();
  return context;
};

function tone({ frequency = 440, duration = 0.12, type = 'sine', volume = 0.06, endFrequency = null, delay = 0 }) {
  const ctx = ensureContext();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(endFrequency, 1), start + duration);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function noise(duration = 0.25, volume = 0.08) {
  const ctx = ensureContext();
  if (!ctx) return;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  gain.gain.value = volume;
  source.buffer = buffer;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start();
}

export const sound = {
  isEnabled: () => enabled,
  toggle() {
    enabled = !enabled;
    if (enabled) ensureContext();
    return enabled;
  },
  ui() {
    tone({ frequency: 620, endFrequency: 880, duration: 0.08, type: 'triangle', volume: 0.035 });
  },
  rotate() {
    tone({ frequency: 320, endFrequency: 520, duration: 0.1, type: 'square', volume: 0.03 });
  },
  place() {
    tone({ frequency: 180, endFrequency: 120, duration: 0.16, type: 'sine', volume: 0.07 });
    tone({ frequency: 440, duration: 0.09, type: 'triangle', volume: 0.03, delay: 0.08 });
  },
  fire() {
    tone({ frequency: 140, endFrequency: 55, duration: 0.22, type: 'sawtooth', volume: 0.055 });
    noise(0.18, 0.05);
  },
  miss() {
    tone({ frequency: 260, endFrequency: 130, duration: 0.28, type: 'sine', volume: 0.05 });
  },
  hit() {
    noise(0.35, 0.1);
    tone({ frequency: 90, endFrequency: 40, duration: 0.36, type: 'sawtooth', volume: 0.08 });
  },
  sink() {
    noise(0.6, 0.11);
    tone({ frequency: 220, endFrequency: 60, duration: 0.7, type: 'triangle', volume: 0.07 });
  },
  turn() {
    tone({ frequency: 520, duration: 0.07, type: 'sine', volume: 0.03 });
    tone({ frequency: 780, duration: 0.09, type: 'sine', volume: 0.03, delay: 0.09 });
  },
  victory() {
    [523, 659, 784, 1046].forEach((frequency, i) =>
      tone({ frequency, duration: 0.32, type: 'triangle', volume: 0.055, delay: i * 0.13 }),
    );
  },
  defeat() {
    [392, 330, 262, 196].forEach((frequency, i) =>
      tone({ frequency, duration: 0.4, type: 'sawtooth', volume: 0.045, delay: i * 0.16 }),
    );
  },
};
