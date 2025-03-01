'use client';

import { useEffect, useRef } from 'react';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

function Stars() {
  const { scene } = useThree();
  const backgroundStarsRef = useRef<THREE.Points | undefined>(undefined);

  useEffect(() => {
    // Create regular background stars
    const starCount = 1400;
    const starPositions = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = Math.random() * 100 + 25;
      const phi = Math.acos(-1 + Math.random() * 2);
      const theta = Math.random() * Math.PI * 2;

      starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i3 + 2] = radius * Math.cos(phi);

      // Tighter size control with inverse distance scaling
      const distanceFromCenter = Math.sqrt(
        Math.pow(starPositions[i3], 2) +
          Math.pow(starPositions[i3 + 1], 2) +
          Math.pow(starPositions[i3 + 2], 2)
      );
      const inverseScale = Math.max(0.2, Math.min(1, 50 / distanceFromCenter));
      starSizes[i] = (0.005 + Math.random() * 0.015) * inverseScale;
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

    // Create simple dot texture for stars
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(16, 16, 16, 0, Math.PI * 2);
    ctx.fill();

    const starTexture = new THREE.CanvasTexture(canvas);

    const starMaterial = new THREE.PointsMaterial({
      size: 0.14,
      map: starTexture,
      transparent: false,
      sizeAttenuation: true,
      depthWrite: false,
      color: 0xffffff,
    });

    const backgroundStars = new THREE.Points(starGeometry, starMaterial);
    backgroundStars.rotation.x = Math.PI * 0.25;
    backgroundStarsRef.current = backgroundStars;
    scene.add(backgroundStars);

    return () => {
      starGeometry.dispose();
      starMaterial.dispose();
      starTexture.dispose();
      scene.remove(backgroundStars);
    };
  }, [scene]);

  useFrame((state) => {
    if (backgroundStarsRef.current) {
      const time = state.clock.getElapsedTime() * 0.1;
      const slowRotation = time * 0.01;
      backgroundStarsRef.current.rotation.y = slowRotation;
    }
  });

  return null;
}

export default function BackgroundStars() {
  return (
    <div className="-z-1 fixed inset-0 h-full w-full">
      <Canvas
        style={{ width: '100%', height: '100%' }}
        dpr={[1, 1.5]}
        camera={{
          position: [0, 0, 90],
          fov: 45,
          near: 0.1,
          far: 2000,
        }}
        gl={{
          antialias: true,
          preserveDrawingBuffer: true,
        }}
      >
        <Stars />
      </Canvas>
    </div>
  );
}