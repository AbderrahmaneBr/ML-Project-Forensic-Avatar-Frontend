import { useRef, useState, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { Fingerprint } from 'lucide-react'

interface DetectiveAvatarProps {
  isSpeaking: boolean
  className?: string
}

// Ready Player Me sample avatar - half body character
const AVATAR_URL = 'https://raw.githubusercontent.com/readyplayerme/visage/main/public/half-body.glb'

// Morph target names for lip sync (Ready Player Me standard)
const VISEME_MORPH_TARGETS = {
  viseme_aa: 'viseme_aa',
  viseme_E: 'viseme_E',
  viseme_I: 'viseme_I',
  viseme_O: 'viseme_O',
  viseme_U: 'viseme_U',
  viseme_PP: 'viseme_PP',
  viseme_FF: 'viseme_FF',
  viseme_TH: 'viseme_TH',
  viseme_DD: 'viseme_DD',
  viseme_kk: 'viseme_kk',
  viseme_CH: 'viseme_CH',
  viseme_SS: 'viseme_SS',
  viseme_nn: 'viseme_nn',
  viseme_RR: 'viseme_RR',
  viseme_sil: 'viseme_sil',
}

// Check if WebGL is available
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

interface AvatarModelProps {
  isSpeaking: boolean
}

function AvatarModel({ isSpeaking }: AvatarModelProps) {
  const { scene } = useGLTF(AVATAR_URL)
  const groupRef = useRef<THREE.Group>(null)
  const meshesWithMorphs = useRef<THREE.SkinnedMesh[]>([])

  // Animation state
  const animState = useRef({
    currentViseme: 0,
    visemeTimer: 0,
    blinkTimer: 0,
    isBlinking: false,
    headBob: 0,
  })

  // Find all meshes with morph targets on mount
  useEffect(() => {
    meshesWithMorphs.current = []
    scene.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh && child.morphTargetDictionary) {
        meshesWithMorphs.current.push(child)
      }
    })
  }, [scene])

  // Animation loop
  useFrame((state, delta) => {
    const anim = animState.current
    const meshes = meshesWithMorphs.current

    if (meshes.length === 0) return

    // Lip sync animation when speaking
    if (isSpeaking) {
      anim.visemeTimer += delta

      // Change viseme every 80-120ms for natural speech
      if (anim.visemeTimer > 0.08 + Math.random() * 0.04) {
        anim.visemeTimer = 0

        // Random viseme selection weighted towards common mouth shapes
        const visemeNames = Object.keys(VISEME_MORPH_TARGETS)
        anim.currentViseme = Math.floor(Math.random() * visemeNames.length)
      }

      // Apply visemes to all meshes with morph targets
      meshes.forEach((mesh) => {
        if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return

        const visemeNames = Object.keys(VISEME_MORPH_TARGETS)

        // Smoothly transition between visemes
        visemeNames.forEach((name, index) => {
          const morphIndex = mesh.morphTargetDictionary![name]
          if (morphIndex !== undefined && mesh.morphTargetInfluences) {
            const targetValue = index === anim.currentViseme ? 0.7 + Math.random() * 0.3 : 0
            mesh.morphTargetInfluences[morphIndex] +=
              (targetValue - mesh.morphTargetInfluences[morphIndex]) * 0.3
          }
        })

        // Add random eye blink
        const blinkIndex = mesh.morphTargetDictionary['eyeBlinkLeft']
        const blinkIndexR = mesh.morphTargetDictionary['eyeBlinkRight']

        anim.blinkTimer += delta
        if (!anim.isBlinking && anim.blinkTimer > 2 + Math.random() * 3) {
          anim.isBlinking = true
          anim.blinkTimer = 0
        }
        if (anim.isBlinking && anim.blinkTimer > 0.15) {
          anim.isBlinking = false
          anim.blinkTimer = 0
        }

        const blinkValue = anim.isBlinking ? 1 : 0
        if (blinkIndex !== undefined && mesh.morphTargetInfluences) {
          mesh.morphTargetInfluences[blinkIndex] = blinkValue
        }
        if (blinkIndexR !== undefined && mesh.morphTargetInfluences) {
          mesh.morphTargetInfluences[blinkIndexR] = blinkValue
        }
      })
    } else {
      // Reset to neutral when not speaking
      meshes.forEach((mesh) => {
        if (!mesh.morphTargetInfluences) return
        mesh.morphTargetInfluences.forEach((_, index) => {
          if (mesh.morphTargetInfluences) {
            mesh.morphTargetInfluences[index] *= 0.9 // Smooth fade out
          }
        })
      })
    }

    // Head movement
    if (groupRef.current) {
      if (isSpeaking) {
        anim.headBob += delta * 2
        groupRef.current.rotation.x = Math.sin(anim.headBob) * 0.03
        groupRef.current.rotation.z = Math.sin(anim.headBob * 0.7) * 0.02
      } else {
        groupRef.current.rotation.x *= 0.95
        groupRef.current.rotation.z *= 0.95
      }
      // Subtle idle animation
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05
    }
  })

  return (
    <group ref={groupRef} position={[0, -0.65, 0]} scale={1.4}>
      <primitive object={scene} />
    </group>
  )
}

// Preload the model
useGLTF.preload(AVATAR_URL)

export function DetectiveAvatar({ isSpeaking, className }: DetectiveAvatarProps) {
  const [webGLSupported, setWebGLSupported] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setWebGLSupported(isWebGLAvailable())
  }, [])

  // Fallback UI for when WebGL is not available or there's an error
  if (!webGLSupported || hasError) {
    return (
      <div className={className}>
        <div className="flex h-full w-full items-center justify-center bg-linear-to-b from-muted/30 to-muted/50 rounded-lg">
          <Fingerprint className={`h-8 w-8 text-primary ${isSpeaking ? 'animate-pulse' : ''}`} />
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 1.5], fov: 35 }}
        style={{ background: 'transparent' }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'low-power',
          failIfMajorPerformanceCaveat: false,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
        }}
        onError={() => setHasError(true)}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[2, 2, 5]} intensity={1.2} />
        <directionalLight position={[-2, 1, 3]} intensity={0.6} color="#e8e8ff" />
        <pointLight position={[0, 0, 2]} intensity={0.4} color="#fff5e6" />

        <Suspense fallback={null}>
          <AvatarModel isSpeaking={isSpeaking} />
        </Suspense>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2.2}
          maxPolarAngle={Math.PI / 1.9}
          minAzimuthAngle={-Math.PI / 8}
          maxAzimuthAngle={Math.PI / 8}
        />
      </Canvas>
    </div>
  )
}
