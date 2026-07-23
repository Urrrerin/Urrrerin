/** 轻量反馈音效（Web Audio，无需音频文件） */

type SfxKind = 'reveal' | 'remember' | 'fuzzy' | 'forgot' | 'next' | 'mastered' | 'tap'

let ctx: AudioContext | null = null

/** 相对上一版再提高约 70% */
const VOL = 1.3 * 1.7

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(
  frequency: number,
  start: number,
  duration: number,
  type: OscillatorType,
  gainPeak: number,
) {
  const audio = getCtx()
  if (!audio) return

  const peak = Math.min(gainPeak * VOL, 0.28)
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.018)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

export function playSfx(kind: SfxKind): void {
  try {
    const audio = getCtx()
    if (!audio) return
    const t = audio.currentTime

    switch (kind) {
      case 'reveal':
        tone(523.25, t, 0.09, 'sine', 0.045)
        tone(659.25, t + 0.07, 0.12, 'sine', 0.04)
        break
      case 'remember':
        tone(523.25, t, 0.08, 'triangle', 0.05)
        tone(659.25, t + 0.06, 0.09, 'triangle', 0.045)
        tone(783.99, t + 0.13, 0.14, 'sine', 0.04)
        break
      case 'fuzzy':
        tone(392, t, 0.1, 'triangle', 0.04)
        tone(440, t + 0.08, 0.12, 'sine', 0.035)
        break
      case 'forgot':
        tone(246.94, t, 0.14, 'sine', 0.04)
        tone(196, t + 0.07, 0.16, 'triangle', 0.03)
        break
      case 'next':
        tone(587.33, t, 0.08, 'sine', 0.04)
        tone(740.99, t + 0.06, 0.1, 'sine', 0.035)
        break
      case 'mastered':
        tone(523.25, t, 0.07, 'triangle', 0.045)
        tone(659.25, t + 0.05, 0.08, 'triangle', 0.04)
        tone(783.99, t + 0.11, 0.1, 'sine', 0.04)
        tone(1046.5, t + 0.18, 0.16, 'sine', 0.035)
        break
      case 'tap':
      default:
        tone(660, t, 0.05, 'sine', 0.03)
        break
    }
  } catch {
    // 忽略自动播放限制等错误
  }
}
