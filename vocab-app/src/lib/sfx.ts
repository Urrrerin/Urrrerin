/** 反馈音效（Web Audio）。按「系统音量约 30% 即可听清」标定 */

type SfxKind = 'reveal' | 'remember' | 'fuzzy' | 'forgot' | 'next' | 'mastered' | 'tap'

let ctx: AudioContext | null = null
let master: GainNode | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) {
    ctx = new AC()
    master = ctx.createGain()
    // 主音量：偏响，短促提示音不易刺耳
    master.gain.value = 0.85
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(
  frequency: number,
  start: number,
  duration: number,
  type: OscillatorType,
  peak: number,
) {
  const audio = getCtx()
  if (!audio || !master) return

  const osc = audio.createOscillator()
  const gain = audio.createGain()
  const attack = Math.min(0.012, duration * 0.2)
  const hold = Math.max(duration * 0.45, 0.04)
  const releaseStart = start + attack + hold
  const end = start + duration

  osc.type = type
  osc.frequency.setValueAtTime(frequency, start)

  // 线性包络：峰值保持更久，手机上更「听得见」
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(peak, start + attack)
  gain.gain.setValueAtTime(peak, releaseStart)
  gain.gain.linearRampToValueAtTime(0, end)

  osc.connect(gain)
  gain.connect(master)
  osc.start(start)
  osc.stop(end + 0.02)
}

/** 叠一层同频方波，增加穿透力（仍受 peak 控制） */
function blip(
  frequency: number,
  start: number,
  duration: number,
  peak: number,
) {
  tone(frequency, start, duration, 'triangle', peak)
  tone(frequency, start, duration * 0.85, 'square', peak * 0.28)
}

export function playSfx(kind: SfxKind): void {
  try {
    const audio = getCtx()
    if (!audio) return
    const t = audio.currentTime

    switch (kind) {
      case 'reveal':
        blip(523.25, t, 0.12, 0.55)
        blip(659.25, t + 0.08, 0.14, 0.5)
        break
      case 'remember':
        blip(523.25, t, 0.11, 0.55)
        blip(659.25, t + 0.07, 0.12, 0.5)
        blip(783.99, t + 0.15, 0.16, 0.48)
        break
      case 'fuzzy':
        blip(392, t, 0.13, 0.48)
        blip(440, t + 0.09, 0.14, 0.45)
        break
      case 'forgot':
        tone(246.94, t, 0.16, 'triangle', 0.5)
        tone(196, t + 0.08, 0.18, 'sine', 0.42)
        break
      case 'next':
        blip(587.33, t, 0.11, 0.55)
        blip(740.99, t + 0.07, 0.13, 0.5)
        break
      case 'mastered':
        blip(523.25, t, 0.1, 0.55)
        blip(659.25, t + 0.06, 0.11, 0.5)
        blip(783.99, t + 0.13, 0.12, 0.48)
        blip(1046.5, t + 0.2, 0.18, 0.45)
        break
      case 'tap':
      default:
        blip(660, t, 0.08, 0.5)
        break
    }
  } catch {
    // 忽略自动播放限制等错误
  }
}
