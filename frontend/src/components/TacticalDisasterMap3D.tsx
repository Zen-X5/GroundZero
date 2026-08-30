import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Drone, Survivor, NetworkTopology, BuildingInspection } from '../../lib/types';

interface TacticalDisasterMap3DProps {
  drones: Drone[];
  simDrones: { x: number; y: number; heading: number }[];
  survivors: Survivor[];
  topology: NetworkTopology | null;
  buildings: BuildingInspection[];
  onSelectSurvivor: (survivor: Survivor) => void;
}

const PATROL_STYLES = [
  { id: 'sim-falcon', callsign: 'FALCON-1', color: 0x00f0ff },
  { id: 'sim-hawk',   callsign: 'HAWK-2',   color: 0x10b981 },
  { id: 'sim-eagle',  callsign: 'EAGLE-3',  color: 0xa78bfa },
];

export const TacticalDisasterMap3D: React.FC<TacticalDisasterMap3DProps> = ({
  drones, simDrones, survivors, topology, buildings, onSelectSurvivor,
}) => {
  const containerRef      = useRef<HTMLDivElement>(null);
  const labelsContainerRef = useRef<HTMLDivElement>(null);

  // Live prop refs — synced every render so the animation loop always sees fresh data
  const dronesRef    = useRef(drones);
  const simDronesRef = useRef(simDrones);
  const survivorsRef = useRef(survivors);
  const topologyRef  = useRef(topology);
  dronesRef.current    = drones;
  simDronesRef.current = simDrones;
  survivorsRef.current = survivors;
  topologyRef.current  = topology;

  const sceneRef    = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef   = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const labelCacheRef   = useRef<Map<string, HTMLDivElement>>(new Map());
  const droneMeshesRef  = useRef<Map<string, THREE.Group>>(new Map());
  const radarConesRef   = useRef<Map<string, THREE.Mesh>>(new Map());
  const pathLinesRef    = useRef<Map<string, { points: THREE.Vector3[]; line: THREE.Line }>>(new Map());
  const netLineGroupRef = useRef<THREE.Group | null>(null);
  const pulsesRef       = useRef<{ mesh: THREE.Mesh; a: THREE.Vector3; b: THREE.Vector3; t: number; spd: number }[]>([]);
  const beaconsRef      = useRef<Map<string, { group: THREE.Group; rings: THREE.Mesh[] }>>(new Map());
  const floodMeshRef    = useRef<THREE.Mesh | null>(null);

  const svgX = (sx: number) => (sx || 0) / 5;
  const svgZ = (sy: number) => 100 - (sy || 0) / 5;

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const W = container.clientWidth;
    const H = container.clientHeight || 520;

    // ── Scene ────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040810);
    scene.fog = new THREE.Fog(0x040810, 120, 400);
    sceneRef.current = scene;

    // ── Camera ───────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.5, 800);
    camera.position.set(60, 80, 160);
    cameraRef.current = camera;

    // ── Renderer ─────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Orbit Controls ───────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.06;
    controls.maxPolarAngle  = Math.PI / 2.1;
    controls.minDistance    = 15;
    controls.maxDistance    = 300;
    controls.target.set(100, 0, 50);
    controls.update();
    controlsRef.current = controls;

    // ── Lighting ─────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x0e1a2e, 3));

    const sun = new THREE.DirectionalLight(0xffe8c0, 1.2);
    sun.position.set(80, 120, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far  = 350;
    sun.shadow.camera.left   = -130;
    sun.shadow.camera.right  = 130;
    sun.shadow.camera.top    = 90;
    sun.shadow.camera.bottom = -90;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x2244aa, 0.6);
    fill.position.set(-40, 40, -30);
    scene.add(fill);

    // Cyan sector rim light
    const rimLight = new THREE.PointLight(0x00f0ff, 80, 200);
    rimLight.position.set(5, 30, 50);
    scene.add(rimLight);

    // Amber urban collapse rim
    const urb = new THREE.PointLight(0xffb800, 60, 180);
    urb.position.set(170, 25, 50);
    scene.add(urb);

    // ── Helper: Ground material with procedural checkerboard lines ────────
    const makeCybGround = (w: number, d: number, baseCol: number, lineCol: number, lineStep = 10, opacity = 1) => {
      // Draw canvas texture
      const res = 512;
      const cvs = document.createElement('canvas');
      cvs.width = res; cvs.height = res;
      const ctx = cvs.getContext('2d')!;
      ctx.fillStyle = '#' + baseCol.toString(16).padStart(6, '0');
      ctx.fillRect(0, 0, res, res);
      const step = res / (w / lineStep);
      ctx.strokeStyle = '#' + lineCol.toString(16).padStart(6, '0');
      ctx.lineWidth = 1;
      for (let i = 0; i <= res; i += step) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, res); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(res, i); ctx.stroke();
      }
      const tex = new THREE.CanvasTexture(cvs);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.1, transparent: opacity < 1, opacity });
      const geo = new THREE.PlaneGeometry(w, d);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.receiveShadow = true;
      return mesh;
    };

    // ── Ground Layer ─────────────────────────────────────────────────────
    const ground = makeCybGround(200, 100, 0x080d16, 0x0d1a2c, 10);
    ground.position.set(100, -0.02, 50);
    scene.add(ground);

    // ── Sector divider lines ──────────────────────────────────────────────
    const divMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.22 });
    const mkLine = (x1: number, z1: number, x2: number, z2: number) => {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x1, 0.02, z1), new THREE.Vector3(x2, 0.02, z2)]);
      scene.add(new THREE.Line(g, divMat));
    };
    mkLine(70, 0, 70, 100);
    mkLine(130, 0, 130, 100);

    // Border glow
    const borderPts = [
      new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(200, 0.05, 0),
      new THREE.Vector3(200, 0.05, 0), new THREE.Vector3(200, 0.05, 100),
      new THREE.Vector3(200, 0.05, 100), new THREE.Vector3(0, 0.05, 100),
      new THREE.Vector3(0, 0.05, 100), new THREE.Vector3(0, 0.05, 0),
    ];
    const borderLine = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(borderPts),
      new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.5 }),
    );
    scene.add(borderLine);

    // ── Sector A — Flood Lake ─────────────────────────────────────────────
    // Animated shimmer water plane
    const waterGeo = new THREE.PlaneGeometry(70, 100, 1, 1);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x004488,
      metalness: 0.5,
      roughness: 0.1,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      emissive: 0x002255,
      emissiveIntensity: 0.4,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(35, 0.05, 50);
    waterMesh.receiveShadow = true;
    scene.add(waterMesh);
    floodMeshRef.current = waterMesh;

    // Water edge glow lines
    const waterEdgePts = [
      new THREE.Vector3(0, 0.07, 0), new THREE.Vector3(0, 0.07, 100),
      new THREE.Vector3(70, 0.07, 0), new THREE.Vector3(70, 0.07, 100),
    ];
    const waterEdgeG = new THREE.BufferGeometry().setFromPoints(waterEdgePts);
    scene.add(new THREE.LineSegments(waterEdgeG, new THREE.LineBasicMaterial({ color: 0x0088ff, transparent: true, opacity: 0.6 })));

    // Floating debris in flood zone
    const debrisMat = new THREE.MeshStandardMaterial({ color: 0x3d2a14, roughness: 0.9 });
    [[18, 25], [12, 62], [48, 18], [32, 80], [55, 44]].forEach(([x, z]) => {
      const g = new THREE.BoxGeometry(1.5 + Math.random(), 0.2, 1 + Math.random());
      const m = new THREE.Mesh(g, debrisMat);
      m.position.set(x, 0.18 + Math.random() * 0.1, z);
      m.rotation.y = Math.random() * Math.PI;
      scene.add(m);
    });

    // Trees in sector A
    const treeGroup = new THREE.Group();
    [[22, 35], [14, 68], [40, 22], [60, 78], [30, 52]].forEach(([tx, tz]) => {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.25, 2.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x3d2b1e, roughness: 1 }),
      );
      trunk.position.set(tx, 1.25, tz);
      trunk.castShadow = true;
      treeGroup.add(trunk);
      const foliage = new THREE.Mesh(
        new THREE.SphereGeometry(1.4, 7, 6),
        new THREE.MeshStandardMaterial({ color: 0x1a4d22, roughness: 0.9, emissive: 0x0a2210, emissiveIntensity: 0.3 }),
      );
      foliage.position.set(tx, 3.7, tz);
      foliage.castShadow = true;
      treeGroup.add(foliage);
    });
    scene.add(treeGroup);

    // ── Sector B — Elevated Highway ────────────────────────────────────────
    // Road surface with markings
    const roadGeo = new THREE.BoxGeometry(60, 0.7, 14);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1a1e26, roughness: 0.95, metalness: 0 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.set(100, 4, 50);
    road.castShadow = true;
    road.receiveShadow = true;
    scene.add(road);

    // Dashed centre lines
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    for (let xo = -28; xo <= 28; xo += 5) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.05, 0.22), dashMat);
      dash.position.set(100 + xo, 4.38, 50);
      scene.add(dash);
    }

    // Crash van on highway
    const vanBody = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 1.5), new THREE.MeshStandardMaterial({ color: 0x991111, roughness: 0.7 }));
    vanBody.position.set(96, 5.15, 50.4);
    vanBody.rotation.y = 0.25;
    vanBody.castShadow = true;
    scene.add(vanBody);

    // Concrete pillars
    const pillarMat2 = new THREE.MeshStandardMaterial({ color: 0x1f2535, roughness: 0.8, metalness: 0.15 });
    [78, 100, 122].forEach(px => {
      [44, 56].forEach(pz => {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 4.2, 8), pillarMat2);
        pillar.position.set(px, 2.1, pz);
        pillar.castShadow = true;
        scene.add(pillar);
      });
    });

    // ── Sector C — Urban Collapse Zone ─────────────────────────────────────
    // Rubble slab
    const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x2a2832, roughness: 1, metalness: 0.05 });
    [[174, 44, 0], [170, 48, 0.3], [178, 41, -0.2], [172, 42, 0.15]].forEach(([x, z, r]) => {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(8 + Math.random() * 4, 0.4 + Math.random() * 0.6, 5 + Math.random() * 3), rubbleMat);
      slab.position.set(x, 0.25, z);
      slab.rotation.y = r;
      slab.receiveShadow = true;
      scene.add(slab);
    });

    // Scattered concrete chunks near buildings
    [[140, 16], [144, 24], [163, 40], [158, 28], [152, 88], [162, 82]].forEach(([x, z]) => {
      const chunk = new THREE.Mesh(
        new THREE.BoxGeometry(1 + Math.random() * 2, 0.3 + Math.random() * 0.8, 0.8 + Math.random() * 1.5),
        rubbleMat,
      );
      chunk.position.set(x, 0.2, z);
      chunk.rotation.y = Math.random() * Math.PI;
      chunk.castShadow = true;
      scene.add(chunk);
    });

    // Helper: build realistic multi-floor building
    const mkBuilding = (cx: number, cz: number, bw: number, bd: number, floors: number, fh: number, wallCol: number, glassCol: number, dmg: 'LOW' | 'MODERATE' | 'SEVERE_COLLAPSE') => {
      const grp = new THREE.Group();
      const wallMat  = new THREE.MeshStandardMaterial({ color: wallCol, roughness: 0.85, metalness: 0.05 });
      const glassMat = new THREE.MeshStandardMaterial({ color: glassCol, roughness: 0.05, metalness: 0.8, transparent: true, opacity: 0.6, emissive: glassCol, emissiveIntensity: 0.15 });
      const edgeCol  = dmg === 'SEVERE_COLLAPSE' ? 0xff2a55 : dmg === 'MODERATE' ? 0xffb800 : glassCol;

      for (let f = 0; f < floors; f++) {
        const yBase = f * fh;
        // Structural wall slab
        const wallGeo = new THREE.BoxGeometry(bw, fh - 0.12, bd);
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.y = yBase + fh / 2;
        if (dmg === 'SEVERE_COLLAPSE' && f > 0) {
          wall.rotation.z = 0.07 * f;
          wall.rotation.x = 0.04 * f;
          wall.position.x += 0.4 * f;
        } else if (dmg === 'MODERATE' && f > 1) {
          wall.rotation.z = 0.025;
          wall.position.x += 0.15;
        }
        wall.castShadow = true;
        wall.receiveShadow = true;
        grp.add(wall);

        // Wireframe edge lines
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(wallGeo),
          new THREE.LineBasicMaterial({ color: edgeCol, transparent: true, opacity: 0.4 }),
        );
        edges.position.copy(wall.position);
        edges.rotation.copy(wall.rotation);
        grp.add(edges);

        // Window strip on front/back faces
        if (f > 0) {
          const winW = bw * 0.75;
          const winH = fh * 0.42;
          const winGeo = new THREE.PlaneGeometry(winW, winH);
          [-1, 1].forEach(side => {
            const win = new THREE.Mesh(winGeo, glassMat);
            win.position.set(wall.position.x, yBase + fh * 0.5, side * (bd / 2 + 0.01));
            if (side === -1) win.rotation.y = Math.PI;
            grp.add(win);
          });
          // Side windows
          const sWinGeo = new THREE.PlaneGeometry(bd * 0.65, winH);
          [-1, 1].forEach(side => {
            const win = new THREE.Mesh(sWinGeo, glassMat);
            win.position.set(wall.position.x + side * (bw / 2 + 0.01), yBase + fh * 0.5, 0);
            win.rotation.y = side * Math.PI / 2;
            grp.add(win);
          });
        }
      }
      // Rooftop parapet
      const parapet = new THREE.Mesh(
        new THREE.BoxGeometry(bw + 0.4, 0.4, bd + 0.4),
        new THREE.MeshStandardMaterial({ color: 0x1a1e26, roughness: 0.9 }),
      );
      parapet.position.y = floors * fh + 0.2;
      parapet.castShadow = true;
      grp.add(parapet);

      grp.position.set(cx, 0, cz);
      return grp;
    };

    // Apartments — Sector C (cyan damage)
    const apt = mkBuilding(155, 32, 14, 10, 3, 3.5, 0x1c2030, 0x00f0ff, 'MODERATE');
    scene.add(apt);

    // Commercial tower — taller, glass heavy
    const comm = mkBuilding(148, 75, 12, 9, 5, 3.2, 0x18202e, 0x00aaff, 'LOW');
    scene.add(comm);

    // Red Clinic
    const clinic = mkBuilding(180, 88, 8, 7, 2, 3.0, 0x1e1220, 0xff2a55, 'LOW');
    scene.add(clinic);

    // Bank — amber, heavily collapsed
    const bank = mkBuilding(142, 22, 10, 8, 3, 3.2, 0x201a10, 0xffb800, 'SEVERE_COLLAPSE');
    scene.add(bank);

    // ── Ground-Base Gateway Marker ────────────────────────────────────────
    const gBase = new THREE.Group();
    const baseRing = new THREE.Mesh(
      new THREE.RingGeometry(1.8, 2.2, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
    );
    baseRing.rotation.x = -Math.PI / 2;
    baseRing.position.set(2.4, 0.1, 50);
    gBase.add(baseRing);
    const baseBeacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.8, 8),
      new THREE.MeshBasicMaterial({ color: 0x00ff88 }),
    );
    baseBeacon.position.set(2.4, 0.4, 50);
    gBase.add(baseBeacon);
    scene.add(gBase);

    // ── Network Lines Group ────────────────────────────────────────────────
    const netGrp = new THREE.Group();
    scene.add(netGrp);
    netLineGroupRef.current = netGrp;

    // ── Drone factory ─────────────────────────────────────────────────────
    const getOrCreateDrone = (callsign: string, color: number) => {
      if (droneMeshesRef.current.has(callsign)) return droneMeshesRef.current.get(callsign)!;

      const grp = new THREE.Group();

      // Fuselage (flattened box, more realistic than sphere)
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1e28, roughness: 0.4, metalness: 0.6 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.28, 1.0), bodyMat);
      body.castShadow = true;
      grp.add(body);

      // Accent stripe
      const accentMat = new THREE.MeshBasicMaterial({ color });
      const accent = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.06, 0.18), accentMat);
      accent.position.z = 0.3;
      grp.add(accent);

      // 4 arms
      const armMat = new THREE.MeshStandardMaterial({ color: 0x252a38, roughness: 0.6, metalness: 0.4 });
      [{ rx: 0, rz: 0.7 }, { rx: 0.7, rz: 0 }, { rx: 0, rz: -0.7 }, { rx: -0.7, rz: 0 }].forEach(({ rx, rz }) => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.12), armMat);
        arm.position.set(rx, 0, rz);
        arm.rotation.y = Math.atan2(rz, rx);
        arm.castShadow = true;
        grp.add(arm);
      });

      // Motor nacelles + spinning disc propellers
      const nacMat = new THREE.MeshStandardMaterial({ color: 0x111522, roughness: 0.5, metalness: 0.7 });
      const propMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
      const propPositions = [
        [-0.9, 0.9], [0.9, 0.9], [0.9, -0.9], [-0.9, -0.9],
      ];
      const propsGroup = new THREE.Group();
      propsGroup.name = 'props';
      propPositions.forEach(([px, pz]) => {
        const nac = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.14, 8), nacMat);
        nac.position.set(px, 0.12, pz);
        grp.add(nac);
        const disc = new THREE.Mesh(new THREE.CircleGeometry(0.62, 12), propMat);
        disc.rotation.x = -Math.PI / 2;
        disc.position.set(px, 0.2, pz);
        propsGroup.add(disc);
      });
      propsGroup.name = 'props';
      grp.add(propsGroup);

      // Landing gear (4 thin legs)
      const legMat = new THREE.MeshStandardMaterial({ color: 0x1a2030 });
      [[-0.35, -0.35], [0.35, -0.35], [0.35, 0.35], [-0.35, 0.35]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 4), legMat);
        leg.position.set(lx, -0.32, lz);
        grp.add(leg);
      });

      // Cyan glow circle (mimics the 2D map circle baseline)
      const glowRing = new THREE.Mesh(
        new THREE.RingGeometry(1.0, 1.3, 24),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
      );
      glowRing.rotation.x = -Math.PI / 2;
      glowRing.position.y = -0.5;
      glowRing.name = 'glowRing';
      grp.add(glowRing);

      // Radar scan cone below
      const coneMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false });
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 9, 12, 18, 1, true), coneMat);
      cone.position.y = -6;
      grp.add(cone);
      radarConesRef.current.set(callsign, cone);

      // Heading indicator (small arrow)
      const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, 0.45, 4),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
      );
      arrow.rotation.x = Math.PI / 2;
      arrow.position.set(0, 0, -0.85);
      grp.add(arrow);

      scene.add(grp);
      droneMeshesRef.current.set(callsign, grp);
      return grp;
    };

    // ── Animation loop ─────────────────────────────────────────────────────
    let rafId = 0;
    let frameCount = 0;
    const clock = new THREE.Clock();
    const projV = new THREE.Vector3();

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      frameCount++;
      const dt   = clock.getDelta();
      const time = clock.getElapsedTime();

      // Flood shimmer
      if (floodMeshRef.current) {
        (floodMeshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.25 + Math.sin(time * 1.8) * 0.12;
      }

      const curSim  = simDronesRef.current  || [];
      const curLive = dronesRef.current     || [];
      const curSurv = survivorsRef.current  || [];
      const curTopo = topologyRef.current;

      const active = new Set<string>();

      // ─ Sim drones ───────────────────────────────────────────────────────
      curSim.forEach((pos, i) => {
        const cfg = PATROL_STYLES[i];
        if (!cfg || !pos) return;
        active.add(cfg.callsign);

        const dx = svgX(pos.x), dz = svgZ(pos.y), dy = 10;
        const mesh = getOrCreateDrone(cfg.callsign, cfg.color);
        mesh.position.set(dx, dy, dz);
        mesh.rotation.y = -(pos.heading - 90) * Math.PI / 180;

        // trail
        let trail = pathLinesRef.current.get(cfg.callsign);
        if (!trail) {
          const geom = new THREE.BufferGeometry();
          const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.4 }));
          scene.add(line);
          trail = { points: [], line };
          pathLinesRef.current.set(cfg.callsign, trail);
        }
        const np = new THREE.Vector3(dx, dy, dz);
        if (!trail.points.length || trail.points[trail.points.length - 1].distanceTo(np) > 1.4) {
          trail.points.push(np);
          if (trail.points.length > 60) trail.points.shift();
          trail.line.geometry.setFromPoints(trail.points);
        }
      });

      // ─ Live drones ──────────────────────────────────────────────────────
      curLive.forEach(d => {
        if (!d?.callsign) return;
        active.add(d.callsign);
        const dx = d.position?.x ?? 50, dz = d.position?.y ?? 50, dy = d.position?.z ?? 8;
        const col = d.status === 'OFFLINE' ? 0xef4444 : 0x00ff88;
        const mesh = getOrCreateDrone(d.callsign, col);
        mesh.position.set(dx, dy, dz);
        mesh.rotation.y = -(d.heading ?? 0) * Math.PI / 180;

        const cone = radarConesRef.current.get(d.callsign);
        if (cone) cone.visible = d.status !== 'OFFLINE';

        let trail = pathLinesRef.current.get(d.callsign);
        if (!trail) {
          const geom = new THREE.BufferGeometry();
          const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.5 }));
          scene.add(line);
          trail = { points: [], line };
          pathLinesRef.current.set(d.callsign, trail);
        }
        const np = new THREE.Vector3(dx, dy, dz);
        if (!trail.points.length || trail.points[trail.points.length - 1].distanceTo(np) > 0.8) {
          trail.points.push(np);
          if (trail.points.length > 80) trail.points.shift();
          trail.line.geometry.setFromPoints(trail.points);
        }
      });

      // ─ Cleanup stale drones ─────────────────────────────────────────────
      droneMeshesRef.current.forEach((m, name) => {
        if (active.has(name)) return;
        scene.remove(m);
        droneMeshesRef.current.delete(name);
        const t = pathLinesRef.current.get(name);
        if (t) { scene.remove(t.line); pathLinesRef.current.delete(name); }
      });

      // ─ Drone animations ──────────────────────────────────────────────────
      droneMeshesRef.current.forEach((g, id) => {
        const props = g.getObjectByName('props');
        if (props) props.children.forEach(c => { c.rotation.z += 0.35; });
        const cone = radarConesRef.current.get(id);
        if (cone) { cone.scale.setScalar(1 + Math.sin(time * 3.5) * 0.04); }
        const glow = g.getObjectByName('glowRing') as THREE.Mesh | undefined;
        if (glow) (glow.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(time * 4 + g.position.x) * 0.2;
        // slight hover bob
        g.position.y += Math.sin(time * 2.2 + g.position.x * 0.1) * 0.003;
      });

      // ─ Survivors ─────────────────────────────────────────────────────────
      const activeSurv = new Set<string>();
      curSurv.forEach(s => {
        if (!s) return;
        activeSurv.add(s.code);
        const col = s.riskScore >= 80 ? 0xff2a55 : 0xffb800;
        let b = beaconsRef.current.get(s.code);
        if (!b) {
          const grp = new THREE.Group();
          grp.position.set(s.globalPosition?.x ?? 50, 0.2, s.globalPosition?.y ?? 50);
          grp.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 10), new THREE.MeshBasicMaterial({ color: col })), {}));
          const rings: THREE.Mesh[] = [];
          for (let r = 0; r < 2; r++) {
            const rg = new THREE.RingGeometry(0.7, 1.1, 24);
            rg.rotateX(-Math.PI / 2);
            const rm = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
            grp.add(rm); rings.push(rm);
          }
          scene.add(grp);
          b = { group: grp, rings };
          beaconsRef.current.set(s.code, b);
        } else {
          b.group.position.set(s.globalPosition?.x ?? 50, 0.2, s.globalPosition?.y ?? 50);
        }
      });
      beaconsRef.current.forEach((b, code) => {
        if (!activeSurv.has(code)) { scene.remove(b.group); beaconsRef.current.delete(code); }
      });
      beaconsRef.current.forEach(b => b.rings.forEach((r, i) => {
        const t = (time + i * 0.8) % 2;
        r.scale.setScalar(1 + t * 4);
        (r.material as THREE.MeshBasicMaterial).opacity = (1 - t / 2) * 0.75;
      }));

      // ─ MANET links (throttled to every 4 frames) ──────────────────────────
      if (frameCount % 4 === 0 && netLineGroupRef.current) {
        const netGrp = netLineGroupRef.current;
        netGrp.clear();
        pulsesRef.current.forEach(p => scene.remove(p.mesh));
        pulsesRef.current = [];

        const addLink = (p1: THREE.Vector3, p2: THREE.Vector3, col: number, opacity: number) => {
          const lg = new THREE.BufferGeometry().setFromPoints([p1, p2]);
          netGrp.add(new THREE.Line(lg, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity })));
          const pm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 5, 5), new THREE.MeshBasicMaterial({ color: col }));
          scene.add(pm);
          pulsesRef.current.push({ mesh: pm, a: p1.clone(), b: p2.clone(), t: Math.random(), spd: 0.5 });
        };

        const hasLive = curLive.length > 0;
        if (hasLive && curTopo?.links) {
          curTopo.links.forEach(link => {
            if (!link) return;
            const sc = typeof link.sourceDrone === 'string' ? link.sourceDrone : link.sourceDrone?.callsign;
            const tc = typeof link.targetDrone === 'string' ? link.targetDrone : link.targetDrone?.callsign;
            const sm = droneMeshesRef.current.get(sc);
            const tm = droneMeshesRef.current.get(tc);
            if (!sm || !tm) return;
            const col = link.linkStatus === 'CONNECTED' ? 0x00ff88 : link.linkStatus === 'DEGRADED' ? 0xffb800 : 0x4b5563;
            addLink(sm.position, tm.position, col, link.linkStatus === 'DISCONNECTED' ? 0.12 : 0.65);
          });
        } else {
          const d0 = droneMeshesRef.current.get('FALCON-1');
          const d1 = droneMeshesRef.current.get('HAWK-2');
          const d2 = droneMeshesRef.current.get('EAGLE-3');
          const base = new THREE.Vector3(2.4, 0.2, 50);
          if (d0 && d1) addLink(d0.position, d1.position, 0x00f0ff, 0.55);
          if (d1 && d2) addLink(d1.position, d2.position, 0x00f0ff, 0.55);
          if (d0) addLink(d0.position, base, 0x00ff88, 0.7);
        }
      }

      // Animate pulses
      pulsesRef.current.forEach(p => {
        p.t += p.spd * dt;
        if (p.t > 1) p.t = 0;
        p.mesh.position.lerpVectors(p.a, p.b, p.t);
        p.mesh.position.y += Math.sin(time * 8 + p.t * 5) * 0.15;
      });

      // ─ Floating HTML labels via direct DOM projection ─────────────────
      const labels = labelsContainerRef.current;
      if (labels) {
        const activeLIds = new Set<string>();
        droneMeshesRef.current.forEach((g, cs) => {
          activeLIds.add(cs);
          projV.copy(g.position).setY(g.position.y + 2.8).project(camera);
          const lx = (projV.x * 0.5 + 0.5) * W;
          const ly = (-projV.y * 0.5 + 0.5) * H;
          const behind = projV.z > 1;

          let el = labelCacheRef.current.get(cs);
          if (!el) {
            el = document.createElement('div');
            el.style.cssText = `position:absolute;transform:translate(-50%,-100%);pointer-events:none;padding:3px 7px;border-radius:4px;font-size:9px;font-family:monospace;font-weight:bold;background:rgba(6,10,20,0.92);border:1px solid;white-space:nowrap;`;
            labels.appendChild(el);
            labelCacheRef.current.set(cs, el);
          }
          const isSim = PATROL_STYLES.some(p => p.callsign === cs);
          const colHex = isSim
            ? '#' + ((PATROL_STYLES.find(p => p.callsign === cs)?.color ?? 0x00f0ff).toString(16).padStart(6, '0'))
            : (curLive.find(d => d.callsign === cs)?.status === 'OFFLINE' ? '#ef4444' : '#00ff88');

          el.style.borderColor = colHex;
          el.style.color = colHex;
          el.style.display = behind ? 'none' : 'block';
          el.style.left = `${lx}px`;
          el.style.top  = `${ly}px`;

          if (isSim) {
            el.innerHTML = `<span>${cs}</span><span style="display:block;font-size:7px;color:#8a99ad;margin-top:1px;">SIM • ${PATROL_STYLES.find(p => p.callsign === cs)?.id.replace('sim-', '').toUpperCase()}</span>`;
          } else {
            const d = curLive.find(x => x.callsign === cs);
            el.innerHTML = `<span>${cs}</span><span style="display:block;font-size:7px;color:#8a99ad;margin-top:1px;">Z:${(d?.position?.z ?? 8).toFixed(0)}m • ${d?.status ?? 'SCANNING'}</span>`;
          }
        });
        labelCacheRef.current.forEach((el, k) => {
          if (!activeLIds.has(k)) { el.remove(); labelCacheRef.current.delete(k); }
        });
      }

      controls.update();
      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(tick);

    const onResize = () => {
      if (!container.clientWidth) return;
      const nw = container.clientWidth, nh = container.clientHeight || 520;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.remove();
      if (labelsContainerRef.current) labelsContainerRef.current.innerHTML = '';
      labelCacheRef.current.clear();
      scene.clear();
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 420, position: 'relative', flex: 1, borderRadius: 8, overflow: 'hidden' }}>
      <div ref={labelsContainerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, overflow: 'hidden' }} />
    </div>
  );
};
