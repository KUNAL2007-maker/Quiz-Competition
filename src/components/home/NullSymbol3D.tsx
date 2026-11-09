import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface NullSymbol3DProps {
  className?: string;
  onLoaded?: () => void;
}

export const NullSymbol3D: React.FC<NullSymbol3DProps> = ({ className = '', onLoaded }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let animationFrameId: number;
    let isDisposed = false;

    // Dimensions
    const width = container.clientWidth || 380;
    const height = container.clientHeight || 340;

    // Renderer calibrated to exact #8dc63f button color fidelity
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.NoToneMapping;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.2);

    // --- Calibrated #8dc63f Lighting (Exact Match to Browse Competitions button) ---
    // 1. Soft green ambient
    const ambientLight = new THREE.AmbientLight(0x8dc63f, 0.45);
    scene.add(ambientLight);

    // 2. Soft white directional key light
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.65);
    keyLight.position.set(-2, 3, 4);
    scene.add(keyLight);

    // 3. Subtle dark green fill light
    const fillLight = new THREE.DirectionalLight(0x557a22, 0.4);
    fillLight.position.set(3, -1, 3);
    scene.add(fillLight);

    // 4. Subtle top-back rim accent
    const rimLight = new THREE.DirectionalLight(0xa4d65e, 1.2);
    rimLight.position.set(3, 2, -2);
    scene.add(rimLight);

    // Group for drag rotation & float
    const symbolGroup = new THREE.Group();
    scene.add(symbolGroup);

    // Exact #8dc63f Material (RGB: 141, 198, 63)
    const websiteMaterial = new THREE.MeshStandardMaterial({
      color: 0x8dc63f,
      roughness: 0.38,
      metalness: 0.05,
      emissive: 0x22360c,
      emissiveIntensity: 0.18,
    });

    const loader = new GLTFLoader();
    loader.load(
      '/models/no-symbol-3d-v4.glb',
      (gltf) => {
        if (isDisposed) return;
        const model = gltf.scene;

        // Auto-center geometry bounding box
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.material = websiteMaterial;
            mesh.geometry.computeVertexNormals();
          }
        });

        // Set initial dynamic 3/4 perspective angle
        symbolGroup.rotation.y = 0.42;
        symbolGroup.rotation.x = 0.1;
        model.scale.set(1.05, 1.05, 1.05);

        symbolGroup.add(model);
        setIsLoaded(true);
        if (onLoaded) onLoaded();
      },
      undefined,
      (err) => {
        console.warn('GLTF loading fallback:', err);
      }
    );

    // --- Interactive Drag-to-Rotate Mechanics ---
    let dragging = false;
    let prevPointerX = 0;
    let prevPointerY = 0;
    let velocityY = 0;
    let velocityX = 0;

    const handlePointerDown = (e: PointerEvent) => {
      dragging = true;
      setIsDragging(true);
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
      velocityY = 0;
      velocityX = 0;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (_) {}
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragging) return;

      const deltaX = e.clientX - prevPointerX;
      const deltaY = e.clientY - prevPointerY;

      // Sensitivity: drag left/right rotates around Y, drag up/down tilts X
      const SENSITIVITY = 0.012;
      symbolGroup.rotation.y += deltaX * SENSITIVITY;
      symbolGroup.rotation.x += deltaY * SENSITIVITY;

      // Clamp X tilt between -0.5 and 0.5 rad so it doesn't invert upside down
      symbolGroup.rotation.x = Math.max(-0.5, Math.min(0.5, symbolGroup.rotation.x));

      // Record velocity for inertial throw
      velocityY = deltaX * SENSITIVITY;
      velocityX = deltaY * SENSITIVITY;

      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (dragging) {
        dragging = false;
        setIsDragging(false);
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 380;
      const h = container.clientHeight || 340;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    const clock = new THREE.Clock();
    const animate = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Gentle vertical float
      symbolGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.08;

      if (!dragging) {
        // Apply inertial momentum with friction decay
        if (Math.abs(velocityY) > 0.0001) {
          symbolGroup.rotation.y += velocityY;
          velocityY *= 0.93; // 93% friction decay per frame
        } else {
          // Slow ambient drift when idle
          symbolGroup.rotation.y += 0.0025;
        }

        if (Math.abs(velocityX) > 0.0001) {
          symbolGroup.rotation.x += velocityX;
          velocityX *= 0.93;
          symbolGroup.rotation.x = Math.max(-0.5, Math.min(0.5, symbolGroup.rotation.x));
        } else {
          // Return tilt gently toward baseline (0.1)
          symbolGroup.rotation.x += (0.1 - symbolGroup.rotation.x) * 0.02;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup on unmount
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [onLoaded]);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ touchAction: 'none' }}
    >
      {/* Three.js Interactive Drag Canvas */}
      <canvas
        ref={canvasRef}
        className={`relative z-10 transition-opacity duration-500 touch-none select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        } ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ maxWidth: '100%', maxHeight: '100%' }}
        title="Click and drag to rotate the Null Origin 3D symbol"
      />
    </div>
  );
};
