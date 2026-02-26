'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

// face-api.js is loaded via script tag
declare global {
  interface Window {
    faceapi: any
  }
}

type LivenessStep = 'loading' | 'center' | 'turn_left' | 'turn_right' | 'blink' | 'open_mouth' | 'complete' | 'error'

interface FaceVerificationProps {
  mode: 'register' | 'verify'
  onSuccess: (descriptor?: Float32Array) => void
  onCancel: () => void
  title?: string
  subtitle?: string
}

const STEP_CONFIG: Record<string, { instruction: string; icon: string; color: string }> = {
  loading:     { instruction: 'Loading face detection models...', icon: '⚙️', color: '#6366f1' },
  center:      { instruction: 'Look straight at the camera', icon: '👁️', color: '#6366f1' },
  turn_left:   { instruction: 'Slowly turn your head LEFT', icon: '⬅️', color: '#f59e0b' },
  turn_right:  { instruction: 'Slowly turn your head RIGHT', icon: '➡️', color: '#f59e0b' },
  blink:       { instruction: 'Blink your eyes slowly', icon: '👀', color: '#8b5cf6' },
  open_mouth:  { instruction: 'Open your mouth wide', icon: '😮', color: '#ec4899' },
  complete:    { instruction: 'Verification complete!', icon: '✅', color: '#10b981' },
  error:       { instruction: 'Error detected. Please try again.', icon: '❌', color: '#ef4444' },
}

