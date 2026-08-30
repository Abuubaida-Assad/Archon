'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { ArchEdge, ArchNode, ArchitectureLayer } from '@/types';
import { Box, Layers, Folder, ArrowRight } from 'lucide-react';

interface ArchitectureMap3DProps {
  nodes: ArchNode[];
  edges: ArchEdge[];
  selectedNodeId: string | null;
  impactedNodeIds?: string[];
  onSelectNode: (node: ArchNode) => void;
}

const LAYER_Y_POSITIONS: Record<ArchitectureLayer, number> = {
  frontend: 140,
  gateway: 75,
  api: 70,
  service: 0,
  domain: -10,
  database: -80,
  queue: -90,
  util: -40,
  test: 20,
  infra: -120,
  note: 100,
  external: -140,
};

const LAYER_COLORS_HEX: Record<ArchitectureLayer, number> = {
  frontend: 0x38bdf8, // Sky Blue (Frontend / UI)
  gateway: 0x60a5fa,  // Blue (Gateway)
  api: 0x0ea5e9,      // Cyan/Sky (API Routes)
  service: 0x818cf8,  // Indigo (Services / Business Logic)
  domain: 0xa78bfa,   // Purple (Domain Models)
  database: 0xf59e0b, // Amber (Database / Storage)
  queue: 0xf97316,    // Orange (Queues / Events)
  util: 0x94a3b8,     // Slate (Utilities / Helpers)
  test: 0x10b981,     // Emerald (Tests / Specs)
  infra: 0x64748b,    // Slate (Infrastructure)
  note: 0xf472b6,     // Pink (Notes)
  external: 0xe2e8f0, // White (External SDKs)
};

