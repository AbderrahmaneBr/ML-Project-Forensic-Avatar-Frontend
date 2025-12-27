import { useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { Fingerprint, Square } from "lucide-react";

interface DetectiveAvatarProps {
  isSpeaking: boolean;
  className?: string;
  onStop?: () => void;
}

// Avatar model - place your .glb file in public/models/
// For Ready Player Me avatars, use: https://models.readyplayer.me/[avatar-id].glb
const AVATAR_URL = "/models/avatar.glb";
// Background image - place your image in public/images/
const BACKGROUND_IMAGE_URL = "/images/background.jpg";

// Different morph target naming conventions for lip sync
// Ready Player Me / Visage standard
const RPM_VISEMES = [
  "viseme_aa",
  "viseme_E",
  "viseme_I",
  "viseme_O",
  "viseme_U",
  "viseme_PP",
  "viseme_FF",
  "viseme_TH",
  "viseme_DD",
  "viseme_kk",
  "viseme_CH",
  "viseme_SS",
  "viseme_nn",
  "viseme_RR",
  "viseme_sil",
];

// ARKit / Apple blend shapes
const ARKIT_MOUTH_SHAPES = [
  "jawOpen",
  "mouthClose",
  "mouthFunnel",
  "mouthPucker",
  "mouthLeft",
  "mouthRight",
  "mouthSmileLeft",
  "mouthSmileRight",
  "mouthFrownLeft",
  "mouthFrownRight",
  "mouthDimpleLeft",
  "mouthDimpleRight",
  "mouthStretchLeft",
  "mouthStretchRight",
  "mouthRollLower",
  "mouthRollUpper",
  "mouthShrugLower",
  "mouthShrugUpper",
  "mouthPressLeft",
  "mouthPressRight",
  "mouthLowerDownLeft",
  "mouthLowerDownRight",
  "mouthUpperUpLeft",
  "mouthUpperUpRight",
];

// Simple/Generic mouth shapes (common in many models)
const SIMPLE_MOUTH_SHAPES = [
  "mouthOpen",
  "mouth_open",
  "MouthOpen",
  "Mouth_Open",
  "jawOpen",
  "jaw_open",
  "JawOpen",
  "Jaw_Open",
  "A",
  "E",
  "I",
  "O",
  "U",
  "a",
  "e",
  "i",
  "o",
  "u",
  "AA",
  "EE",
  "II",
  "OO",
  "UU",
  "Fcl_MTH_A",
  "Fcl_MTH_I",
  "Fcl_MTH_U",
  "Fcl_MTH_E",
  "Fcl_MTH_O", // VRoid
];

// Mixamo naming convention
const MIXAMO_MOUTH_SHAPES = [
  "Mouth_Open",
  "Mouth_Narrow",
  "Mouth_Smile",
  "Mouth_Frown",
];

// Check if WebGL is available
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

// Detect which mouth-related morph targets are available in a model
function detectMouthMorphTargets(dictionary: Record<string, number>): string[] {
  const availableKeys = Object.keys(dictionary);
  const mouthTargets: string[] = [];

  // All possible naming conventions to check
  const allPossibleNames = [
    ...RPM_VISEMES,
    ...ARKIT_MOUTH_SHAPES,
    ...SIMPLE_MOUTH_SHAPES,
    ...MIXAMO_MOUTH_SHAPES,
  ];

  // Find exact matches first
  for (const name of allPossibleNames) {
    if (dictionary[name] !== undefined) {
      mouthTargets.push(name);
    }
  }

  // If no exact matches, look for partial matches with common keywords
  if (mouthTargets.length === 0) {
    const mouthKeywords = [
      "mouth",
      "jaw",
      "lip",
      "viseme",
      "mth",
      "talk",
      "speak",
    ];
    for (const key of availableKeys) {
      const lowerKey = key.toLowerCase();
      if (mouthKeywords.some((kw) => lowerKey.includes(kw))) {
        mouthTargets.push(key);
      }
    }
  }

  return mouthTargets;
}

// Detect blink morph targets
function detectBlinkMorphTargets(dictionary: Record<string, number>): {
  left?: string;
  right?: string;
} {
  const result: { left?: string; right?: string } = {};

  // Common blink naming patterns
  const blinkPatterns = {
    left: [
      "eyeBlinkLeft",
      "eyeBlink_L",
      "blink_L",
      "Blink_L",
      "eye_blink_left",
      "Fcl_EYE_Close_L",
    ],
    right: [
      "eyeBlinkRight",
      "eyeBlink_R",
      "blink_R",
      "Blink_R",
      "eye_blink_right",
      "Fcl_EYE_Close_R",
    ],
  };

  for (const key of Object.keys(dictionary)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("blink") ||
      (lowerKey.includes("eye") && lowerKey.includes("close"))
    ) {
      if (
        lowerKey.includes("left") ||
        lowerKey.endsWith("_l") ||
        lowerKey.endsWith("l")
      ) {
        result.left = key;
      } else if (
        lowerKey.includes("right") ||
        lowerKey.endsWith("_r") ||
        lowerKey.endsWith("r")
      ) {
        result.right = key;
      }
    }
  }

  // Check exact matches if partial didn't work
  if (!result.left) {
    result.left = blinkPatterns.left.find((p) => dictionary[p] !== undefined);
  }
  if (!result.right) {
    result.right = blinkPatterns.right.find((p) => dictionary[p] !== undefined);
  }

  return result;
}

