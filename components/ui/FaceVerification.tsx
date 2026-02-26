'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

declare global {
  interface Window { faceapi: any }
}

type LivenessStep = 'loading' | 'center' | 'turn_right' | 'turn_left' | 'complete' | 'error'

interface FaceVerificationProps {
  mode: 'register' | 'verify'
  onSuccess: (descriptor?: Float32Array) => void
  onCancel: () => void
  title?: string
  subtitle?: string
}

const STEP_CONFIG: Record<string, { instruction: string; sub: string; icon: string; color: string }> = {
  loading:    { instruction: 'Loading face detection...',     sub: 'Just a moment',                          icon: '⚙️', color: '#6366f1' },
  center:     { instruction: 'Look straight at the camera',  sub: 'Centre your face and hold still',        icon: '👁️', color: '#6366f1' },
  turn_right: { instruction: 'Turn your head right',         sub: 'Slowly turn right until captured',       icon: '➡️', color: '#f59e0b' },
  turn_left:  { instruction: 'Turn your head left',          sub: 'Slowly turn left until captured',        icon: '⬅️', color: '#f59e0b' },
  complete:   { instruction: 'All done!',                    sub: 'Face captured successfully',             icon: '✅', color: '#10b981' },
  error:      { instruction: 'Something went wrong',         sub: 'Please try again',                       icon: '❌', color: '#ef4444' },
}

const LIVENESS_STEPS: LivenessStep[] = ['center', 'turn_right', 'turn_left']
const REQUIRED_HOLD_FRAMES = 18

function loadFaceApiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.faceapi) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load face-api.js'))
    document.head.appendChild(script)
  })
}