// Load face-api.js script dynamically
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectionLoopRef = useRef<number | null>(null)
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [step, setStep] = useState<LivenessStep>('loading')
  const [progress, setProgress] = useState(0)
  const [faceDetected, setFaceDetected] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [capturedDescriptor, setCapturedDescriptor] = useState<Float32Array | null>(null)

  // Step sequence
  const LIVENESS_STEPS: LivenessStep[] = ['center', 'turn_left', 'turn_right', 'blink', 'open_mouth']
  const stepIndexRef = useRef(0)
  const stepHoldCountRef = useRef(0) // frames held in valid position
  const REQUIRED_HOLD_FRAMES = 18 // ~0.6s at 30fps

  const cleanup = useCallback(() => {
    if (detectionLoopRef.current) cancelAnimationFrame(detectionLoopRef.current)
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
  }, [])

  // Load models
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
        setModelsLoaded(true)
        startCamera()
      } catch (err) {
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
          setStep('center')
          stepIndexRef.current = 0
          startDetectionLoop()
        }
      }
    } catch {
      setErrorMsg('Camera access denied. Please allow camera access and try again.')
      setStep('error')
    }
  }

  const startDetectionLoop = () => {
    const loop = async () => {
      if (!videoRef.current || !canvasRef.current || !window.faceapi) {
        detectionLoopRef.current = requestAnimationFrame(loop)
        return
      }
      const faceapi = window.faceapi
      const video = videoRef.current
      const canvas = canvasRef.current

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

        // Draw on canvas overlay
        const dims = { width: video.videoWidth, height: video.videoHeight }
        canvas.width = dims.width
        canvas.height = dims.height
        const ctx = canvas.getContext('2d')!
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (result) {
          setFaceDetected(true)
          const { box } = result.detection
          const currentStep = LIVENESS_STEPS[stepIndexRef.current]

          // Draw face box
          const color = STEP_CONFIG[currentStep]?.color || '#6366f1'
          ctx.strokeStyle = color
          ctx.lineWidth = 3
          ctx.strokeRect(box.x, box.y, box.width, box.height)

          // Check liveness condition
          const passed = checkLivenessCondition(result, currentStep)

          if (passed) {
            stepHoldCountRef.current++
            const holdProgress = Math.min(stepHoldCountRef.current / REQUIRED_HOLD_FRAMES, 1)
            setProgress(Math.round(holdProgress * 100))

            if (stepHoldCountRef.current >= REQUIRED_HOLD_FRAMES) {
              // Step passed — capture descriptor on final step
              if (currentStep === 'open_mouth') {
                setCapturedDescriptor(result.descriptor)
              }
              advanceStep()
              stepHoldCountRef.current = 0
            }
          } else {
            stepHoldCountRef.current = Math.max(0, stepHoldCountRef.current - 2)
            setProgress(Math.round((stepHoldCountRef.current / REQUIRED_HOLD_FRAMES) * 100))
          }
        } else {
          setFaceDetected(false)
          stepHoldCountRef.current = Math.max(0, stepHoldCountRef.current - 1)
        }
      } catch { /* ignore frame errors */ }

      detectionLoopRef.current = requestAnimationFrame(loop)
    }
    detectionLoopRef.current = requestAnimationFrame(loop)
  }

  const checkLivenessCondition = (result: any, currentStep: LivenessStep): boolean => {
    const landmarks = result.landmarks
    const positions = landmarks.positions

    if (currentStep === 'center') {
      // Check nose is roughly centered relative to face box
      const box = result.detection.box
      const nose = positions[30]
      const centerX = box.x + box.width / 2
      return Math.abs(nose.x - centerX) < box.width * 0.15
    }

    if (currentStep === 'turn_left') {
      // Left turn: nose shifts LEFT relative to face center
      const box = result.detection.box
      const nose = positions[30]
      const centerX = box.x + box.width / 2
      return nose.x < centerX - box.width * 0.12
    }

    if (currentStep === 'turn_right') {
      // Right turn: nose shifts RIGHT relative to face center
      const box = result.detection.box
      const nose = positions[30]
      const centerX = box.x + box.width / 2
      return nose.x > centerX + box.width * 0.12
    }

    if (currentStep === 'blink') {
      // Eye aspect ratio — low = eyes closed
      const leftEye = positions.slice(36, 42)
      const rightEye = positions.slice(42, 48)
      const ear = (eyeAspectRatio(leftEye) + eyeAspectRatio(rightEye)) / 2
      return ear < 0.18
    }

    if (currentStep === 'open_mouth') {
      // Mouth aspect ratio — high = mouth open
      const mouth = positions.slice(60, 68)
      const mar = mouthAspectRatio(mouth)
      return mar > 0.45
    }

    return false
  }

  const eyeAspectRatio = (eye: any[]): number => {
    const v1 = dist(eye[1], eye[5])
    const v2 = dist(eye[2], eye[4])
    const h = dist(eye[0], eye[3])
    return (v1 + v2) / (2 * h)
  }

  const mouthAspectRatio = (mouth: any[]): number => {
    const v1 = dist(mouth[2], mouth[6])
    const v2 = dist(mouth[3], mouth[5])
    const h = dist(mouth[0], mouth[4])
    return (v1 + v2) / (2 * h)
  }

  const dist = (a: any, b: any): number => {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
  }

  const advanceStep = () => {
    const nextIndex = stepIndexRef.current + 1
    if (nextIndex >= LIVENESS_STEPS.length) {
      // All steps complete
      if (detectionLoopRef.current) cancelAnimationFrame(detectionLoopRef.current)
      setStep('complete')
      setProgress(100)
      stepTimerRef.current = setTimeout(() => {
        cleanup()
        // capturedDescriptor is set via state but we need latest value
        setCapturedDescriptor(prev => {
          onSuccess(prev || undefined)
          return prev
        })
      }, 1200)
    } else {
      stepIndexRef.current = nextIndex
      setStep(LIVENESS_STEPS[nextIndex])
      setProgress(0)
    }
  }

  const currentConfig = STEP_CONFIG[step]
  const totalSteps = LIVENESS_STEPS.length
  const currentStepNumber = step === 'complete' ? totalSteps : (stepIndexRef.current + 1)

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
                  ? 'We\'ll scan your face to protect your account'
                  : 'Verify your identity to proceed with withdrawal')}
              </p>
            </div>
            <button
              onClick={() => { cleanup(); onCancel() }}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4"
            >
              ×
            </button>
          </div>

          {/* Step progress dots */}
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
                        : '#e5e7eb'
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Camera view */}
        <div className="relative mx-6 mb-4 rounded-2xl overflow-hidden bg-gray-900" style={{ aspectRatio: '4/3' }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none"
          />

          {/* Oval face guide overlay */}
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

        {/* Instruction area */}
        <div className="px-6 pb-6 space-y-4">
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
              {/* Current instruction */}
              <div
                className="rounded-xl p-4 text-center transition-all duration-300"
                style={{ backgroundColor: currentConfig.color + '15', borderColor: currentConfig.color + '30', border: '1px solid' }}
              >
                <span className="text-3xl">{currentConfig.icon}</span>
                <p className="font-semibold text-gray-800 mt-2 text-sm">{currentConfig.instruction}</p>
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

              {/* Step counter */}
              {step !== 'complete' && (
                <p className="text-center text-xs text-gray-400">
                  Step {currentStepNumber} of {totalSteps}
                </p>
              )}
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