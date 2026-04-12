"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

function setup3D(el: HTMLDivElement) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 300);
  camera.position.set(0, 0, 100);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(el.clientWidth, el.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.6;
  el.appendChild(renderer.domElement);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envGeo = new THREE.SphereGeometry(100, 32, 32);
  const c = new Float32Array(envGeo.attributes.position.count * 3);
  for (let i = 0; i < envGeo.attributes.position.count; i++) {
    const y = envGeo.attributes.position.getY(i) / 100;
    c[i * 3] = 0.12 + (y + 1) * 0.15;
    c[i * 3 + 1] = 0.11 + (y + 1) * 0.13;
    c[i * 3 + 2] = 0.13 + (y + 1) * 0.16;
  }
  envGeo.setAttribute("color", new THREE.BufferAttribute(c, 3));
  envScene.add(new THREE.Mesh(envGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  [{ c: 0xffffff, p: [50, 40, 50], s: 60 }, { c: 0xd4622b, p: [-40, -30, 40], s: 40 }].forEach(({ c: color, p, s }) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ color }));
    m.position.set(p[0], p[1], p[2]);
    m.lookAt(0, 0, 0);
    envScene.add(m);
  });
  const envMap = pmrem.fromScene(envScene, 0.015).texture;
  pmrem.dispose();

  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const key = new THREE.DirectionalLight(0xfff5e6, 2.2);
  key.position.set(40, 30, 35);
  scene.add(key);

  let mesh: THREE.Mesh | null = null;
  let raf = 0;
  const mouse = { x: 0, y: 0 }, smooth = { x: 0, y: 0 };
  let phase = 0;

  const onMove = (e: MouseEvent) => {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener("mousemove", onMove);

  new SVGLoader().load("/Logo/%E2%88%9E.svg", (data) => {
    const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: 5, bevelEnabled: true, bevelThickness: 1.2, bevelSize: 0.6, bevelSegments: 6 });
    geo.computeBoundingBox();
    const b = geo.boundingBox!;
    geo.translate(-(b.max.x + b.min.x) / 2, -(b.max.y + b.min.y) / 2, -2.5);
    geo.computeVertexNormals();
    mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0x999999, metalness: 1, roughness: 0.15, envMap, envMapIntensity: 2.2, clearcoat: 0.5, clearcoatRoughness: 0.05 }));
    mesh.scale.set(1, -1, 1);
    scene.add(mesh);
  });

  const animate = () => {
    raf = requestAnimationFrame(animate);
    phase += 0.01;
    if (mesh) {
      smooth.x += (mouse.x - smooth.x) * 0.03;
      smooth.y += (mouse.y - smooth.y) * 0.03;
      mesh.rotation.y = smooth.x * 0.4 + Math.sin(phase) * 0.05;
      mesh.rotation.x = smooth.y * 0.2;
      mesh.position.y = Math.sin(phase * 1.2) * 1.5;
    }
    renderer.render(scene, camera);
  };
  animate();

  const onResize = () => {
    camera.aspect = el.clientWidth / el.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(el.clientWidth, el.clientHeight);
  };
  window.addEventListener("resize", onResize);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("mousemove", onMove);
    renderer.dispose();
    if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
  };
}

export default function NotFoundPage() {
  const logoRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted || !logoRef.current) return;
    return setup3D(logoRef.current);
  }, [mounted]);

  return (
    <main className="fixed inset-0 flex items-center justify-center overflow-hidden bg-[var(--color-void)]">
      {/* 3D logo background */}
      <div ref={logoRef} className="absolute inset-0 z-0 opacity-40" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <div className="not-found-404 select-none font-[var(--font-heading)] text-[clamp(120px,22vw,240px)] font-black leading-none">
          404
        </div>
        <h1 className="not-found-fade-up mt-2 font-[var(--font-heading)] text-[clamp(20px,3.5vw,36px)] font-bold text-[var(--color-title)]" style={{ animationDelay: "0.3s" }}>
          Lost in the loop
        </h1>
        <p className="not-found-fade-up mt-3 max-w-[380px] text-[clamp(13px,1.4vw,15px)] leading-relaxed text-[var(--color-subtext)]" style={{ animationDelay: "0.5s" }}>
          This page doesn&apos;t exist. Let&apos;s get you back.
        </p>
        <div className="not-found-fade-up mt-8 flex gap-3" style={{ animationDelay: "0.7s" }}>
          <button
            onClick={() => router.back()}
            className="rounded-full border border-[var(--color-rim)] px-6 py-2.5 text-[13px] font-semibold text-[var(--color-body)] transition-all hover:border-[var(--color-signal)] hover:text-[var(--color-signal)]"
            type="button"
          >
            ← Go back
          </button>
          <Link href="/" className="rounded-full bg-[var(--color-signal)] px-6 py-2.5 text-[13px] font-semibold text-white transition-all hover:brightness-110">
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}