export default function FaceVerification({ mode, onSuccess, onCancel, title, subtitle }: FaceVerificationProps) {
  const videoRef         = useRef<HTMLVideoElement>(null)
  const canvasRef        = useRef<HTMLCanvasElement>(null)
  const streamRef        = useRef<MediaStream | null>(null)
  const detectionLoopRef = useRef<number | null>(null)
  const stepTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stepIndexRef     = useRef(0)
  const stepHoldRef      = useRef(0)
  const advancingRef     = useRef(false)
  const descriptorRef    = useRef<Float32Array | null>(null)

  const [step,         setStep]         = useState<LivenessStep>('loading')
  const [progress,     setProgress]     = useState(0)
  const [faceDetected, setFaceDetected] = useState(false)
  const [errorMsg,     setErrorMsg]     = useState('')
  const [centerDone,   setCenterDone]   = useState(false)
  const [rightDone,    setRightDone]    = useState(false)
  const [leftDone,     setLeftDone]     = useState(false)

  const cleanup = useCallback(() => {
    if (detectionLoopRef.current) cancelAnimationFrame(detectionLoopRef.current)
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
  }, [])

  // Load models + start camera
  useEffect(() => {
    const init = async () => {
      try {
        await loadFaceApiScript()
        const faceapi = window.faceapi
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights'
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])
        startCamera()
      } catch {
        setErrorMsg('Could not load face detection. Check your internet connection.')
        setStep('error')
      }
    }
    init()
    return cleanup
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current!.play()
          stepIndexRef.current = 0
          stepHoldRef.current  = 0
          advancingRef.current = false
          setStep('center')
          startDetectionLoop()
        }
      }
    } catch {
      setErrorMsg('Camera access denied. Please allow camera access and try again.')
      setStep('error')
    }
  }

  const advanceStep = () => {
    if (advancingRef.current) return
    advancingRef.current = true

    const current = LIVENESS_STEPS[stepIndexRef.current]
    if (current === 'center')     setCenterDone(true)
    if (current === 'turn_right') setRightDone(true)
    if (current === 'turn_left')  setLeftDone(true)

    const nextIndex = stepIndexRef.current + 1

    if (nextIndex >= LIVENESS_STEPS.length) {
      if (detectionLoopRef.current) cancelAnimationFrame(detectionLoopRef.current)
      setStep('complete')
      setProgress(100)
      stepTimerRef.current = setTimeout(() => {
        cleanup()
        onSuccess(descriptorRef.current || undefined)
      }, 1000)
    } else {
      stepIndexRef.current = nextIndex
      setStep(LIVENESS_STEPS[nextIndex])
      setProgress(0)
      stepHoldRef.current  = 0
      setTimeout(() => { advancingRef.current = false }, 600)
    }
  }

  const startDetectionLoop = () => {
    const loop = async () => {
      if (!videoRef.current || !canvasRef.current || !window.faceapi) {
        detectionLoopRef.current = requestAnimationFrame(loop)
        return
      }

      const faceapi = window.faceapi
      const video   = videoRef.current
      const canvas  = canvasRef.current

      if (video.readyState < 2) {
        detectionLoopRef.current = requestAnimationFrame(loop)
        return
      }

      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 })

      try {
        const result = await faceapi
          .detectSingleFace(video, options)
          .withFaceLandmarks(true)
          .withFaceDescriptor()

        canvas.width  = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')!
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (result) {
          setFaceDetected(true)

          // Passively store descriptor
          descriptorRef.current = result.descriptor

          const currentStep = LIVENESS_STEPS[stepIndexRef.current]
          const color = STEP_CONFIG[currentStep]?.color || '#6366f1'

          // Draw face box
          const { box } = result.detection
          ctx.strokeStyle = color
          ctx.lineWidth   = 3
          ctx.strokeRect(box.x, box.y, box.width, box.height)

          if (!advancingRef.current) {
            const passed = checkCondition(result, currentStep)

            if (passed) {
              stepHoldRef.current++
              setProgress(Math.round(Math.min(stepHoldRef.current / REQUIRED_HOLD_FRAMES, 1) * 100))
              if (stepHoldRef.current >= REQUIRED_HOLD_FRAMES) {
                advanceStep()
              }
            } else {
              stepHoldRef.current = Math.max(0, stepHoldRef.current - 2)
              setProgress(Math.round((stepHoldRef.current / REQUIRED_HOLD_FRAMES) * 100))
            }
          }
        } else {
          setFaceDetected(false)
          stepHoldRef.current = Math.max(0, stepHoldRef.current - 1)
        }
      } catch { /* ignore frame errors */ }

      detectionLoopRef.current = requestAnimationFrame(loop)
    }
    detectionLoopRef.current = requestAnimationFrame(loop)
  }

  const checkCondition = (result: any, currentStep: LivenessStep): boolean => {
    const positions = result.landmarks.positions
    const box       = result.detection.box
    const nose      = positions[30]
    const centerX   = box.x + box.width / 2

    if (currentStep === 'center') {
      return Math.abs(nose.x - centerX) < box.width * 0.15
    }
    if (currentStep === 'turn_right') {
      // Video is mirrored — user turning right = nose moves left in raw coords
      return nose.x < centerX - box.width * 0.12
    }
    if (currentStep === 'turn_left') {
      // User turning left = nose moves right in raw coords
      return nose.x > centerX + box.width * 0.12
    }
    return false
  }

  const currentConfig     = STEP_CONFIG[step]
  const currentStepNumber = step === 'complete' ? LIVENESS_STEPS.length : stepIndexRef.current + 1

  const stepRows = [
    { id: 'center',     label: 'Face centered', done: centerDone },
    { id: 'turn_right', label: 'Turn right',    done: rightDone  },
    { id: 'turn_left',  label: 'Turn left',     done: leftDone   },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {title || (mode === 'register' ? '🔐 Face Registration' : '🔐 Face Verification')}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {subtitle || (mode === 'register'
                  ? 'Complete 3 quick checks to secure your account'
                  : 'Complete 3 quick checks to authorise your withdrawal')}
              </p>
            </div>
            <button
              onClick={() => { cleanup(); onCancel() }}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4"
            >
              ×
            </button>
          </div>

          {/* Progress bar */}
          {step !== 'loading' && step !== 'error' && (
            <div className="flex gap-2 mt-4">
              {LIVENESS_STEPS.map((s, i) => (
                <div
                  key={s}
                  className="h-1.5 flex-1 rounded-full transition-all duration-500"
                  style={{
                    backgroundColor:
                      i < stepIndexRef.current || step === 'complete'
                        ? '#10b981'
                        : i === stepIndexRef.current
                        ? currentConfig.color
                        : '#e5e7eb',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Camera */}
        <div className="relative mx-6 mb-4 rounded-2xl overflow-hidden bg-gray-900" style={{ aspectRatio: '4/3' }}>
          <video
            ref={videoRef}
            autoPlay muted playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none"
          />

          {/* Oval guide */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="rounded-full border-4 transition-all duration-300"
              style={{
                width: '55%',
                height: '75%',
                borderColor: faceDetected
                  ? (step === 'complete' ? '#10b981' : currentConfig.color)
                  : 'rgba(255,255,255,0.4)',
                boxShadow: faceDetected
                  ? `0 0 0 9999px rgba(0,0,0,0.45)`
                  : `0 0 0 9999px rgba(0,0,0,0.6)`,
              }}
            />
          </div>

          {/* Directional arrow overlay */}
          {step === 'turn_right' && !rightDone && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-amber-500/80 flex items-center justify-center animate-pulse">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
                </svg>
              </div>
              <span className="text-white text-xs font-bold">RIGHT</span>
            </div>
          )}
          {step === 'turn_left' && !leftDone && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-amber-500/80 flex items-center justify-center animate-pulse">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
                </svg>
              </div>
              <span className="text-white text-xs font-bold">LEFT</span>
            </div>
          )}

          {/* Complete overlay */}
          {step === 'complete' && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-500/80">
              <div className="text-center text-white">
                <div className="text-6xl mb-2">✅</div>
                <p className="font-bold text-xl">Done!</p>
              </div>
            </div>
          )}

          {/* No face warning */}
          {!faceDetected && step !== 'loading' && step !== 'complete' && step !== 'error' && (
            <div className="absolute bottom-3 inset-x-3">
              <div className="bg-black/70 text-white text-xs text-center py-2 px-3 rounded-lg">
                👤 Position your face inside the oval
              </div>
            </div>
          )}
        </div>

        {/* Bottom area */}
        <div className="px-6 pb-6 space-y-3">
          {step === 'error' ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-red-600 font-medium">{errorMsg}</p>
              <button
                onClick={() => { setStep('loading'); setErrorMsg(''); startCamera() }}
                className="mt-3 text-sm text-red-600 underline"
              >
                Try again
              </button>
            </div>
          ) : step === 'loading' ? (
            <div className="text-center py-4">
              <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-gray-600 text-sm">Loading face detection models...</p>
            </div>
          ) : (
            <>
              {/* Instruction card */}
              <div
                className="rounded-xl p-3 text-center transition-all duration-300"
                style={{
                  backgroundColor: currentConfig.color + '15',
                  border: `1px solid ${currentConfig.color}30`,
                }}
              >
                <span className="text-2xl">{currentConfig.icon}</span>
                <p className="font-semibold text-gray-800 mt-1 text-sm">{currentConfig.instruction}</p>
                <p className="text-gray-500 text-xs mt-0.5">{currentConfig.sub}</p>
              </div>

              {/* Hold progress bar */}
              {step !== 'complete' && faceDetected && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Hold position</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-100"
                      style={{ width: `${progress}%`, backgroundColor: currentConfig.color }}
                    />
                  </div>
                </div>
              )}

              {/* Step status rows */}
              <div className="flex flex-col gap-1.5">
                {stepRows.map(({ id, label, done }) => {
                  const active = step === id && !done
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300"
                      style={{
                        background: done ? 'rgba(16,185,129,0.08)' : active ? 'rgba(99,102,241,0.08)' : 'transparent',
                        border: done ? '1px solid rgba(16,185,129,0.2)' : active ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: done ? '#10b981' : active ? currentConfig.color : '#e5e7eb' }}
                      >
                        {done ? (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                          </svg>
                        ) : (
                          <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
                        )}
                      </div>
                      <span
                        className="text-sm font-medium flex-1"
                        style={{ color: done ? '#059669' : active ? '#4338ca' : '#9ca3af' }}
                      >
                        {label}
                      </span>
                      <span className="text-xs" style={{ color: done ? '#059669' : active ? '#6366f1' : 'transparent' }}>
                        {done ? 'Captured ✓' : active ? 'Waiting...' : '·'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          <button
            onClick={() => { cleanup(); onCancel() }}
            className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}