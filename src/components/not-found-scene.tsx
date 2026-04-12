"use client";

import { useRef, useEffect } from "react";

export default function NotFoundScene({ disableHover = false }: { disableHover?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const THREE = await import("three");
        const { SVGLoader } = await import("three/examples/jsm/loaders/SVGLoader.js");
        if (!el.isConnected) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 300);
        camera.position.set(0, 0, 100);

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.6;
        el.appendChild(renderer.domElement);
        Object.assign(renderer.domElement.style, { position: "absolute", inset: "0", width: "100%", height: "100%" });

        const pmrem = new THREE.PMREMGenerator(renderer);
        const envScene = new THREE.Scene();
        const envGeo = new THREE.SphereGeometry(100, 32, 32);
        const colors = new Float32Array(envGeo.attributes.position.count * 3);
        for (let i = 0; i < envGeo.attributes.position.count; i++) {
          const y = envGeo.attributes.position.getY(i) / 100;
          colors[i * 3] = 0.12 + (y + 1) * 0.15;
          colors[i * 3 + 1] = 0.11 + (y + 1) * 0.13;
          colors[i * 3 + 2] = 0.13 + (y + 1) * 0.16;
        }
        envGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        envScene.add(new THREE.Mesh(envGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
        [{ c: 0xffffff, p: [50, 40, 50], s: 60 }, { c: 0xd4622b, p: [-40, -30, 40], s: 40 }].forEach(({ c, p, s }) => {
          const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ color: c }));
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

        let mesh: InstanceType<typeof THREE.Mesh> | null = null;
        let raf = 0;
        const mouse = { x: 0, y: 0 }, smooth = { x: 0, y: 0 };
        let phase = 0;

        const onMove = (e: MouseEvent) => {
          if (disableHover) return;
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
          mesh.rotation.z = Math.PI / 2;
          scene.add(mesh);
        });

        const animate = () => {
          raf = requestAnimationFrame(animate);
          phase += 0.01;
          if (mesh) {
            if (disableHover) {
              // Static — no rotation, no float, but rotated 90° for vertical display
              mesh.rotation.z = Math.PI / 2;
            } else {
              smooth.x += (mouse.x - smooth.x) * 0.03;
              smooth.y += (mouse.y - smooth.y) * 0.03;
              mesh.rotation.y = smooth.x * 0.4 + Math.sin(phase) * 0.05;
              mesh.rotation.x = smooth.y * 0.2;
              mesh.position.y = Math.sin(phase * 1.2) * 1.5;
            }
          }
          renderer.render(scene, camera);
        };
        animate();

        const onResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", onResize);

        cleanup = () => {
          cancelAnimationFrame(raf);
          window.removeEventListener("resize", onResize);
          window.removeEventListener("mousemove", onMove);
          renderer.dispose();
          if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
        };
      } catch { /* Three.js unavailable — page text still visible */ }
    })();

    return () => { cleanup?.(); };
  }, [disableHover]);

  return <div ref={ref} style={{ position: "absolute", inset: 0, zIndex: 0, opacity: 0.7 }} />;
}
