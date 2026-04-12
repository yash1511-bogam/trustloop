"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

export function Footer3DLogo() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 200);
    camera.position.set(0, 0, 110);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    el.appendChild(renderer.domElement);

    // Environment map - studio-style for natural reflections
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
    // Studio softboxes
    const box1 = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    box1.position.set(50, 40, 50);
    box1.lookAt(0, 0, 0);
    envScene.add(box1);
    const box2 = new THREE.Mesh(new THREE.PlaneGeometry(35, 35), new THREE.MeshBasicMaterial({ color: 0xe8c9a0 }));
    box2.position.set(-45, 20, 40);
    box2.lookAt(0, 0, 0);
    envScene.add(box2);
    const box3 = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ color: 0xd4622b }));
    box3.position.set(0, -50, 30);
    box3.lookAt(0, 0, 0);
    envScene.add(box3);
    const envMap = pmrem.fromScene(envScene, 0.015).texture;
    pmrem.dispose();

    // Scene lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    const key = new THREE.DirectionalLight(0xfff5e6, 2.0);
    key.position.set(40, 30, 35);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc4d4f8, 0.5);
    fill.position.set(-30, 10, -15);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffeedd, 0.7);
    rim.position.set(0, -20, -25);
    scene.add(rim);

    let mesh: THREE.Mesh | null = null;
    let raf = 0;

    // Physics state
    let rotation = 0;           // current Y rotation
    let spinVelocity = 0;       // angular velocity (rad/s)
    const friction = 0.97;      // per-frame friction multiplier
    const hoverTarget = { x: 0, y: 0 };
    const hoverCurrent = { x: 0, y: 0 };

    // Drag state
    let dragging = false;
    let lastDragX = 0;
    let lastDragTime = 0;
    let dragVelocity = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (dragging) {
        const now = performance.now();
        const dt = Math.max(now - lastDragTime, 1) / 1000;
        const dx = (e.clientX - lastDragX) * 0.01;
        dragVelocity = dx / dt;
        rotation += dx;
        lastDragX = e.clientX;
        lastDragTime = now;
        return;
      }
      const rect = el.getBoundingClientRect();
      hoverTarget.x = ((e.clientX - rect.left) / rect.width - 0.5) * 0.6;
      hoverTarget.y = ((e.clientY - rect.top) / rect.height - 0.5) * 0.4;
    };
    const onMouseLeave = () => {
      if (!dragging) {
        hoverTarget.x = 0;
        hoverTarget.y = 0;
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      dragging = true;
      lastDragX = e.clientX;
      lastDragTime = performance.now();
      dragVelocity = 0;
      spinVelocity = 0;
      el.style.cursor = "grabbing";
    };
    const onMouseUp = () => {
      if (dragging) {
        // Transfer drag velocity to spin — clamp to max 40 rad/s
        spinVelocity = Math.max(-40, Math.min(40, dragVelocity));
      }
      dragging = false;
      el.style.cursor = "grab";
    };

    el.style.cursor = "grab";
    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseleave", onMouseLeave);
    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    const loader = new SVGLoader();
    loader.load("/Logo/%E2%88%9E.svg", (data) => {
      const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
      const geo = new THREE.ExtrudeGeometry(shapes, {
        depth: 3,
        bevelEnabled: true,
        bevelThickness: 0.8,
        bevelSize: 0.4,
        bevelSegments: 5,
      });
      geo.computeBoundingBox();
      const box = geo.boundingBox!;
      geo.translate(-(box.max.x + box.min.x) / 2, -(box.max.y + box.min.y) / 2, -1.5);
      geo.computeVertexNormals();

      const mat = new THREE.MeshPhysicalMaterial({
        color: 0xaaaaaa,
        metalness: 1.0,
        roughness: 0.18,
        envMap,
        envMapIntensity: 2.0,
        clearcoat: 0.4,
        clearcoatRoughness: 0.08,
      });

      mesh = new THREE.Mesh(geo, mat);
      mesh.scale.set(1, -1, 1);
      scene.add(mesh);
    });

    const animate = () => {
      raf = requestAnimationFrame(animate);

      if (mesh) {
        // Fidget spinner: apply spin velocity with friction when not dragging
        if (!dragging) {
          rotation += spinVelocity * 0.016;
          spinVelocity *= friction;
          // Stop when negligible
          if (Math.abs(spinVelocity) < 0.01) spinVelocity = 0;
        }

        // Smooth hover tilt
        hoverCurrent.x += (hoverTarget.x - hoverCurrent.x) * 0.08;
        hoverCurrent.y += (hoverTarget.y - hoverCurrent.y) * 0.08;

        mesh.rotation.y = rotation + hoverCurrent.x;
        mesh.rotation.x = hoverCurrent.y;
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
      window.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseleave", onMouseLeave);
      el.removeEventListener("mousedown", onMouseDown);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="mx-auto"
      style={{ width: "360px", height: "180px" }}
    />
  );
}
