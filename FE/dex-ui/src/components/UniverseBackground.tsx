import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, OrbitControls, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

export default function UniverseBackground({
  starCount = 8000,
  radius = 350,
  depth = 60,
  saturation = 0,
  starSize = 0.6,
  bloomIntensity = 0.9,
}: {
  starCount?: number;
  radius?: number;
  depth?: number;
  saturation?: number;
  starSize?: number;
  bloomIntensity?: number;
}) {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none select-none w-full">
      <Canvas
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        camera={{ position: [0, 0, 80], fov: 55 }}
      >
        <color attach="background" args={["#05060a"]} />
        <Suspense
          fallback={
            <Html center>
              <div className="text-white">Loading stars...</div>
            </Html>
          }
        >
          <Stars
            radius={radius}
            depth={depth}
            count={starCount}
            factor={starSize}
            saturation={saturation}
            fade
          />

          <Nebula />

          <FloatingParticles />

          <EffectComposer>
            <Bloom
              luminanceThreshold={0.2}
              luminanceSmoothing={0.9}
              intensity={bloomIntensity}
            />
          </EffectComposer>

          {/* gentle, subtle orbit so the scene slowly moves */}
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            enableRotate={false}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Small field of drifting, soft particles to look like nebula/galactic dust
function Nebula() {
  const mesh = useRef<THREE.Mesh>(null!);

  useFrame((state, dt) => {
    if (!mesh.current) return;
    mesh.current.rotation.y += dt * 0.01;
    mesh.current.rotation.x += dt * 0.002;
  });

  // simple sphere with additive material & big scale to create subtle color
  return (
    <mesh ref={mesh} scale={[60, 40, 40]}>
      <icosahedronGeometry args={[1, 4]} />
      <meshStandardMaterial
        attach="material"
        blending={THREE.AdditiveBlending}
        transparent
        opacity={0.06}
        toneMapped={false}
        depthWrite={false}
        // @ts-ignore three extended props
        color={new THREE.Color("#00e6a7").lerp(
          new THREE.Color("#8b5cf6"),
          0.25
        )}
      />
    </mesh>
  );
}

// Floating sparkle particles: make a Points cloud with a soft circular sprite
function FloatingParticles() {
  const pointsRef = useRef<THREE.Points>(null!);
  const particles = React.useMemo(() => {
    const positions = new Float32Array(2000 * 3);
    for (let i = 0; i < 2000; i++) {
      const i3 = i * 3;
      positions[i3 + 0] = (Math.random() - 0.5) * 800;
      positions[i3 + 1] = (Math.random() - 0.5) * 400;
      positions[i3 + 2] = -Math.random() * 800;
    }
    return positions;
  }, []);

  useFrame((_, dt) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += dt * 0.01;
  });

  // a small canvas used as sprite texture
  const sprite = React.useMemo(() => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    const grd = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.2, "rgba(200,230,255,0.9)");
    grd.addColorStop(0.4, "rgba(150,200,255,0.6)");
    grd.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  return (
    <points ref={pointsRef} position={[0, -30, -100]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={particles}
          count={particles.length / 3}
          itemSize={3}
          args={[particles, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1.6}
        sizeAttenuation
        map={sprite}
        transparent
        alphaTest={0.001}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
