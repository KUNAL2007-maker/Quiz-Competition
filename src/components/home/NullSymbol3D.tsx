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

    // --- Website Aesthetic Lighting (Zero Silver, Matte Dark Charcoal + Neon Lime Accent) ---
    // 1. Soft ambient tone
    const ambientLight = new THREE.AmbientLight(0x0e140a, 1.2);
    scene.add(ambientLight);

    // 2. Crisp key light
    const keyLight = new THREE.DirectionalLight(0xf2ffea, 2.2);
    keyLight.position.set(-3, 3, 4);
    scene.add(keyLight);

    // 3. Signature #8dc63f neon lime rim edge light
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

    // Model group for tilt and float
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
        model.rotation.y = 0.42;
        model.rotation.x = 0.1;
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

    // Mouse Tracking / Interactive Tilt
    let targetRotX = 0.1;
    let targetRotY = 0.42;

    const handleMouseMove = (e: MouseEvent) => {
      const banner = container.closest('section') || container;
      const rect = banner.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotY = 0.42 + x * 0.35;
      targetRotX = 0.1 - y * 0.25;
    };

    const handleMouseLeave = () => {
      targetRotY = 0.42;
      targetRotX = 0.1;
    };

    const bannerElem = container.closest('section') || container;
    bannerElem.addEventListener('mousemove', handleMouseMove as EventListener);
    bannerElem.addEventListener('mouseleave', handleMouseLeave);

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

      // Smooth damped rotation towards mouse position
      symbolGroup.rotation.y +=
        (targetRotY + Math.sin(elapsedTime * 0.8) * 0.06 - symbolGroup.rotation.y) * 0.06;
      symbolGroup.rotation.x += (targetRotX - symbolGroup.rotation.x) * 0.06;

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup on unmount
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      bannerElem.removeEventListener('mousemove', handleMouseMove as EventListener);
      bannerElem.removeEventListener('mouseleave', handleMouseLeave);

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
    >
      {/* Ambient Neon Atmosphere Glow */}
      <div
        className="pointer-events-none absolute h-64 w-64 rounded-full bg-[#8dc63f]/10 blur-3xl transition-opacity duration-700"
        style={{ opacity: isLoaded ? 0.35 : 0 }}
        aria-hidden="true"
      />

      {/* Three.js Canvas */}
      <canvas
        ref={canvasRef}
        className={`relative z-10 transition-opacity duration-700 cursor-grab active:cursor-grabbing ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  );
};
