"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

gsap.registerPlugin(ScrollTrigger);

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
  const envColors = new Float32Array(envGeo.attributes.position.count * 3);
  for (let i = 0; i < envGeo.attributes.position.count; i++) {
    const y = envGeo.attributes.position.getY(i) / 100;
    envColors[i * 3] = 0.12 + (y + 1) * 0.15;
    envColors[i * 3 + 1] = 0.11 + (y + 1) * 0.13;
    envColors[i * 3 + 2] = 0.13 + (y + 1) * 0.16;
  }
  envGeo.setAttribute("color", new THREE.BufferAttribute(envColors, 3));
  envScene.add(new THREE.Mesh(envGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  [
    { color: 0xffffff, pos: [50, 40, 50], size: 60 },
    { color: 0xd4622b, pos: [-40, -30, 40], size: 40 },
    { color: 0x6688cc, pos: [-30, 50, -20], size: 30 },
  ].forEach(({ color, pos, size }) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ color }));
    m.position.set(pos[0], pos[1], pos[2]);
    m.lookAt(0, 0, 0);
    envScene.add(m);
  });
  const envMap = pmrem.fromScene(envScene, 0.015).texture;
  pmrem.dispose();

  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const key = new THREE.DirectionalLight(0xfff5e6, 2.2);
  key.position.set(40, 30, 35);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc4d4f8, 0.5);
  fill.position.set(-30, 10, -15);
  scene.add(fill);

  let mesh: THREE.Mesh | null = null;
  let raf = 0;
  const mouse = { x: 0, y: 0 };
  const smooth = { x: 0, y: 0 };
  let phase = 0;

  const onMove = (e: MouseEvent) => {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener("mousemove", onMove);

  const loader = new SVGLoader();
  loader.load("/Logo/%E2%88%9E.svg", (data) => {
    const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: 5, bevelEnabled: true, bevelThickness: 1.2, bevelSize: 0.6, bevelSegments: 6 });
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    geo.translate(-(box.max.x + box.min.x) / 2, -(box.max.y + box.min.y) / 2, -2.5);
    geo.computeVertexNormals();
    mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
      color: 0x999999, metalness: 1.0, roughness: 0.15, envMap, envMapIntensity: 2.2, clearcoat: 0.5, clearcoatRoughness: 0.05,
    }));
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
  const triggerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !triggerRef.current) return;

    const boxes = triggerRef.current.querySelectorAll(".nf-bar");
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: triggerRef.current,
        scrub: 0.5,
        pin: true,
        start: "top top",
        end: "+=150%",
      },
    });
    tl.to(boxes, { force3D: true, duration: 1, xPercent: 100, ease: "power1.inOut", stagger: { amount: 1 } })
      .to(boxes, { ease: "power1.out", duration: 1, rotation: "45deg" }, 0)
      .to(boxes, { ease: "power1.in", duration: 1, rotation: "0deg" }, 1);

    return () => { tl.kill(); ScrollTrigger.getAll().forEach((t) => t.kill()); };
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !logoRef.current) return;
    return setup3D(logoRef.current);
  }, [mounted]);

  const bars = Array.from({ length: 60 });

  return (
    <div className="bg-[var(--color-void)]">
      {/* Section 1: Scroll-driven bars revealing content */}
      <div ref={triggerRef} className="relative h-screen w-screen overflow-hidden">
        {/* Left side: "404" text behind bars */}
        <div className="absolute inset-0 z-0 flex items-center justify-center">
          <span className="not-found-404 select-none font-[var(--font-heading)] text-[clamp(150px,25vw,300px)] font-black leading-none">
            404
          </span>
        </div>

        {/* Right side: 3D logo behind bars */}
        <div ref={logoRef} className="absolute inset-0 z-0" />

        {/* Bars overlay */}
        <div className="relative z-10 flex flex-col">
          {bars.map((_, i) => (
            <div key={i} className="nf-bar" style={{ height: "1.2vh", width: "50vw", marginBottom: "-0.2vh", background: "var(--color-void)" }} />
          ))}
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 text-center">
          <p className="text-[12px] uppercase tracking-[0.2em] text-[var(--color-ghost)] animate-bounce">
            Scroll to reveal
          </p>
        </div>
      </div>

      {/* Section 2: Content */}
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-20 text-center">
        <h1 className="not-found-fade-up font-[var(--font-heading)] text-[clamp(32px,5vw,56px)] font-extrabold text-[var(--color-title)]" style={{ animationDelay: "0.2s" }}>
          Lost in the loop
        </h1>
        <p className="not-found-fade-up mt-4 max-w-[440px] text-[clamp(14px,1.5vw,17px)] leading-relaxed text-[var(--color-subtext)]" style={{ animationDelay: "0.4s" }}>
          This page doesn&apos;t exist — or it drifted somewhere we can&apos;t reach. Let&apos;s get you back on track.
        </p>
        <div className="not-found-fade-up mt-10 flex flex-wrap justify-center gap-4" style={{ animationDelay: "0.6s" }}>
          <button
            onClick={() => router.back()}
            className="group relative overflow-hidden rounded-full border border-[var(--color-rim)] bg-transparent px-7 py-3 text-[14px] font-semibold text-[var(--color-body)] transition-all hover:border-[var(--color-signal)] hover:text-[var(--color-signal)]"
            type="button"
          >
            ← Go back
          </button>
          <Link
            href="/"
            className="rounded-full bg-[var(--color-signal)] px-7 py-3 text-[14px] font-semibold text-white transition-all hover:brightness-110"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}
