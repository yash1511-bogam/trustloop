"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

function NotFound3DScene({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 300);
    camera.position.set(0, 0, 100);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6;
    el.appendChild(renderer.domElement);

    // Environment
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
      { color: 0xe8c9a0, pos: [-45, 20, 40], size: 40 },
      { color: 0xd4622b, pos: [0, -50, 30], size: 35 },
      { color: 0x6688cc, pos: [-30, 50, -20], size: 30 },
    ].forEach(({ color, pos, size }) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ color }));
      m.position.set(pos[0], pos[1], pos[2]);
      m.lookAt(0, 0, 0);
      envScene.add(m);
    });
    const envMap = pmrem.fromScene(envScene, 0.015).texture;
    pmrem.dispose();

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const key = new THREE.DirectionalLight(0xfff5e6, 2.2);
    key.position.set(40, 30, 35);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc4d4f8, 0.5);
    fill.position.set(-30, 10, -15);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xd4622b, 0.4);
    rim.position.set(0, -20, -25);
    scene.add(rim);

    let mesh: THREE.Mesh | null = null;
    let raf = 0;
    const mouse = { x: 0, y: 0 };
    const smoothMouse = { x: 0, y: 0 };
    let floatPhase = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouseMove);

    const loader = new SVGLoader();
    loader.load("/Logo/%E2%88%9E.svg", (data) => {
      const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
      const geo = new THREE.ExtrudeGeometry(shapes, {
        depth: 5,
        bevelEnabled: true,
        bevelThickness: 1.2,
        bevelSize: 0.6,
        bevelSegments: 6,
      });
      geo.computeBoundingBox();
      const box = geo.boundingBox!;
      geo.translate(-(box.max.x + box.min.x) / 2, -(box.max.y + box.min.y) / 2, -2.5);
      geo.computeVertexNormals();

      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x999999,
        metalness: 1.0,
        roughness: 0.15,
        envMap,
        envMapIntensity: 2.2,
        clearcoat: 0.5,
        clearcoatRoughness: 0.05,
      });

      mesh = new THREE.Mesh(geo, mat);
      mesh.scale.set(1, -1, 1);
      scene.add(mesh);
    });

    const animate = () => {
      raf = requestAnimationFrame(animate);
      floatPhase += 0.012;

      if (mesh) {
        smoothMouse.x += (mouse.x - smoothMouse.x) * 0.03;
        smoothMouse.y += (mouse.y - smoothMouse.y) * 0.03;
        mesh.rotation.y = smoothMouse.x * 0.3;
        mesh.rotation.x = smoothMouse.y * 0.15;
        mesh.position.y = Math.sin(floatPhase) * 1.5;
        mesh.rotation.z = Math.sin(floatPhase * 0.7) * 0.03;
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!el) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [containerRef]);

  return null;
}

export default function NotFoundPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--color-void)]">
      {/* 3D background */}
      <div ref={containerRef} className="absolute inset-0 z-0" />
      {mounted && <NotFound3DScene containerRef={containerRef} />}

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* Glitch 404 */}
        <div className="not-found-404 select-none font-[var(--font-heading)] text-[clamp(120px,20vw,220px)] font-extrabold leading-none tracking-tight">
          404
        </div>

        <h1
          className="mt-4 font-[var(--font-heading)] text-[clamp(24px,4vw,40px)] font-bold text-[var(--color-title)] not-found-fade-up"
          style={{ animationDelay: "0.3s" }}
        >
          Lost in the loop
        </h1>

        <p
          className="mt-3 max-w-[420px] text-[clamp(14px,1.5vw,16px)] leading-relaxed text-[var(--color-subtext)] not-found-fade-up"
          style={{ animationDelay: "0.5s" }}
        >
          The page you&apos;re looking for doesn&apos;t exist, or it drifted into another dimension. Let&apos;s get you back.
        </p>

        <div
          className="mt-8 flex flex-wrap justify-center gap-3 not-found-fade-up"
          style={{ animationDelay: "0.7s" }}
        >
          <button
            onClick={() => router.back()}
            className="btn btn-ghost border border-[var(--color-rim)] px-6 py-2.5 text-[14px] font-semibold transition-all hover:border-[var(--color-signal)] hover:text-[var(--color-signal)]"
            type="button"
          >
            ← Go back
          </button>
          <Link
            href="/"
            className="btn btn-primary px-6 py-2.5 text-[14px] font-semibold"
          >
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}