export const ArchitectureMap3D: React.FC<ArchitectureMap3DProps> = ({
  nodes,
  edges,
  selectedNodeId,
  impactedNodeIds = [],
  onSelectNode,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<ArchNode | null>(null);

  // References to keep Three.js alive across property changes without re-creating WebGL context
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const nodeMeshMapRef = useRef<Map<string, { mesh: THREE.Mesh; node: ArchNode; pos: THREE.Vector3 }>>(new Map());
  const lineGroupRef = useRef<THREE.Group | null>(null);
  const onSelectNodeRef = useRef(onSelectNode);
  onSelectNodeRef.current = onSelectNode;

  // Initialize Three.js WebGL Scene ONCE
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const isLightInitial = document.documentElement.classList.contains('light');
    scene.background = new THREE.Color(isLightInitial ? 0xf5f3ef : 0x080b10);
    sceneRef.current = scene;

    const handleThemeChange = (e: any) => {
      const isLight = e.detail?.theme === 'light' || document.documentElement.classList.contains('light');
      scene.background = new THREE.Color(isLight ? 0xf5f3ef : 0x080b10);
    };
    window.addEventListener('themechange', handleThemeChange);

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2500);
    camera.position.set(0, 160, 460);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. High-Clarity Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 1.2);
    hemiLight.position.set(0, 300, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(200, 350, 250);
    scene.add(dirLight);

    const fillLight = new THREE.PointLight(0x38bdf8, 2, 1000);
    fillLight.position.set(-150, 50, 200);
    scene.add(fillLight);

    // 4. Layer Grid Planes
    const createLayerGrid = (y: number, colorHex: number) => {
      const gridHelper = new THREE.GridHelper(440, 22, colorHex, 0x1e293b);
      gridHelper.position.y = y;
      gridHelper.material.opacity = 0.22;
      gridHelper.material.transparent = true;
      scene.add(gridHelper);
    };

    createLayerGrid(140, 0x38bdf8); // Tier 1: Frontend
    createLayerGrid(70, 0x0ea5e9);  // Tier 2: API
    createLayerGrid(0, 0x818cf8);   // Tier 3: Services
    createLayerGrid(-80, 0xf59e0b); // Tier 4: Database

    // 5. Node Meshes
    const nodeMeshMap = new Map<string, { mesh: THREE.Mesh; node: ArchNode; pos: THREE.Vector3 }>();
    const nodeObjects: THREE.Mesh[] = [];
    const layerCounters: Record<string, number> = {};

    nodes.forEach((node) => {
      const count = layerCounters[node.layer] || 0;
      layerCounters[node.layer] = count + 1;

      const angle = count * 0.8 + Math.PI / 4;
      const radius = 60 + (count % 4) * 35;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = LAYER_Y_POSITIONS[node.layer] || 0;

      const pos = new THREE.Vector3(x, y, z);
      const colorHex = LAYER_COLORS_HEX[node.layer] || 0x94a3b8;
      const size = node.type === 'service' ? 10 : node.type === 'api' || node.type === 'database' ? 8 : 6;

      const geometry = new THREE.SphereGeometry(size, 24, 24);
      const material = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.15,
        metalness: 0.35,
        emissive: colorHex,
        emissiveIntensity: 0.25,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(pos);
      (mesh as any).nodeData = node;

      scene.add(mesh);
      nodeObjects.push(mesh);
      nodeMeshMap.set(node.id, { mesh, node, pos });
    });

    nodeMeshMapRef.current = nodeMeshMap;

    // 6. 3D Highly Visible Relationship Lines
    const lineGroup = new THREE.Group();
    edges.forEach((edge) => {
      const sourceObj = nodeMeshMap.get(edge.source);
      const targetObj = nodeMeshMap.get(edge.target);

      if (sourceObj && targetObj) {
        const points = [sourceObj.pos, targetObj.pos];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({
          color: 0x475569,
          transparent: true,
          opacity: 0.35,
          linewidth: 1.5,
        });

        const line = new THREE.Line(lineGeo, lineMat);
        (line as any).edgeData = edge;
        lineGroup.add(line);
      }
    });

    scene.add(lineGroup);
    lineGroupRef.current = lineGroup;

    // 7. Mouse Controls & Raycasting
    let isMouseDown = false;
    let dragDist = 0;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;
    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2();

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      isMouseDown = true;
      dragDist = 0;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseVec, camera);
      const intersects = raycaster.intersectObjects(nodeObjects);

      if (intersects.length > 0) {
        const hitNode = (intersects[0].object as any).nodeData as ArchNode;
        setHoveredNode(hitNode);
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredNode(null);
        renderer.domElement.style.cursor = isMouseDown ? 'grabbing' : 'grab';
      }

      if (isMouseDown) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        dragDist += Math.abs(deltaX) + Math.abs(deltaY);
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;

        targetRotationY += deltaX * 0.005;
        targetRotationX += deltaY * 0.005;
        targetRotationX = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, targetRotationX));
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (dragDist < 8) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouseVec, camera);
        const intersects = raycaster.intersectObjects(nodeObjects);
        if (intersects.length > 0) {
          const hitNode = (intersects[0].object as any).nodeData as ArchNode;
          onSelectNodeRef.current(hitNode);
        }
      }
      isMouseDown = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.min(1000, Math.max(150, camera.position.z + e.deltaY * 0.4));
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel);

    // 8. Render & Animation Loop
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isMouseDown) {
        targetRotationY += 0.0012;
      }

      scene.rotation.y = targetRotationY;
      scene.rotation.x = targetRotationX;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('themechange', handleThemeChange);
      renderer.dispose();
    };
  }, [nodes, edges]);

  // Update selection & highlighted relationship lines
  useEffect(() => {
    const nodeMeshMap = nodeMeshMapRef.current;
    const lineGroup = lineGroupRef.current;
    if (!nodeMeshMap || nodeMeshMap.size === 0) return;

    nodeMeshMap.forEach(({ mesh, node }) => {
      const isSelected = node.id === selectedNodeId;
      const isImpacted = impactedNodeIds.includes(node.id);
      const baseColor = LAYER_COLORS_HEX[node.layer] || 0x94a3b8;

      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (isSelected) {
        mat.color.setHex(0x38bdf8);
        mat.emissive.setHex(0x0ea5e9);
        mat.emissiveIntensity = 0.95;
      } else if (isImpacted) {
        mat.color.setHex(0xf43f5e);
        mat.emissive.setHex(0xf43f5e);
        mat.emissiveIntensity = 0.8;
      } else {
        mat.color.setHex(baseColor);
        mat.emissive.setHex(baseColor);
        mat.emissiveIntensity = selectedNodeId ? 0.15 : 0.3;
      }
    });

    if (lineGroup) {
      lineGroup.children.forEach((child) => {
        const line = child as THREE.Line;
        const edge = (line as any).edgeData as ArchEdge;
        if (!edge) return;

        const isSelectedEdge = selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);
        const isImpacted = impactedNodeIds.includes(edge.source) && impactedNodeIds.includes(edge.target);

        const mat = line.material as THREE.LineBasicMaterial;
        if (isSelectedEdge) {
          // Intense highlight for active relationships
          mat.color.setHex(0x38bdf8);
          mat.opacity = 1.0;
        } else if (isImpacted) {
          mat.color.setHex(0xf43f5e);
          mat.opacity = 0.95;
        } else if (selectedNodeId) {
          // Softly dim unrelated lines
          mat.color.setHex(0x334155);
          mat.opacity = 0.08;
        } else {
          // Default state: clearly visible connection lines
          mat.color.setHex(0x475569);
          mat.opacity = 0.35;
        }
      });
    }
  }, [selectedNodeId, impactedNodeIds]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[#080B10] select-none">
      {/* 3D Mode Top Header */}
      <div className="absolute top-4 left-4 z-20 p-3 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-800 text-xs text-slate-300 shadow-md max-w-xs">
        <div className="flex items-center gap-2 mb-1 font-bold text-sky-400">
          <Box className="w-4 h-4" />
          <span>Spatial Architecture View</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-snug">
          Click any component to illuminate its exact caller and dependency lines.
        </p>
      </div>

      {/* Folder Type, Tier & Color Guide Card */}
      <div className="absolute top-4 right-4 z-20 p-3.5 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-800 text-xs shadow-xl max-w-sm">
        <div className="flex items-center gap-2 font-semibold text-slate-200 pb-2 border-b border-slate-800">
          <Folder className="w-4 h-4 text-sky-400" />
          <span>Folder & Tier Architecture Guide</span>
        </div>

        <div className="mt-2.5 space-y-2 text-[11px]">
          {/* Tier 1 */}
          <div className="flex items-start justify-between gap-3 p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0" />
              <div>
                <p className="font-semibold text-slate-200">Tier 1: Client & UI</p>
                <p className="text-[10px] text-slate-400">React, Views, UI components</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-950 px-1.5 py-0.5 rounded border border-sky-800">src/components, app/</span>
          </div>

          {/* Tier 2 */}
          <div className="flex items-start justify-between gap-3 p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0" />
              <div>
                <p className="font-semibold text-slate-200">Tier 2: API Endpoints</p>
                <p className="text-[10px] text-slate-400">HTTP Routes, Controllers</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-blue-400 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800">src/api, routes/</span>
          </div>

          {/* Tier 3 */}
          <div className="flex items-start justify-between gap-3 p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0" />
              <div>
                <p className="font-semibold text-slate-200">Tier 3: Core Services</p>
                <p className="text-[10px] text-slate-400">Domain Logic, Business Handlers</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-800">src/services, lib/</span>
          </div>

          {/* Tier 4 */}
          <div className="flex items-start justify-between gap-3 p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
              <div>
                <p className="font-semibold text-slate-200">Tier 4: Database & Models</p>
                <p className="text-[10px] text-slate-400">Schemas, ORM Entities, SQL</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800">src/models, db/</span>
          </div>

          {/* Tests & Impact */}
          <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> tests/ (Spec Suites)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Blast Radius Casualties
            </span>
          </div>
        </div>
      </div>

      {/* Hover Info Tooltip */}
      {hoveredNode && (
        <div className="absolute bottom-6 left-6 z-30 p-2.5 rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700 text-xs shadow-xl font-sans animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="font-bold text-slate-100">{hoveredNode.name}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 uppercase font-mono font-semibold">
              {hoveredNode.layer}
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400">{hoveredNode.path}</p>
        </div>
      )}
    </div>
  );
};