interface AvatarModelProps {
  isSpeaking: boolean;
}

function AvatarModel({ isSpeaking }: AvatarModelProps) {
  const { scene } = useGLTF(AVATAR_URL);
  const groupRef = useRef<THREE.Group>(null);
  const meshesWithMorphs = useRef<THREE.SkinnedMesh[]>([]);
  const detectedMouthTargets = useRef<string[]>([]);
  const detectedBlinkTargets = useRef<{ left?: string; right?: string }>({});

  // Animation state
  const animState = useRef({
    currentViseme: 0,
    blinkTimer: 0,
    isBlinking: false,
    headBob: 0,
    mouthOpenAmount: 0,
    targetMouthOpen: 0,
    syllableTimer: 0,
  });

  // Find all meshes with morph targets on mount
  useEffect(() => {
    meshesWithMorphs.current = [];
    detectedMouthTargets.current = [];
    detectedBlinkTargets.current = {};

    scene.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh && child.morphTargetDictionary) {
        meshesWithMorphs.current.push(child);

        // Detect mouth targets if not already found
        if (detectedMouthTargets.current.length === 0) {
          detectedMouthTargets.current = detectMouthMorphTargets(
            child.morphTargetDictionary
          );
        }

        // Detect blink targets if not already found
        if (
          !detectedBlinkTargets.current.left &&
          !detectedBlinkTargets.current.right
        ) {
          detectedBlinkTargets.current = detectBlinkMorphTargets(
            child.morphTargetDictionary
          );
        }
      }
    });
  }, [scene]);

  // Animation loop
  useFrame((state, delta) => {
    const anim = animState.current;
    const meshes = meshesWithMorphs.current;
    const mouthTargets = detectedMouthTargets.current;
    const blinkTargets = detectedBlinkTargets.current;

    if (meshes.length === 0) return;

    // Lip sync animation when speaking
    if (isSpeaking) {
      anim.syllableTimer += delta;

      // Simulate syllable rhythm - alternate between open and closed mouth
      const syllableDuration = 0.12 + Math.random() * 0.08; // 120-200ms per syllable

      if (anim.syllableTimer > syllableDuration) {
        anim.syllableTimer = 0;

        // Alternate between open and closed positions
        if (anim.targetMouthOpen > 0.5) {
          anim.targetMouthOpen = 0.05 + Math.random() * 0.15;
        } else {
          anim.targetMouthOpen = 0.7 + Math.random() * 0.3;
        }

        // Pick a random viseme for variety
        if (mouthTargets.length > 0) {
          anim.currentViseme = Math.floor(Math.random() * mouthTargets.length);
        }
      }

      // Smoothly interpolate mouth open amount
      anim.mouthOpenAmount +=
        (anim.targetMouthOpen - anim.mouthOpenAmount) * 0.25;

      // Apply mouth animation to all meshes
      meshes.forEach((mesh) => {
        if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;

        // Apply mouth morphs
        mouthTargets.forEach((name, index) => {
          const morphIndex = mesh.morphTargetDictionary![name];
          if (morphIndex !== undefined && mesh.morphTargetInfluences) {
            const isPrimary = index === anim.currentViseme;
            const amplifiedAmount = anim.mouthOpenAmount * 1.2;
            const targetValue = isPrimary
              ? Math.min(amplifiedAmount, 1.0)
              : amplifiedAmount * 0.3;

            mesh.morphTargetInfluences[morphIndex] +=
              (targetValue - mesh.morphTargetInfluences[morphIndex]) * 0.35;
          }
        });

        // Eye blink
        anim.blinkTimer += delta;
        if (!anim.isBlinking && anim.blinkTimer > 2 + Math.random() * 3) {
          anim.isBlinking = true;
          anim.blinkTimer = 0;
        }
        if (anim.isBlinking && anim.blinkTimer > 0.15) {
          anim.isBlinking = false;
          anim.blinkTimer = 0;
        }

        const blinkValue = anim.isBlinking ? 1 : 0;
        if (blinkTargets.left) {
          const idx = mesh.morphTargetDictionary[blinkTargets.left];
          if (idx !== undefined && mesh.morphTargetInfluences) {
            mesh.morphTargetInfluences[idx] = blinkValue;
          }
        }
        if (blinkTargets.right) {
          const idx = mesh.morphTargetDictionary[blinkTargets.right];
          if (idx !== undefined && mesh.morphTargetInfluences) {
            mesh.morphTargetInfluences[idx] = blinkValue;
          }
        }
      });
    } else {
      // Reset to neutral when not speaking
      anim.targetMouthOpen = 0;
      anim.mouthOpenAmount *= 0.85;
      anim.syllableTimer = 0;

      meshes.forEach((mesh) => {
        if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;

        // Fade out mouth morphs
        mouthTargets.forEach((name) => {
          const idx = mesh.morphTargetDictionary![name];
          if (idx !== undefined && mesh.morphTargetInfluences) {
            mesh.morphTargetInfluences[idx] *= 0.85;
          }
        });

        // Idle blink
        anim.blinkTimer += delta;
        if (!anim.isBlinking && anim.blinkTimer > 3 + Math.random() * 4) {
          anim.isBlinking = true;
          anim.blinkTimer = 0;
        }
        if (anim.isBlinking && anim.blinkTimer > 0.15) {
          anim.isBlinking = false;
          anim.blinkTimer = 0;
        }
        const blinkValue = anim.isBlinking ? 1 : 0;
        if (blinkTargets.left) {
          const idx = mesh.morphTargetDictionary[blinkTargets.left];
          if (idx !== undefined) mesh.morphTargetInfluences[idx] = blinkValue;
        }
        if (blinkTargets.right) {
          const idx = mesh.morphTargetDictionary[blinkTargets.right];
          if (idx !== undefined) mesh.morphTargetInfluences[idx] = blinkValue;
        }
      });
    }

    // Head movement
    if (groupRef.current) {
      if (isSpeaking) {
        anim.headBob += delta * 2;
        groupRef.current.rotation.x = Math.sin(anim.headBob) * 0.03;
        groupRef.current.rotation.z = Math.sin(anim.headBob * 0.7) * 0.02;
      } else {
        groupRef.current.rotation.x *= 0.95;
        groupRef.current.rotation.z *= 0.95;
      }
      // Subtle idle animation
      groupRef.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={[0, -2.005, 0.5]} scale={1.2}>
      <primitive object={scene} castShadow receiveShadow />
    </group>
  );
}

// Preload the model
useGLTF.preload(AVATAR_URL);

export function DetectiveAvatar({
  isSpeaking,
  className,
  onStop,
}: DetectiveAvatarProps) {
  const [webGLSupported, setWebGLSupported] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setWebGLSupported(isWebGLAvailable());
  }, []);

  // Fallback UI for when WebGL is not available or there's an error
  if (!webGLSupported || hasError) {
    return (
      <div className={className}>
        <div className="flex h-full w-full items-center justify-center bg-linear-to-b from-muted/30 to-muted/50 rounded-lg">
          <Fingerprint
            className={`h-8 w-8 text-primary ${
              isSpeaking ? "animate-pulse" : ""
            }`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} relative`}>
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${BACKGROUND_IMAGE_URL})` }}
      />
      {/* Dark overlay for moody atmosphere */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Stop button - visible only when speaking */}
      {isSpeaking && onStop && (
        <button
          onClick={onStop}
          className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-destructive/20 hover:border-destructive/50 transition-all duration-200 group"
          title="Stop speaking"
        >
          <Square className="h-4 w-4 text-muted-foreground group-hover:text-destructive fill-current" />
        </button>
      )}
      <Canvas
        shadows
        camera={{ position: [0, 0, 1.5], fov: 35 }}
        style={{ background: "transparent" }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
          failIfMajorPerformanceCaveat: false,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
        onError={() => setHasError(true)}
      >
        {/* Warm ambient base - soft detective office glow */}
        <ambientLight intensity={0} color="#ffecd2" />

        {/* Main key light - warm desk lamp feel */}
        <spotLight
          position={[1.5, 2, 3]}
          angle={0.5}
          penumbra={0.7}
          intensity={5}
          color="#ffb366"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0001}
          shadow-radius={8}
        />

        {/* Secondary warm fill from opposite side */}
        <directionalLight
          position={[-2, 1.5, 2]}
          intensity={5}
          color="#ffd699"
        />

        {/* Warm rim light - golden hour backlight */}
        <pointLight position={[0, 1.5, -2]} intensity={5} color="#cc9933" />

        {/* Face fill - warm soft light */}
        <pointLight position={[0, 0.5, 2.5]} intensity={3} color="#fff5e6" />

        {/* Direct face light - front spotlight */}
        <spotLight
          position={[0, 0, 2]}
          angle={0.4}
          penumbra={0.6}
          intensity={1.5}
          color="#fff8f0"
          castShadow
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
          shadow-bias={-0.0001}
          shadow-radius={4}
        />

        {/* Yellow uplight - under face pointing up */}
        <directionalLight position={[0, -2, 1]} intensity={1} color="#ffd700" />

        {/* Top-down warm accent */}
        <pointLight position={[0, 3, 1]} intensity={20} color="#ffcc80" />

        {/* Blue rim light - left side of avatar */}
        <spotLight
          position={[-1.5, 0, 0.5]}
          angle={0.6}
          penumbra={0.5}
          intensity={20}
          color="#4a90d9"
          target-position={[0, 0, 0]}
        />

        {/* Blue rim light - right side of avatar */}
        <spotLight
          position={[1.5, 0, 0.5]}
          angle={0.6}
          penumbra={0.5}
          intensity={10}
          color="#4a90d9"
          target-position={[0, 0, 0]}
        />

        {/* Green rim light - left side lower */}
        <spotLight
          position={[-1.8, -0.5, 0.3]}
          angle={0.5}
          penumbra={0.6}
          intensity={20}
          color="#3dd68c"
          target-position={[0, 0, 0]}
        />

        {/* Green rim light - right side lower */}
        <spotLight
          position={[1.8, -0.5, 0.3]}
          angle={0.5}
          penumbra={0.6}
          intensity={5}
          color="#3dd68c"
          target-position={[0, 0, 0]}
        />

        <Suspense fallback={null}>
          <AvatarModel isSpeaking={isSpeaking} />
        </Suspense>
      </Canvas>
    </div>
  );
}
