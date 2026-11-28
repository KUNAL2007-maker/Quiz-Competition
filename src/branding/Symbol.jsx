import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { NullOriginLogo } from './NullOriginLogo';

export default function Symbol() {
  const container = useRef(null);
  const canvas = useRef(null);
  const controls = useRef(null);
  const [available, setAvailable] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const target = canvas.current;
    const frame = container.current;
    let destroyed = false;
    let teardown = () => {};
    async function mount() {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      const [THREE, { GLTFLoader }] = await Promise.all([
        import('three'),
        import('three/examples/jsm/loaders/GLTFLoader.js'),
      ]);
      if (destroyed) return;
      const renderer = new THREE.WebGLRenderer({ canvas: target, alpha: true, antialias: true, powerPreference: 'low-power' });
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 0, 5.2);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      scene.add(new THREE.AmbientLight(0x8dc63f, 0.45));
      for (const [color, intensity, position] of [
        [0xffffff, 0.65, [-2, 3, 4]], [0x557a22, 0.4, [3, -1, 3]], [0xa4d65e, 1.2, [3, 2, -2]],
      ]) {
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(...position);
        scene.add(light);
      }
      const group = new THREE.Group();
      group.rotation.set(0.1, 0.42, 0);
      scene.add(group);
      let inView = true;
      let manualPause = reduced.matches;
      let pointer = null;
      let previousTime = 0;
      let animationFrame = 0;
      let model = null;
      let material = null;
      function draw() {
        if (model && !destroyed) renderer.render(scene, camera);
      }
      function animate(now) {
        animationFrame = 0;
        const delta = previousTime ? Math.min(now - previousTime, 50) : 0;
        previousTime = now;
        if (!pointer) group.rotation.y += delta * 0.00015;
        group.position.y = Math.sin(now * 0.0015) * 0.08;
        draw();
        sync();
      }
      function sync() {
        if (model && inView && !document.hidden && !manualPause && !destroyed) {
          if (!animationFrame) animationFrame = requestAnimationFrame(animate);
        } else {
          cancelAnimationFrame(animationFrame);
          animationFrame = 0;
          previousTime = 0;
        }
      }
      function toggle(value) {
        manualPause = value;
        setPaused(value);
        sync();
      }
      controls.current = toggle;
      setPaused(manualPause);
      function resize() {
        const width = frame.clientWidth;
        const height = frame.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        draw();
      }
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(frame);
      const visibility = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); });
      visibility.observe(frame);
      const events = new AbortController();
      const options = { signal: events.signal };
      reduced.addEventListener('change', () => toggle(reduced.matches), options);
      document.addEventListener('visibilitychange', sync, options);
      target.addEventListener('webglcontextlost', () => { inView = false; sync(); setAvailable(false); }, options);
      target.addEventListener('pointerdown', (e) => {
        if (!e.isPrimary || e.button !== 0) return;
        pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
        target.setPointerCapture(e.pointerId);
      }, options);
      target.addEventListener('pointermove', (e) => {
        if (pointer?.id !== e.pointerId) return;
        group.rotation.y += (e.clientX - pointer.x) * 0.012;
        group.rotation.x = Math.max(-0.5, Math.min(0.5, group.rotation.x + (e.clientY - pointer.y) * 0.012));
        pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
        draw();
      }, options);
      target.addEventListener('lostpointercapture', () => { pointer = null; }, options);
      teardown = () => {
        events.abort();
        controls.current = null;
        cancelAnimationFrame(animationFrame);
        visibility.disconnect();
        resizeObserver.disconnect();
        model?.traverse((child) => child.geometry?.dispose());
        material?.dispose();
        renderer.dispose();
      };
      const gltf = await new GLTFLoader().loadAsync('/models/no-symbol-3d-v4.glb');
      const originalMaterials = new Set();
      gltf.scene.traverse((mesh) => {
        if (!mesh.isMesh) return;
        for (const original of [].concat(mesh.material)) originalMaterials.add(original);
        if (destroyed) mesh.geometry.dispose();
      });
      for (const original of originalMaterials) original.dispose();
      if (destroyed) return;
      model = gltf.scene;
      material = new THREE.MeshStandardMaterial({ color: 0x8dc63f, roughness: 0.38, metalness: 0.05, emissive: 0x22360c, emissiveIntensity: 0.18 });
      model.position.sub(new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3()));
      model.traverse((mesh) => {
        if (!mesh.isMesh) return;
        mesh.material = material;
        mesh.geometry.computeVertexNormals();
      });
      model.scale.setScalar(1.05);
      group.add(model);
      resize();
      setAvailable(true);
      sync();
    }
    mount().catch(() => { if (!destroyed) { teardown(); teardown = () => {}; setAvailable(false); } });
    return () => { destroyed = true; teardown(); };
  }, []);

  return <div ref={container} className="origin-symbol">
    {!available && <NullOriginLogo className="origin-symbol-fallback" />}
    <canvas ref={canvas} aria-label="Three-dimensional Null Origin symbol" role="img" style={{ opacity: available ? 1 : 0 }} />
    {available && <button type="button" className="symbol-control" aria-label={paused ? 'Play logo animation' : 'Pause logo animation'}
      onClick={() => controls.current?.(!paused)}>{paused ? <Play size={14} /> : <Pause size={14} />}</button>}
  </div>;
}
