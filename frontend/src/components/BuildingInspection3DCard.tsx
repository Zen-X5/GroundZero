import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import { BuildingInspection, AccessibleOpening } from '../../lib/types';
import { Activity, Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface Building3DProps {
  building: BuildingInspection | null;
}

export const BuildingInspection3DCard: React.FC<Building3DProps> = ({ building }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const droneRef = useRef<THREE.Group | null>(null);
  const laserRef = useRef<THREE.Line | null>(null);
  const buildingGroupRef = useRef<THREE.Group | null>(null);

  const [scanProgress, setScanProgress] = useState(0);

  // Parse building characteristics
  const name = building ? building.name.replace(/_/g, ' ') : 'Select a structural unit';
  const floors = building?.floors || 3;
  const height = building?.heightMeters || 10;
  const damage = building?.structuralDamage || 'LOW';
  const status = building?.inspectionStatus || 'UNINSPECTED';
  const survivorProb = building ? (building.estimatedOccupancyProbability * 100).toFixed(0) : '0';

  // Completion percentage mapping
  const compPercent = status === 'COMPLETED' ? 100 : status === 'IN_PROGRESS' ? 65 : 0;

  // Animating scanProgress meter on card load/change
  useEffect(() => {
    setScanProgress(0);
    const obj = { val: 0 };
    const tween = gsap.to(obj, {
      val: compPercent,
      duration: 1.5,
      ease: 'power2.out',
      onUpdate: () => setScanProgress(Math.floor(obj.val)),
    });
    return () => {
      tween.kill();
    };
  }, [building, compPercent]);

  // Set up Three.js Scene
  useEffect(() => {
    if (!containerRef.current || !building) return;

    // 1. Setup Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0f16);
    scene.fog = new THREE.FogExp2(0x0c0f16, 0.04);
    sceneRef.current = scene;

    // 2. Setup Camera
    const width = containerRef.current.clientWidth;
    const height3D = containerRef.current.clientHeight || 280;
    const camera = new THREE.PerspectiveCamera(40, width / height3D, 0.1, 100);
    camera.position.set(16, 16, 16); // starting camera view
    cameraRef.current = camera;

    // 3. Setup Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height3D);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Setup Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 6;
    controls.maxDistance = 35;
    // Set target roughly centered at the building height
    controls.target.set(0, height / 2, 0);
    controls.update();
    controlsRef.current = controls;

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0x131a26, 1.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f0ff, 1.5);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(20, 20, 0x00f0ff, 0x141b2b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // 6. Build the Building Stack Group
    const buildingGroup = new THREE.Group();
    buildingGroupRef.current = buildingGroup;
    
    const floorHeight = height / floors;
    const boxW = 5;
    const boxD = 4;

    for (let f = 0; f < floors; f++) {
      // Floor slab box geometry
      const floorGeom = new THREE.BoxGeometry(boxW, floorHeight - 0.08, boxD);
      const floorMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.04 + (f * 0.015),
        side: THREE.DoubleSide,
      });
      const floorMesh = new THREE.Mesh(floorGeom, floorMat);
      floorMesh.position.y = (f * floorHeight) + (floorHeight / 2);

      // Severe structural collapse tilts the slabs
      if (damage === 'SEVERE_COLLAPSE' && f > 0) {
        floorMesh.rotation.z = 0.09 * f;
        floorMesh.rotation.x = 0.05 * f;
        floorMesh.position.x += 0.4 * f;
      } else if (damage === 'MODERATE' && f > 1) {
        floorMesh.rotation.z = 0.035;
        floorMesh.position.x += 0.15;
      }

      buildingGroup.add(floorMesh);

      // Floor cybernetic wireframe outline edges
      const edgeGeom = new THREE.EdgesGeometry(floorGeom);
      const edgeMat = new THREE.LineBasicMaterial({
        color: damage === 'SEVERE_COLLAPSE' ? 0xff2a55 : damage === 'MODERATE' ? 0xffb800 : 0x00f0ff,
        opacity: 0.45,
        transparent: true,
      });
      const edgeLines = new THREE.LineSegments(edgeGeom, edgeMat);
      edgeLines.position.copy(floorMesh.position);
      edgeLines.rotation.copy(floorMesh.rotation);
      buildingGroup.add(edgeLines);
    }
    scene.add(buildingGroup);

    // 7. Place Accessible Openings (Windows / Voids)
    const openingsGroup = new THREE.Group();
    const ops = building.accessibleOpenings || [];
    
    ops.forEach((op, index) => {
      // Position openings around building perimeter
      const fl = op.floorLevel || 1;
      // Get the corresponding floor mesh rotation and offset if deformed
      const fOffset = fl - 1;
      let yPos = (fOffset * floorHeight) + (floorHeight / 2);
      let xPos = 0;
      let zPos = 0;
      let rotY = 0;
      let xSkew = 0;
      let zSkew = 0;

      if (damage === 'SEVERE_COLLAPSE' && fOffset > 0) {
        xSkew = 0.4 * fOffset;
        rotY = 0.09 * fOffset;
      }

      // Distribute along walls: North, East, South, West
      const wallIndex = index % 4;
      if (wallIndex === 0) { // South wall
        xPos = xSkew;
        zPos = boxD / 2;
        rotY = 0;
      } else if (wallIndex === 1) { // North wall
        xPos = xSkew;
        zPos = -boxD / 2;
        rotY = Math.PI;
      } else if (wallIndex === 2) { // East wall
        xPos = boxW / 2 + xSkew;
        zPos = 0;
        rotY = Math.PI / 2;
      } else { // West wall
        xPos = -boxW / 2 + xSkew;
        zPos = 0;
        rotY = -Math.PI / 2;
      }

      // Create window frame mesh
      const opGeom = new THREE.PlaneGeometry(0.8, 0.5);
      
      // Color-coding based on safety/occupant status
      let opCol = 0x00ff88; // green: clear
      let doPulse = false;

      if (op.isObstructed) {
        opCol = 0xff2a55; // red: obstructed
      } else if (op.detectedOccupants > 0) {
        opCol = 0xffb800; // amber/orange: occupants detected
        doPulse = true;
      }

      const opMat = new THREE.MeshBasicMaterial({
        color: opCol,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });

      const opMesh = new THREE.Mesh(opGeom, opMat);
      opMesh.position.set(xPos, yPos, zPos);
      opMesh.rotation.y = rotY;
      
      // Store reference metadata for scanning animations
      opMesh.userData = { id: op.openingId || `op_${index}`, pulse: doPulse, color: opCol };
      
      openingsGroup.add(opMesh);

      // Add a small light/sphere to make it look volumetric
      const lightGeom = new THREE.SphereGeometry(0.12, 6, 6);
      const lightMat = new THREE.MeshBasicMaterial({ color: opCol });
      const lightMesh = new THREE.Mesh(lightGeom, lightMat);
      // Position slightly pushed out from wall
      const offsetFactor = 0.08;
      lightMesh.position.set(
        xPos + (wallIndex === 2 ? offsetFactor : wallIndex === 3 ? -offsetFactor : 0),
        yPos,
        zPos + (wallIndex === 0 ? offsetFactor : wallIndex === 1 ? -offsetFactor : 0)
      );
      openingsGroup.add(lightMesh);
    });
    scene.add(openingsGroup);

    // 8. Inspection Flight Path Ring (translucent orbital ring)
    const ringPathGeom = new THREE.RingGeometry(5.2, 5.25, 64);
    ringPathGeom.rotateX(Math.PI / 2);
    const ringPathMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    });
    const orbitRing = new THREE.Mesh(ringPathGeom, ringPathMat);
    orbitRing.position.y = height / 2;
    scene.add(orbitRing);

    // 9. Inspection Drone model
    const droneGroup = new THREE.Group();
    const droneBodyGeom = new THREE.SphereGeometry(0.32, 6, 6);
    const droneBodyMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const droneBody = new THREE.Mesh(droneBodyGeom, droneBodyMat);
    droneGroup.add(droneBody);

    const armGeom = new THREE.BoxGeometry(1.2, 0.05, 0.05);
    const armMat = new THREE.MeshBasicMaterial({ color: 0x374151 });
    const arm = new THREE.Mesh(armGeom, armMat);
    arm.rotation.y = Math.PI / 4;
    droneGroup.add(arm);

    // Scanning laser pointer lines
    const laserGeom = new THREE.BufferGeometry();
    const laserMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7 });
    const laserLine = new THREE.Line(laserGeom, laserMat);
    scene.add(laserLine);
    laserRef.current = laserLine;

    droneRef.current = droneGroup;
    scene.add(droneGroup);

    // 10. GSAP Intro Camera Animation
    // Spins the building scene and zooms in the camera smoothly on mount
    buildingGroup.rotation.y = -Math.PI;
    gsap.to(buildingGroup.rotation, {
      y: 0,
      duration: 1.8,
      ease: 'power2.out',
    });

    camera.position.set(22, 18, 22);
    gsap.to(camera.position, {
      x: 10,
      y: 7,
      z: 10,
      duration: 1.8,
      ease: 'power3.out',
      onUpdate: () => {
        if (controls) controls.update();
      },
    });

    // 11. Render / Animation Loop
    let reqId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      reqId = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();
      
      // Animate drone orbiting the building structure
      if (droneGroup && laserLine) {
        const radius = 5.2;
        const angle = time * 0.45; // Orbit speed
        // Hover drone altitude up and down slightly
        const alt = height / 2 + Math.sin(time * 1.5) * 1.5;
        const dx = radius * Math.cos(angle);
        const dz = radius * Math.sin(angle);
        
        droneGroup.position.set(dx, alt, dz);
        droneGroup.rotation.y = -angle; // Face direction of travel

        // Laser scan beam logic: point to the closest opening or scan around
        if (openingsGroup.children.length > 0) {
          // Find opening index based on time division to simulate scanning sequentially
          const scanIndex = Math.floor((time * 0.5) % openingsGroup.children.length);
          const targetOp = openingsGroup.children[scanIndex];
          
          if (targetOp) {
            const dronePos = droneGroup.position;
            const targetPos = new THREE.Vector3().copy(targetOp.position);
            
            laserLine.geometry.setFromPoints([dronePos, targetPos]);
            laserLine.visible = status === 'IN_PROGRESS';
          }
        } else {
          laserLine.visible = false;
        }
      }

      // Pulse any occupant-detected or flashing window indicators
      openingsGroup.children.forEach(child => {
        if (child.userData && child.userData.pulse) {
          const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
          mat.opacity = 0.35 + Math.sin(time * 8) * 0.45;
        }
      });

      if (controls) controls.update();
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };
    reqId = requestAnimationFrame(animate);

    // Handle Resize
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight || 280;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      if (renderer && renderer.domElement) {
        renderer.domElement.remove();
      }
      scene.clear();
    };
  }, [building]);

  // Fallback for null building state
  if (!building) {
    return (
      <div className="glass-panel" style={{ height: '100%', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '350px' }}>
        <Info size={36} color="var(--text-dim)" style={{ marginBottom: '14px' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
          Select a structural unit from the list to initiate high-fidelity 3D/Isometric opening inspection.
        </p>
      </div>
    );
  }

  // Translate damage states for render output UI text
  const getIntegrityStatus = (dmg: string) => {
    switch (dmg) {
      case 'SEVERE_COLLAPSE':
        return { text: 'SEVERE COLLAPSE (90% Compromised)', color: 'var(--accent-crimson)', icon: <AlertTriangle size={15} color="var(--accent-crimson)" /> };
      case 'MODERATE':
        return { text: 'MODERATE DAMAGE (40% Compromised)', color: 'var(--accent-amber)', icon: <AlertTriangle size={15} color="var(--accent-amber)" /> };
      default:
        return { text: 'STABLE (5% Compromised)', color: 'var(--accent-emerald)', icon: <CheckCircle size={15} color="var(--accent-emerald)" /> };
    }
  };

  const integrity = getIntegrityStatus(damage);

  return (
    <div className="glass-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} color="var(--accent-cyan)" />
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            3D Structural Void Analyzer
          </h3>
        </div>
        <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: '4px', background: 'rgba(0,240,255,0.08)', color: 'var(--accent-cyan)', border: '1px solid rgba(0,240,255,0.2)' }}>
          {building.name.toUpperCase()}
        </span>
      </div>

      {/* 3D WebGL Canvas Area */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '280px',
          background: '#0c0f16',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Hologram aesthetic overlay grid */}
        <div style={{
          position: 'absolute', top: 12, left: 12, pointerEvents: 'none', zIndex: 10,
          fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'rgba(0, 240, 255, 0.45)',
          display: 'flex', flexDirection: 'column', gap: '3px'
        }}>
          <span>SURVEY_ALT: ORBIT_RADIAL</span>
          <span>SENSORS: RGB + THERMAL_FLIR</span>
          <span>COMP_LEVEL: {scanProgress}%</span>
        </div>
      </div>

      {/* HUD Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        
        {/* Left Side: Completion and Probability */}
        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
          <span style={{ fontSize: '0.63rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
            Inspection Progress
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {scanProgress}%
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              {status}
            </span>
          </div>
          {/* Cyber progress bar */}
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
            <div style={{ width: `${scanProgress}%`, height: '100%', background: 'var(--accent-cyan)', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* Right Side: Estimated Survivor Probability */}
        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
          <span style={{ fontSize: '0.63rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
            Est. Survivor Probability
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>
              {survivorProb}%
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              Occupancy Void likelihood
            </span>
          </div>
          {/* Amber warning progress bar */}
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
            <div style={{ width: `${survivorProb}%`, height: '100%', background: 'var(--accent-amber)', transition: 'width 0.3s ease' }} />
          </div>
        </div>

      </div>

      {/* Structural Integrity details */}
      <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {integrity.icon}
        <div>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
            Structural integrity status
          </span>
          <span style={{ fontSize: '0.78rem', color: integrity.color, fontWeight: 700 }}>
            {integrity.text}
          </span>
        </div>
      </div>

      {/* Survey parameters info text */}
      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', lineHeight: 1.45, padding: '0 4px' }}>
        <strong>🔬 Physical constraints:</strong> RGB + Thermal cameras circle building perimeter to analyze structural venting heat, voids, and window shadows. No concrete-penetrating X-ray capability is claimed.
      </div>

    </div>
  );
};
