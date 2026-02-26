'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

type Props = {
  mode: 'register' | 'verify'
  title?: string
  subtitle?: string
  onSuccess: (descriptor?: Float32Array) => void
  onCancel: () => void
}

const EAR_BLINK_THRESHOLD  = 0.22
const MOUTH_OPEN_THRESHOLD = 0.45
const HEAD_TURN_THRESHOLD  = 18
const STRAIGHT_THRESHOLD   = 8
const PITCH_UP_THRESHOLD   = -12
const PITCH_DOWN_THRESHOLD = 12

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'

function getEAR(eye: { x: number; y: number }[]): number {
  if (eye.length < 6) return 1
  const [p1, p2, p3, p4, p5, p6] = eye
  const A = Math.hypot(p2.x - p6.x, p2.y - p6.y)
  const B = Math.hypot(p3.x - p5.x, p3.y - p5.y)
  const C = Math.hypot(p1.x - p4.x, p1.y - p4.y)
  return (A + B) / (2.0 * C)
}

function getMAR(mouth: { x: number; y: number }[]): number {
  if (mouth.length < 8) return 0
  const vertical   = Math.hypot(mouth[2].x - mouth[6].x, mouth[2].y - mouth[6].y)
  const horizontal = Math.hypot(mouth[0].x - mouth[4].x, mouth[0].y - mouth[4].y)
  return vertical / (horizontal + 0.001)
}

function averageDescriptors(descriptors: Float32Array[]): Float32Array {
  const result = new Float32Array(128)
  for (let i = 0; i < 128; i++) {
    result[i] = descriptors.reduce((sum, d) => sum + d[i], 0) / descriptors.length
  }
  return result
}

// ── Check definitions ─────────────────────────────────────────────────────────
type CheckId = 'straight' | 'turn' | 'mouth' | 'blink'

interface CheckState {
  // turn sub-states
  leftDone:  boolean
  rightDone: boolean
  // mouth sub-state
  mouthOpen: boolean
  // blink
  blinkDone: boolean
  // straight
  straightDone: boolean
}

