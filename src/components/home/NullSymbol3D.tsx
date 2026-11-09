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

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.2);

    // --- Website Aesthetic Lighting (Zero Silver, Matte Dark Obsidian + Neon Lime Accent) ---
    // 1. Soft ambient tone
    const ambientLight = new THREE.AmbientLight(0x0e140a, 1.2);
    scene.add(ambientLight);

    // 2. Crisp key light
    const keyLight = new THREE.DirectionalLight(0xf2ffea, 2.2);
    keyLight.position.set(-3, 3, 4);
    scene.add(keyLight);

    // 3. High-intensity #8dc63f neon lime rim edge light
    const rimLight = new THREE.DirectionalLight(0x8dc63f, 7.5);
    rimLight.position.set(3.5, 1.0, -1.5);
    scene.add(rimLight);

    // 4. Secondary rim accent (left-bottom)
    const rimLight2 = new THREE.DirectionalLight(0x7ab32e, 4.5);
    rimLight2.position.set(-3.5, -2.5, -1.5);
    scene.add(rimLight2);

    // 5. Center point glow
    const pointLight = new THREE.PointLight(0x8dc63f, 2.5, 7);
    pointLight.position.set(0, -0.5, 2.0);
    scene.add(pointLight);

    // Group for drag rotation & float
    const symbolGroup = new THREE.Group();
    scene.add(symbolGroup);

    // Custom Obsidian Material with green glint
    const websiteMaterial = new THREE.MeshStandardMaterial({
      color: 0x151614,
      roughness: 0.22,
      metalness: 0.45,
      emissive: 0x081004,
      emissiveIntensity: 0.2,
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