export default function FaceVerification({ title, subtitle, onSuccess, onCancel }: Props) {
  const videoRef         = useRef<HTMLVideoElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef        = useRef<MediaStream | null>(null)
  const animFrameRef     = useRef<number>(0)
  const faceApiRef       = useRef<typeof import('face-api.js') | null>(null)
  const currentCheckRef  = useRef<CheckId>('straight')
  const collectedRef     = useRef<Float32Array[]>([])

  const detStateRef = useRef({
    straightFrames:    0,
    blinkFrames:       0,
    eyesWereClosed:    false,
    mouthOpenFrames:   0,
    mouthWasOpen:      false,
    leftTurnDetected:  false,
    rightTurnDetected: false,
    upTiltDetected:    false,
    downTiltDetected:  false,
  })

  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [cameraReady,  setCameraReady]  = useState(false)
  const [loadingMsg,   setLoadingMsg]   = useState('Loading...')
  const [error,        setError]        = useState('')
  const [allDone,      setAllDone]      = useState(false)
  const [capturedDescriptor, setCapturedDescriptor] = useState<Float32Array | null>(null)

  // Live sub-state — updates every frame for UI feedback
  const [liveYaw,   setLiveYaw]   = useState(0)   // degrees
  const [livePitch, setLivePitch] = useState(0)   // degrees
  const [liveMAR,   setLiveMAR]   = useState(0)
  const [liveEAR,   setLiveEAR]   = useState(1)
  const [faceDetected, setFaceDetected] = useState(false)
  const [faceTooFar,   setFaceTooFar]   = useState(false)

  // Which check is active
  const [activeCheck, setActiveCheck] = useState<CheckId>('straight')

  // Sub-completion tracking
  const [checkState, setCheckState] = useState<CheckState>({
    leftDone:     false,
    rightDone:    false,
    mouthOpen:    false,
    blinkDone:    false,
    straightDone: false,
  })

  // Overall check completion order
  const CHECK_ORDER: CheckId[] = ['straight', 'turn', 'mouth', 'blink']
  const [completedChecks, setCompletedChecks] = useState<CheckId[]>([])

  const advanceCheck = useCallback(() => {
    const current = currentCheckRef.current
    const idx     = CHECK_ORDER.indexOf(current)
    if (idx < CHECK_ORDER.length - 1) {
      const next = CHECK_ORDER[idx + 1]
      currentCheckRef.current = next
      setActiveCheck(next)
    } else {
      // All done
      setAllDone(true)
    }
    setCompletedChecks(prev => [...prev, current])
  }, [])

  // Load models
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setLoadingMsg('Loading face models...')
        const faceapi = await import('face-api.js')
        faceApiRef.current = faceapi
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ])
        if (mounted) { setModelsLoaded(true); setLoadingMsg('Starting camera...') }
      } catch (e) {
        if (mounted) setError('Failed to load face detection. Please refresh.')
        console.error(e)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  // Start camera
  useEffect(() => {
    if (!modelsLoaded) return
    let mounted = true
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current && mounted) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play()
            if (mounted) setCameraReady(true)
          }
        }
      })
      .catch(() => { if (mounted) setError('Camera access denied. Please allow camera access.') })
    return () => { mounted = false }
  }, [modelsLoaded])

  // Always cleanup camera on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  // Detection loop
  useEffect(() => {
    if (!cameraReady || !modelsLoaded) return

    const faceapi = faceApiRef.current!
    const video   = videoRef.current!
    const overlay = overlayCanvasRef.current!
    const ctx     = overlay.getContext('2d')!
    const ds      = detStateRef.current

    const detect = async () => {
      if (!video || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detect)
        return
      }

      overlay.width  = video.videoWidth  || 640
      overlay.height = video.videoHeight || 480
      ctx.clearRect(0, 0, overlay.width, overlay.height)

      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        setFaceDetected(false)
        animFrameRef.current = requestAnimationFrame(detect)
        return
      }

      setFaceDetected(true)
      const { landmarks, descriptor, detection: det } = detection
      const box    = det.box
      const points = landmarks.positions

      if (box.width / overlay.width < 0.18) {
        setFaceTooFar(true)
        animFrameRef.current = requestAnimationFrame(detect)
        return
      }
      setFaceTooFar(false)

      // Collect descriptors passively
      if (collectedRef.current.length < 10) collectedRef.current.push(descriptor)

      // Draw subtle mesh
      ctx.fillStyle = 'rgba(139,92,246,0.4)'
      points.forEach(pt => {
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 1.2, 0, Math.PI * 2)
        ctx.fill()
      })

      // ── Measurements ────────────────────────────────────────────────────────
      const leftEye  = landmarks.getLeftEye()
      const rightEye = landmarks.getRightEye()
      const mouth    = landmarks.getMouth()
      const nose     = landmarks.getNose()

      const avgEAR = (getEAR(leftEye) + getEAR(rightEye)) / 2
      const mar    = getMAR(mouth.slice(12))

      // Yaw (left/right) from nose vs face centre
      const noseTip     = nose[3]
      const faceCenterX = (points[0].x + points[16].x) / 2
      const faceWidth   = points[16].x - points[0].x
      const yawDeg      = ((noseTip.x - faceCenterX) / (faceWidth / 2 + 0.001)) * 45

      // Pitch (up/down) from nose tip vs eye midpoint
      const eyeMidY  = (leftEye[0].y + rightEye[0].y) / 2
      const faceH    = points[8].y - points[27].y
      const pitchDeg = ((noseTip.y - eyeMidY) / (faceH / 2 + 0.001)) * 45

      // Push to UI
      setLiveYaw(yawDeg)
      setLivePitch(pitchDeg)
      setLiveMAR(mar)
      setLiveEAR(avgEAR)

      // ── Check logic ──────────────────────────────────────────────────────────
      const check = currentCheckRef.current

      if (check === 'straight') {
        if (Math.abs(yawDeg) < STRAIGHT_THRESHOLD && Math.abs(pitchDeg) < STRAIGHT_THRESHOLD) {
          ds.straightFrames++
          if (ds.straightFrames > 20) {
            setCheckState(p => ({ ...p, straightDone: true }))
            setTimeout(() => { ds.straightFrames = 0; advanceCheck() }, 500)
          }
        } else {
          ds.straightFrames = 0
        }
      }

      if (check === 'turn') {
        if (yawDeg < -HEAD_TURN_THRESHOLD && !ds.leftTurnDetected) {
          ds.leftTurnDetected = true
          setCheckState(p => ({ ...p, leftDone: true }))
        }
        if (yawDeg > HEAD_TURN_THRESHOLD && !ds.rightTurnDetected) {
          ds.rightTurnDetected = true
          setCheckState(p => ({ ...p, rightDone: true }))
        }
        if (ds.leftTurnDetected && ds.rightTurnDetected) {
          setTimeout(() => {
            ds.leftTurnDetected  = false
            ds.rightTurnDetected = false
            advanceCheck()
          }, 400)
        }
      }

      if (check === 'mouth') {
        if (mar > MOUTH_OPEN_THRESHOLD) {
          ds.mouthOpenFrames++
          if (ds.mouthOpenFrames > 5) {
            if (!ds.mouthWasOpen) {
              ds.mouthWasOpen = true
              setCheckState(p => ({ ...p, mouthOpen: true }))
            }
          }
        } else if (ds.mouthWasOpen) {
          ds.mouthWasOpen    = false
          ds.mouthOpenFrames = 0
          const collected = collectedRef.current
          const averaged  = collected.length > 0 ? averageDescriptors(collected) : descriptor
          setCapturedDescriptor(averaged)
          setTimeout(() => advanceCheck(), 400)
        } else {
          ds.mouthOpenFrames = 0
        }
      }

      if (check === 'blink') {
        if (avgEAR < EAR_BLINK_THRESHOLD) {
          ds.blinkFrames++
          if (ds.blinkFrames > 2) ds.eyesWereClosed = true
        } else if (ds.eyesWereClosed) {
          ds.eyesWereClosed = false
          ds.blinkFrames    = 0
          setCheckState(p => ({ ...p, blinkDone: true }))
          setTimeout(() => advanceCheck(), 400)
        } else {
          ds.blinkFrames = 0
        }
      }

      animFrameRef.current = requestAnimationFrame(detect)
    }

    animFrameRef.current = requestAnimationFrame(detect)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [cameraReady, modelsLoaded, advanceCheck])

  // Fire callback when all done
  useEffect(() => {
    if (allDone && capturedDescriptor) {
      cancelAnimationFrame(animFrameRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      setTimeout(() => onSuccess(capturedDescriptor), 1000)
    }
  }, [allDone, capturedDescriptor, onSuccess])

  // ── Derived UI values ────────────────────────────────────────────────────────
  const leftActive   = activeCheck === 'turn' && !checkState.leftDone
  const rightActive  = activeCheck === 'turn' && !checkState.rightDone
  const leftLit      = checkState.leftDone
  const rightLit     = checkState.rightDone
  const mouthPct     = Math.min(100, (liveMAR / MOUTH_OPEN_THRESHOLD) * 100)
  const blinkPct     = Math.min(100, ((1 - liveEAR) / (1 - EAR_BLINK_THRESHOLD)) * 100)
  const totalChecks  = CHECK_ORDER.length
  const doneCount    = completedChecks.length + (allDone ? 0 : 0)
  const progress     = allDone ? 100 : (doneCount / totalChecks) * 100

  const checkLabel: Record<CheckId, string> = {
    straight: 'Look straight',
    turn:     'Turn your head',
    mouth:    'Open your mouth',
    blink:    'Blink slowly',
  }

  const checkInstruction: Record<CheckId, string> = {
    straight: 'Centre your face and hold still',
    turn:     'Turn left, then right',
    mouth:    'Open your mouth wide, then close',
    blink:    'Blink both eyes slowly',
  }

  return (
    <>
      <style suppressHydrationWarning>{`
        @keyframes ringIdle {
          0%,100% { box-shadow: 0 0 0 3px rgba(139,92,246,0.3) }
          50%     { box-shadow: 0 0 0 5px rgba(139,92,246,0.6) }
        }
        @keyframes ringSuccess {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.9) }
          100% { box-shadow: 0 0 0 28px rgba(34,197,94,0) }
        }
        @keyframes ringDone {
          0%,100% { box-shadow: 0 0 0 4px rgba(34,197,94,0.6) }
          50%     { box-shadow: 0 0 0 8px rgba(34,197,94,0.2) }
        }
        @keyframes popIn {
          0%   { transform: scale(0.5); opacity: 0 }
          70%  { transform: scale(1.2) }
          100% { transform: scale(1);   opacity: 1 }
        }
        @keyframes scanLine {
          0%   { top: 5% }
          100% { top: 95% }
        }
        @keyframes spin {
          to { transform: rotate(360deg) }
        }
        @keyframes pulse {
          0%,100% { opacity: 1 }
          50%     { opacity: 0.4 }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(6px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @keyframes checkPop {
          0%   { transform: scale(0); opacity: 0 }
          60%  { transform: scale(1.3) }
          100% { transform: scale(1);  opacity: 1 }
        }
        @keyframes mouthBreathe {
          0%,100% { transform: scaleY(1) }
          50%     { transform: scaleY(1.08) }
        }
        .ring-idle    { animation: ringIdle 2s ease-in-out infinite }
        .ring-success { animation: ringSuccess 0.7s ease-out forwards, ringDone 2s ease-in-out 0.7s infinite }
        .scan-line    { animation: scanLine 2.2s linear infinite }
        .spinner      { animation: spin 1s linear infinite }
        .pulse        { animation: pulse 1.5s ease-in-out infinite }
        .slide-in     { animation: slideIn 0.3s ease-out both }
        .check-pop    { animation: checkPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both }
        .mouth-idle   { animation: mouthBreathe 2s ease-in-out infinite }
      `}</style>

      <div className="fixed inset-0 z-50 flex flex-col items-center bg-[#0a0a0f] overflow-hidden">

        {/* ── Top bar ── */}
        <div className="w-full flex items-center justify-between px-6 pt-10 pb-2 flex-shrink-0">
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-300 transition text-sm">
            Cancel
          </button>
          <p className="text-white font-semibold text-sm tracking-wide">{title || 'Face ID'}</p>
          <div className="w-12" />
        </div>
        {subtitle && (
          <p className="text-gray-500 text-xs text-center px-6 mb-1">{subtitle}</p>
        )}

        {/* ── Loading ── */}
        {(!modelsLoaded || !cameraReady) && !error && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-14 h-14 rounded-full border-2 border-purple-700 border-t-purple-400 spinner" />
            <p className="text-gray-400 text-sm">{loadingMsg}</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="text-5xl">❌</span>
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={onCancel} className="bg-gray-800 text-white text-sm px-5 py-2 rounded-xl mt-2">
              Go Back
            </button>
          </div>
        )}

        {/* ── Main UI ── */}
        {modelsLoaded && cameraReady && !error && (
          <div className="flex-1 flex flex-col items-center justify-between w-full max-w-xs px-4 pb-8 pt-2">

            {/* Instruction text */}
            <div className="text-center min-h-[44px] flex flex-col items-center justify-center">
              {allDone ? (
                <p className="text-green-400 font-semibold text-base slide-in">All checks passed ✓</p>
              ) : (
                <div className="slide-in" key={activeCheck}>
                  <p className="text-white font-semibold text-base">{checkLabel[activeCheck]}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{checkInstruction[activeCheck]}</p>
                  {!faceDetected && (
                    <p className="text-yellow-500 text-xs mt-1">No face detected — move closer</p>
                  )}
                  {faceDetected && faceTooFar && (
                    <p className="text-yellow-500 text-xs mt-1">Move closer to the camera</p>
                  )}
                </div>
              )}
            </div>

            {/* ── Face ring ── */}
            <div className="relative my-3" style={{ width: 240, height: 240 }}>

              {/* Ring */}
              <div
                className={allDone ? 'ring-success' : 'ring-idle'}
                style={{
                  width: 240, height: 240,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  position: 'relative',
                  border: allDone
                    ? '3px solid rgba(34,197,94,0.9)'
                    : faceDetected && !faceTooFar
                    ? '3px solid rgba(139,92,246,0.8)'
                    : '3px solid rgba(255,255,255,0.1)',
                  transition: 'border-color 0.4s',
                }}
              >
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                  muted playsInline
                />
                <canvas
                  ref={overlayCanvasRef}
                  className="absolute inset-0 w-full h-full"
                  style={{ transform: 'scaleX(-1)' }}
                />

                {/* Scan line */}
                {!allDone && faceDetected && !faceTooFar && (
                  <div
                    className="scan-line absolute left-0 right-0 h-px pointer-events-none"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.9), transparent)' }}
                  />
                )}

                {/* Done overlay */}
                {allDone && (
                  <div className="absolute inset-0 flex items-center justify-center bg-green-500/10">
                    <div className="check-pop text-5xl">✅</div>
                  </div>
                )}
              </div>

              {/* ══ TURN CHECK: Left & Right directional arrows ══════════════ */}
              {(activeCheck === 'turn' || completedChecks.includes('turn')) && (
                <>
                  {/* LEFT arrow — sits outside ring on the left */}
                  <div
                    className="absolute flex items-center gap-1.5 transition-all duration-300"
                    style={{ left: -64, top: '50%', transform: 'translateY(-50%)' }}
                  >
                    {/* Tick badge */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                        checkState.leftDone
                          ? 'bg-green-500 check-pop'
                          : leftActive
                          ? 'bg-purple-600 pulse'
                          : 'bg-gray-800'
                      }`}
                    >
                      {checkState.leftDone ? (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                        </svg>
                      ) : (
                        <svg
                          className={`w-3.5 h-3.5 ${leftActive ? 'text-white' : 'text-gray-600'}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
                        </svg>
                      )}
                    </div>
                    <span className={`text-xs font-medium ${checkState.leftDone ? 'text-green-400' : leftActive ? 'text-purple-300' : 'text-gray-600'}`}>
                      Left
                    </span>
                  </div>

                  {/* RIGHT arrow */}
                  <div
                    className="absolute flex items-center gap-1.5 transition-all duration-300"
                    style={{ right: -68, top: '50%', transform: 'translateY(-50%)' }}
                  >
                    <span className={`text-xs font-medium ${checkState.rightDone ? 'text-green-400' : rightActive ? 'text-purple-300' : 'text-gray-600'}`}>
                      Right
                    </span>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                        checkState.rightDone
                          ? 'bg-green-500 check-pop'
                          : rightActive
                          ? 'bg-purple-600 pulse'
                          : 'bg-gray-800'
                      }`}
                    >
                      {checkState.rightDone ? (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                        </svg>
                      ) : (
                        <svg
                          className={`w-3.5 h-3.5 ${rightActive ? 'text-white' : 'text-gray-600'}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ══ STRAIGHT CHECK: Centre dot indicator ═══════════════════════ */}
              {activeCheck === 'straight' && (
                <div
                  className="absolute flex flex-col items-center gap-1"
                  style={{ bottom: -36, left: '50%', transform: 'translateX(-50%)' }}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      checkState.straightDone ? 'bg-green-500' : 'bg-purple-500 pulse'
                    }`}
                  />
                </div>
              )}

              {/* ══ MOUTH CHECK: animated lip bar below ring ════════════════════ */}
              {(activeCheck === 'mouth' || completedChecks.includes('mouth')) && (
                <div
                  className="absolute flex flex-col items-center gap-1.5"
                  style={{ bottom: -52, left: '50%', transform: 'translateX(-50%)', width: 120 }}
                >
                  {/* Mouth icon */}
                  <div className="flex items-center gap-2">
                    {/* Lip shape SVG */}
                    <svg
                      width="40" height="20" viewBox="0 0 40 20"
                      className={`transition-all duration-200 ${checkState.mouthOpen ? 'mouth-idle' : ''}`}
                    >
                      {/* Upper lip */}
                      <path
                        d="M4 10 Q10 4 20 6 Q30 4 36 10"
                        fill="none"
                        stroke={checkState.mouthOpen ? '#22c55e' : activeCheck === 'mouth' ? '#8b5cf6' : '#374151'}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      {/* Lower lip — moves down based on MAR */}
                      <path
                        d={`M4 10 Q10 ${10 + Math.min(mouthPct / 8, 8)} 20 ${10 + Math.min(mouthPct / 6, 10)} Q30 ${10 + Math.min(mouthPct / 8, 8)} 36 10`}
                        fill="none"
                        stroke={checkState.mouthOpen ? '#22c55e' : activeCheck === 'mouth' ? '#8b5cf6' : '#374151'}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      {/* Inner gap fill when open */}
                      {mouthPct > 30 && (
                        <ellipse
                          cx="20"
                          cy={13 + Math.min(mouthPct / 12, 5)}
                          rx={8 * Math.min(mouthPct / 100, 1)}
                          ry={3 * Math.min(mouthPct / 100, 1)}
                          fill={checkState.mouthOpen ? 'rgba(34,197,94,0.3)' : 'rgba(139,92,246,0.3)'}
                        />
                      )}
                    </svg>

                    {/* Tick when done */}
                    {checkState.mouthOpen && (
                      <div className="w-5 h-5 rounded-full bg-green-500 check-pop flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-100"
                      style={{
                        width: `${mouthPct}%`,
                        background: checkState.mouthOpen
                          ? 'linear-gradient(90deg,#22c55e,#16a34a)'
                          : 'linear-gradient(90deg,#8b5cf6,#6d28d9)',
                      }}
                    />
                  </div>
                  <p className={`text-xs ${checkState.mouthOpen ? 'text-green-400' : 'text-gray-500'}`}>
                    {checkState.mouthOpen ? 'Got it ✓' : 'Open wide'}
                  </p>
                </div>
              )}

              {/* ══ BLINK CHECK: eye indicators above ring ══════════════════════ */}
              {(activeCheck === 'blink' || completedChecks.includes('blink')) && (
                <div
                  className="absolute flex items-center gap-3"
                  style={{ top: -44, left: '50%', transform: 'translateX(-50%)' }}
                >
                  {/* Left eye */}
                  <div className="flex flex-col items-center gap-1">
                    <svg
                      width="32" height="18" viewBox="0 0 32 18"
                      className="transition-all duration-100"
                    >
                      {/* Eyelid — closes based on EAR */}
                      <ellipse
                        cx="16" cy="9"
                        rx="13"
                        ry={Math.max(1, 7 * (liveEAR / 0.35))}
                        fill="none"
                        stroke={checkState.blinkDone ? '#22c55e' : activeCheck === 'blink' ? '#8b5cf6' : '#374151'}
                        strokeWidth="2"
                      />
                      {/* Pupil — hides when eye closed */}
                      {liveEAR > 0.15 && (
                        <circle
                          cx="16" cy="9" r="3"
                          fill={checkState.blinkDone ? '#22c55e' : activeCheck === 'blink' ? '#8b5cf6' : '#4b5563'}
                        />
                      )}
                    </svg>
                  </div>

                  {/* Tick when blink done */}
                  {checkState.blinkDone ? (
                    <div className="w-6 h-6 rounded-full bg-green-500 check-pop flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                  ) : (
                    <div className={`w-2 h-2 rounded-full ${activeCheck === 'blink' ? 'bg-purple-500 pulse' : 'bg-gray-700'}`} />
                  )}

                  {/* Right eye */}
                  <div className="flex flex-col items-center gap-1">
                    <svg
                      width="32" height="18" viewBox="0 0 32 18"
                      className="transition-all duration-100"
                    >
                      <ellipse
                        cx="16" cy="9"
                        rx="13"
                        ry={Math.max(1, 7 * (liveEAR / 0.35))}
                        fill="none"
                        stroke={checkState.blinkDone ? '#22c55e' : activeCheck === 'blink' ? '#8b5cf6' : '#374151'}
                        strokeWidth="2"
                      />
                      {liveEAR > 0.15 && (
                        <circle
                          cx="16" cy="9" r="3"
                          fill={checkState.blinkDone ? '#22c55e' : activeCheck === 'blink' ? '#8b5cf6' : '#4b5563'}
                        />
                      )}
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* ── Step pills ── */}
            <div className="w-full space-y-2 mt-10">
              {/* Progress bar */}
              <div className="w-full h-0.5 bg-gray-800 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progress}%`,
                    background: allDone
                      ? 'linear-gradient(90deg,#22c55e,#16a34a)'
                      : 'linear-gradient(90deg,#8b5cf6,#6d28d9)',
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {CHECK_ORDER.map((id) => {
                  const done    = completedChecks.includes(id) || allDone
                  const active  = activeCheck === id && !allDone
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300"
                      style={{
                        background: done
                          ? 'rgba(34,197,94,0.12)'
                          : active
                          ? 'rgba(139,92,246,0.15)'
                          : 'rgba(255,255,255,0.03)',
                        border: done
                          ? '1px solid rgba(34,197,94,0.25)'
                          : active
                          ? '1px solid rgba(139,92,246,0.35)'
                          : '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs transition-all duration-300 ${
                          done ? 'check-pop' : ''
                        }`}
                        style={{
                          background: done
                            ? 'rgba(34,197,94,0.25)'
                            : active
                            ? 'rgba(139,92,246,0.25)'
                            : 'rgba(255,255,255,0.06)',
                        }}
                      >
                        {done ? (
                          <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                          </svg>
                        ) : (
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-purple-400 pulse' : 'bg-gray-600'}`}
                          />
                        )}
                      </div>
                      <span
                        className="text-xs font-medium"
                        style={{
                          color: done ? 'rgb(134,239,172)' : active ? 'rgb(196,181,253)' : 'rgba(255,255,255,0.3)',
                        }}
                      >
                        {checkLabel[id]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  )
}