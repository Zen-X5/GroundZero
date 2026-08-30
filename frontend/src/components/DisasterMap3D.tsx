import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { Drone, Survivor, NetworkTopology } from '../../lib/types';

interface DisasterMap3DProps {
  drones: Drone[];
  survivors: Survivor[];
  topology: NetworkTopology | null;
}

// ── Coordinate mapping: Gazebo → Three.js ────────────────────────────────────
// Gazebo world centred at (100, 50). 1 m = 1 Three.js unit.
const G2T = (gx: number, gy: number, gz = 0): THREE.Vector3 =>
  new THREE.Vector3(gx - 100, gz, -(gy - 50));

// ── SDF Ground-Truth data ─────────────────────────────────────────────────────
const WATER_ZONES = [
  { cx: 35,  cy: 50,  w: 70,  d: 120, depth: 1.0 },
  { cx: 170, cy: 50,  w: 60,  d: 100, depth: 1.0 },
  { cx: 100, cy: 86,  w: 60,  d: 28,  depth: 0.8 },
  { cx: 100, cy: 14,  w: 60,  d: 28,  depth: 0.8 },
];

const HOUSES_FLOODED = [
  { gx: 38,  gy: 22 }, { gx: 22,  gy: 80 },
  { gx: 86,  gy: 86 }, { gx: 116, gy: 88 },
  { gx: 86,  gy: 18 }, { gx: 116, gy: 16 },
];

const TREES_DATA = [
  { gx: 18, gy: 32 }, { gx: 50, gy: 75 }, { gx: 12, gy: 65 }, { gx: 28, gy: 82 },
  { gx: 38, gy: 52 }, { gx: 55, gy: 25 }, { gx: 10, gy: 15 }, { gx: 62, gy: 60 },
  { gx: 24, gy: 18 }, { gx: 46, gy: 40 }, { gx: 78, gy: 76 }, { gx: 98, gy: 98 },
  { gx: 122,gy: 76 }, { gx: 78, gy: 24 }, { gx: 98, gy: 8  }, { gx: 122,gy: 24 },
  { gx: 140,gy: 30 },
];

const URBAN_BUILDINGS = [
  { gx: 155, gy: 32,  w: 16, d: 14, h: 12, color: 0x2a4060, roofColor: 0x1a2a3a, label: 'APARTMENTS',  damage: 'MODERATE', windows: true },
  { gx: 148, gy: 75,  w: 14, d: 14, h: 16, color: 0x1a4030, roofColor: 0x102a20, label: 'COMMERCIAL',  damage: 'LOW',      windows: true },
  { gx: 182, gy: 72,  w: 18, d: 14, h: 6,  color: 0x3a2010, roofColor: 0x2a1808, label: 'WAREHOUSE',   damage: 'HIGH',     windows: false },
  { gx: 138, gy: 48,  w: 12, d: 10, h: 10, color: 0x203040, roofColor: 0x152030, label: 'CLINIC',      damage: 'LOW',      windows: true },
  { gx: 168, gy: 54,  w: 14, d: 12, h: 12, color: 0x2a3a50, roofColor: 0x1a2a3a, label: 'BANK',        damage: 'MODERATE', windows: true },
  { gx: 180, gy: 30,  w: 18, d: 16, h: 2,  color: 0x2a1a08, roofColor: 0x1a1008, label: 'RUBBLE',      damage: 'DESTROYED',windows: false },
];

const VEHICLES = [
  { gx: 86, gy: 44 }, { gx: 93, gy: 54 }, { gx: 112, gy: 40 },
  { gx: 122,gy: 56 }, { gx: 105,gy: 50 }, { gx: 105,gy: 42 }, { gx: 116,gy: 50 },
];

const SURVIVORS_POS = [
  { gx: 18, gy: 32, gz: 5.5 }, { gx: 50, gy: 75, gz: 5.5 }, { gx: 38, gy: 22, gz: 4.2 },
  { gx: 22, gy: 80, gz: 4.2 }, { gx: 35, gy: 60, gz: 2.5 }, { gx: 105,gy: 50, gz: 3.5 },
  { gx: 155,gy: 32, gz: 13  }, { gx: 148,gy: 75, gz: 17  }, { gx: 182,gy: 72, gz: 7  },
];

const DRONE_CONFIGS = [
  { color: 0x00f0ff, speed: 0.0022, height: 18,
    waypoints: (()=>{ const w:any[]=[]; let up=true; for(let x=10;x<=60;x+=15){ w.push(up?{x,y:20}:{x,y:80}); w.push(up?{x,y:80}:{x,y:20}); up=!up; } return w; })() },
  { color: 0x10b981, speed: 0.0018, height: 14,
    waypoints: [{x:80,y:50},{x:95,y:45},{x:100,y:55},{x:80,y:55}] },
  { color: 0xa78bfa, speed: 0.003,  height: 20,
    waypoints: (()=>{ const w:any[]=[]; const centers=[{cx:155,cy:32,r:14},{cx:148,cy:75,r:14}]; for(const o of centers) for(let i=0;i<24;i++){const a=(Math.PI*2/24)*i; w.push({x:o.cx+o.r*Math.cos(a),y:o.cy+o.r*Math.sin(a)});} return w; })() },
];

// ── Water GLSL Shader ─────────────────────────────────────────────────────────
const WATER_VERT = `
  uniform float uTime;
  varying vec3 vWorldPos;
  varying vec3 vWaveNormal;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;

    float w1 = sin(pos.x * 0.13 + uTime * 1.4) * 0.30;
    float w2 = cos(pos.y * 0.17 + uTime * 1.0) * 0.22;
    float w3 = sin((pos.x + pos.y) * 0.10 + uTime * 1.8) * 0.14;
    float w4 = cos((pos.x - pos.y) * 0.08 + uTime * 0.7) * 0.10;
    pos.z += w1 + w2 + w3 + w4;

    float nx = 0.13 * cos(pos.x * 0.13 + uTime * 1.4) * 0.30
             + 0.10 * cos((pos.x + pos.y) * 0.10 + uTime * 1.8) * 0.14;
    float ny = 0.17 * sin(pos.y * 0.17 + uTime * 1.0) * (-0.22)
             + 0.10 * cos((pos.x + pos.y) * 0.10 + uTime * 1.8) * 0.14;
    vWaveNormal = normalMatrix * normalize(vec3(-nx, -ny, 1.0));

    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const WATER_FRAG = `
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform vec3 uFoamColor;
  uniform vec3 uSunDir;
  varying vec3 vWorldPos;
  varying vec3 vWaveNormal;
  varying vec2 vUv;

  void main() {
    vec3 norm     = normalize(vWaveNormal);
    vec3 viewDir  = normalize(cameraPosition - vWorldPos);
    vec3 lightDir = normalize(uSunDir);

    float fresnel = pow(1.0 - max(0.0, dot(norm, viewDir)), 3.5);
    vec3  halfVec = normalize(lightDir + viewDir);
    float spec    = pow(max(0.0, dot(norm, halfVec)), 90.0);

    vec3 col = mix(uDeepColor, uShallowColor, fresnel * 0.55);
    col += uFoamColor * fresnel * 0.4;
    col += vec3(0.95, 0.97, 1.00) * spec * 0.75;

    float foam = smoothstep(0.7, 1.0, abs(sin(vUv.x * 20.0 + vUv.y * 15.0)));
    col = mix(col, uFoamColor, foam * 0.08);

    float alpha = 0.80 + fresnel * 0.18;
    gl_FragColor = vec4(col, alpha);
  }
`;

// ── Sky Shader ────────────────────────────────────────────────────────────────
const SKY_VERT = `
  varying vec3 vDir;
  void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;
const SKY_FRAG = `
  varying vec3 vDir;
  void main() {
    float t = normalize(vDir).y * 0.5 + 0.5;
    vec3 nightTop    = vec3(0.010, 0.025, 0.075);
    vec3 nightHorizon= vec3(0.030, 0.060, 0.140);
    vec3 col = mix(nightHorizon, nightTop, smoothstep(0.0, 0.6, t));
    // Orange glow at horizon (simulating distant fire/city)
    float horiz = pow(1.0 - abs(normalize(vDir).y), 4.0);
    col = mix(col, vec3(0.25, 0.08, 0.02), horiz * 0.18);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ── Geometry helpers ──────────────────────────────────────────────────────────
function makeGabledRoof(w: number, d: number, rh: number): THREE.BufferGeometry {
  const hw = w / 2 + 0.4, hd = d / 2 + 0.4;
  const verts = new Float32Array([
    // Front gable
    -hw, 0, -hd,   hw, 0, -hd,   0, rh, -hd,
    // Back gable
    -hw, 0,  hd,   0, rh,  hd,   hw, 0,  hd,
    // Left slope
    -hw, 0, -hd,  -hw, 0,  hd,   0, rh, -hd,
     0, rh, -hd,  -hw, 0,  hd,   0, rh,  hd,
    // Right slope
     hw, 0, -hd,   0, rh, -hd,   hw, 0,  hd,
     0, rh, -hd,   0, rh,  hd,   hw, 0,  hd,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  return geo;
}

function addHouse(scene: THREE.Scene, gx: number, gy: number): void {
  const p = G2T(gx, gy);
  const group = new THREE.Group();
  const wallH = 3.8, wallW = 7.5, wallD = 7.5;
  const isSubmerged = [22, 80, 38, 22, 86, 116].includes(gx);

  // Walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xc8a876, roughness: 0.88, metalness: 0.02 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(wallW, wallH, wallD), wallMat);
  wall.position.y = wallH / 2 - 0.6;
  wall.castShadow = true; wall.receiveShadow = true;
  group.add(wall);

  // Gabled roof
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x7a2020, roughness: 0.82, metalness: 0.05, side: THREE.DoubleSide });
  const roof = new THREE.Mesh(makeGabledRoof(wallW, wallD, 2.5), roofMat);
  roof.position.y = wallH - 0.6;
  roof.castShadow = true;
  group.add(roof);

  // Chimney
  const chimMat = new THREE.MeshStandardMaterial({ color: 0x8a6050, roughness: 0.9 });
  const chim = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.5, 1.0), chimMat);
  chim.position.set(-1.5, wallH + 1.2, -1.5);
  group.add(chim);

  // Windows (warm glowing)
  const winMat = new THREE.MeshStandardMaterial({ color: 0xffdd88, emissive: 0xffaa33, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 });
  [-1.8, 1.8].forEach(ox => {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.9), winMat);
    win.position.set(ox, 1.4, wallD / 2 + 0.01);
    group.add(win);
  });

  // Door
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x5a3010, roughness: 0.95 });
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.8), doorMat);
  door.position.set(0, 0.3, wallD / 2 + 0.01);
  group.add(door);

  // Flood water line mark on walls (dark band below flood level ~1.2m)
  const floodMat = new THREE.MeshStandardMaterial({ color: 0x4a6a7a, roughness: 0.95, transparent: true, opacity: 0.55 });
  const floodLine = new THREE.Mesh(new THREE.BoxGeometry(wallW + 0.1, 1.3, wallD + 0.1), floodMat);
  floodLine.position.y = 0.65 - 0.6;
  group.add(floodLine);

  // Window warm point light inside
  const wLight = new THREE.PointLight(0xffaa44, 2.5, 12);
  wLight.position.set(0, 1.5, 0);
  group.add(wLight);
  gsap.to(wLight, { intensity: 0.8, duration: 2.5 + Math.random(), repeat: -1, yoyo: true, ease: 'power1.inOut' });

  group.position.set(p.x, 0, p.z);
  group.rotation.y = Math.random() * 0.4 - 0.2;
  scene.add(group);
}

function addPineTree(scene: THREE.Scene, gx: number, gy: number, scale = 1.0, tilt = 0): void {
  const p = G2T(gx, gy);
  const group = new THREE.Group();

  // Trunk
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3010, roughness: 0.95 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 3.5 * scale, 7), trunkMat);
  trunk.position.y = 1.75 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  // Three layered cones
  const greens = [0x1a5e28, 0x1d6a2c, 0x1f7530];
  [[4.5, 0, 4.0], [3.2, 2.8, 3.2], [2.0, 5.2, 2.4]].forEach(([r, y, h], i) => {
    const coneMat = new THREE.MeshStandardMaterial({ color: greens[i], roughness: 0.85, emissive: 0x0a2a0a, emissiveIntensity: 0.15 });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r * scale, h * scale, 9), coneMat);
    cone.position.y = y * scale;
    cone.castShadow = true;
    group.add(cone);
  });

  group.position.set(p.x, 0, p.z);
  group.rotation.z = tilt;
  group.rotation.y = Math.random() * Math.PI;
  scene.add(group);
}

function addPerson(scene: THREE.Scene, gx: number, gy: number, gz: number): void {
  const p = G2T(gx, gy, gz);
  const group = new THREE.Group();

  // Colors
  const skinMat  = new THREE.MeshStandardMaterial({ color: 0xc88050, roughness: 0.7 });
  const vestMat  = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.6, emissive: 0xff3300, emissiveIntensity: 0.25 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.85 });

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), skinMat);
  head.position.y = 1.75;
  head.castShadow = true;
  group.add(head);

  // Torso (orange emergency vest)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.36), vestMat);
  torso.position.y = 1.05;
  torso.castShadow = true;
  group.add(torso);

  // Arms
  const armGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.72, 6);
  const lArm = new THREE.Mesh(armGeo, vestMat);
  lArm.position.set(-0.42, 1.1, 0);
  lArm.rotation.z = Math.PI / 5;
  group.add(lArm);

  const rArm = new THREE.Mesh(armGeo, vestMat);
  rArm.position.set(0.42, 1.1, 0);
  rArm.rotation.z = -Math.PI / 5;
  group.add(rArm);
  // Waving right arm
  gsap.to(rArm.rotation, { z: Math.PI / 3, duration: 0.7, repeat: -1, yoyo: true, ease: 'power1.inOut' });

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.11, 0.1, 0.82, 6);
  const lLeg = new THREE.Mesh(legGeo, pantsMat);
  lLeg.position.set(-0.18, 0.34, 0);
  group.add(lLeg);
  const rLeg = new THREE.Mesh(legGeo, pantsMat);
  rLeg.position.set(0.18, 0.34, 0);
  group.add(rLeg);

  // SOS beacon light above head
  const bLight = new THREE.PointLight(0xff2200, 3.5, 10);
  bLight.position.y = 2.2;
  group.add(bLight);
  gsap.to(bLight, { intensity: 0.5, duration: 0.45 + Math.random() * 0.3, repeat: -1, yoyo: true, ease: 'power2.inOut' });

  // Gentle bob
  gsap.to(group.position, { y: 0.18, duration: 1.0 + Math.random() * 0.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });

  group.position.set(p.x, p.y, p.z);
  group.rotation.y = Math.random() * Math.PI * 2;
  scene.add(group);
}

function addUrbanBuilding(scene: THREE.Scene, b: typeof URBAN_BUILDINGS[0]): void {
  const p = G2T(b.gx, b.gy);
  const group = new THREE.Group();
  const isDestroyed = b.damage === 'DESTROYED';

  // Main walls
  const wallMat = new THREE.MeshStandardMaterial({
    color: b.color,
    roughness: 0.7, metalness: 0.18,
    emissive: isDestroyed ? 0x200800 : 0x001020, emissiveIntensity: 0.2,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), wallMat);
  body.position.y = b.h / 2;
  body.castShadow = true; body.receiveShadow = true;
  group.add(body);

  // Flat roof
  const roofMat = new THREE.MeshStandardMaterial({ color: b.roofColor, roughness: 0.75, metalness: 0.1 });
  const roofMesh = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.5, 0.4, b.d + 0.5), roofMat);
  roofMesh.position.y = b.h + 0.2;
  group.add(roofMesh);

  // Glass windows (grid pattern on front face)
  if (b.windows && !isDestroyed) {
    const floors = Math.max(1, Math.floor(b.h / 3.5));
    const bays = Math.max(1, Math.floor(b.w / 4));
    const winMat = new THREE.MeshStandardMaterial({
      color: 0x88ccff, emissive: 0x224477, emissiveIntensity: 0.8,
      transparent: true, opacity: 0.7,
    });
    for (let f = 0; f < floors; f++) {
      for (let bay = 0; bay < bays; bay++) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), winMat.clone());
        win.position.set(
          -b.w / 2 + 2 + bay * (b.w / bays),
          1.8 + f * 3.2,
          b.d / 2 + 0.02
        );
        // Random lit windows
        if (Math.random() > 0.35) (win.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + Math.random() * 0.8;
        group.add(win);
      }
    }
  }

  // Rooftop red beacon
  const beaconGeo = new THREE.SphereGeometry(0.4, 8, 6);
  const beaconMat = new THREE.MeshStandardMaterial({
    color: isDestroyed ? 0xff4400 : b.damage === 'HIGH' ? 0xff6600 : 0x3388ff,
    emissive: isDestroyed ? 0xff2200 : b.damage === 'HIGH' ? 0xff4400 : 0x2266cc,
    emissiveIntensity: 1.2,
  });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.y = b.h + 0.8;
  group.add(beacon);
  const bLight = new THREE.PointLight(isDestroyed ? 0xff3300 : 0x2266ff, 5, 25);
  bLight.position.y = b.h + 1;
  group.add(bLight);
  gsap.to(bLight, { intensity: 1, duration: 0.8 + Math.random() * 0.4, repeat: -1, yoyo: true, ease: 'power2.inOut' });

  // Rubble cluster for destroyed building
  if (isDestroyed) {
    const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.95 });
    for (let r = 0; r < 12; r++) {
      const rGeo = new THREE.BoxGeometry(
        1.5 + Math.random() * 3, 0.4 + Math.random() * 1.5, 1.5 + Math.random() * 3
      );
      const rMesh = new THREE.Mesh(rGeo, rubbleMat);
      rMesh.position.set(
        (Math.random() - 0.5) * (b.w - 2),
        0.3 + Math.random() * 1.2,
        (Math.random() - 0.5) * (b.d - 2)
      );
      rMesh.rotation.set(Math.random() * 0.6, Math.random() * Math.PI, Math.random() * 0.6);
      rMesh.castShadow = true;
      group.add(rMesh);
    }
  }

  group.position.set(p.x, 0, p.z);
  scene.add(group);
}

function addDrone(scene: THREE.Scene, color: number, initPos: THREE.Vector3): THREE.Group {
  const group = new THREE.Group();

  // Body (dark sci-fi disc)
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a2030, metalness: 0.75, roughness: 0.25 });
  group.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.8, 0.38, 10), bodyMat), { castShadow: true }));

  // Camera bump
  const camMat = new THREE.MeshStandardMaterial({ color: 0x050810, metalness: 0.9 });
  const cam = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), camMat);
  cam.position.set(0, -0.28, 0.5);
  group.add(cam);

  // Arms & rotors
  const armMat = new THREE.MeshStandardMaterial({ color: 0x202838, metalness: 0.5 });
  const rotorMat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.5, emissive: color, emissiveIntensity: 0.3 });

  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sz]) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.8), armMat);
    arm.position.set(sx * 1.1, 0, sz * 1.1);
    arm.rotation.y = Math.PI / 4;
    group.add(arm);

    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.06, 12), rotorMat.clone());
    rotor.position.set(sx * 1.6, 0.12, sz * 1.6);
    group.add(rotor);
    gsap.to(rotor.rotation, { y: Math.PI * 2, duration: 0.18 + Math.random() * 0.06, repeat: -1, ease: 'none' });
  });

  // Status LED
  const ledMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5 });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), ledMat);
  group.add(led);

  // Downward spotlight
  const spot = new THREE.SpotLight(color, 8, 40, Math.PI / 8, 0.5, 1.5);
  spot.position.set(0, -0.2, 0);
  spot.target.position.set(0, -20, 0);
  group.add(spot);
  group.add(spot.target);

  group.position.copy(initPos);
  scene.add(group);
  return group;
}

// ── Main Component ────────────────────────────────────────────────────────────
export const DisasterMap3D: React.FC<DisasterMap3DProps> = ({ drones, survivors }) => {
  const mountRef       = useRef<HTMLDivElement>(null);
  const rendererRef    = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef       = useRef(0);
  const progRef        = useRef(DRONE_CONFIGS.map(() => 0));
  const droneMeshesRef = useRef<THREE.Group[]>([]);
  const waterUniRef    = useRef<{ uTime: { value: number } }[]>([]);
  const cameraRef      = useRef<THREE.PerspectiveCamera | null>(null);
  const isDragRef      = useRef(false);
  const lastMouseRef   = useRef({ x: 0, y: 0 });
  const camStateRef    = useRef({ theta: 0.55, phi: 1.05, r: 115 });
  const beaconsRef     = useRef<THREE.PointLight[]>([]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const W = mount.clientWidth || 800, H = mount.clientHeight || 500;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.65;
    renderer.setClearColor(0x020509, 1);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Scene ─────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x03080e, 0.0015);

    // ── Camera ────────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(48, W / H, 0.5, 800);
    const setCamera = () => {
      const { theta, phi, r } = camStateRef.current;
      camera.position.set(r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.cos(theta));
      camera.lookAt(0, 0, 0);
    };
    setCamera();
    cameraRef.current = camera;

    // ── Lights ────────────────────────────────────────────────────────────────
    const hemi = new THREE.HemisphereLight(0x5588cc, 0x204030, 2.5);
    scene.add(hemi);
    scene.add(new THREE.AmbientLight(0x668899, 1.8));

    const moon = new THREE.DirectionalLight(0xb0c8e8, 3.2);
    moon.position.set(-60, 120, -80);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    Object.assign(moon.shadow.camera, { left: -160, right: 160, top: 110, bottom: -110, near: 1, far: 500 });
    scene.add(moon);

    // Emergency beacons
    const redB  = new THREE.PointLight(0xff4422, 14, 90);  redB.position.copy(G2T(165, 45, 12)); scene.add(redB);
    const ambB  = new THREE.PointLight(0xffaa22, 11, 75); ambB.position.copy(G2T(100, 50,  7)); scene.add(ambB);
    const bluB  = new THREE.PointLight(0x44aaff,  9, 60); bluB.position.copy(G2T( 35, 60,  5)); scene.add(bluB);
    beaconsRef.current = [redB, ambB, bluB];

    // ── Sky dome ──────────────────────────────────────────────────────────────
    const skyGeo = new THREE.SphereGeometry(500, 32, 16);
    const skyMat = new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    // ── Moon sphere ───────────────────────────────────────────────────────────
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(9, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0xeef0cc, emissive: 0xeef0cc, emissiveIntensity: 0.6, roughness: 0.95 })
    );
    moonMesh.position.set(-240, 320, -280);
    scene.add(moonMesh);
    const moonGlow = new THREE.PointLight(0xeeeebb, 4, 400);
    moonGlow.position.copy(moonMesh.position);
    scene.add(moonGlow);

    // ── Stars ─────────────────────────────────────────────────────────────────
    const starCount = 2000;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta2 = Math.random() * Math.PI * 2;
      const phi2   = Math.acos(Math.random() * 0.95);
      const r = 420 + Math.random() * 60;
      starPos[i*3]   = r * Math.sin(phi2) * Math.cos(theta2);
      starPos[i*3+1] = r * Math.cos(phi2);
      starPos[i*3+2] = r * Math.sin(phi2) * Math.sin(theta2);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, sizeAttenuation: true, transparent: true, opacity: 0.85 })));

    // ── Ground ────────────────────────────────────────────────────────────────
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x283840, roughness: 0.92, metalness: 0.04 });
    const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(280, 160, 1, 1), groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Grid
    const grid = new THREE.GridHelper(280, 56, 0x1a4060, 0x0d2230);
    grid.position.y = 0.02;
    scene.add(grid);

    // ── Water zones (shader) ──────────────────────────────────────────────────
    const waterUniforms: { uTime: { value: number } }[] = [];
    WATER_ZONES.forEach(z => {
      const uni = {
        uTime:        { value: 0 },
        uDeepColor:   { value: new THREE.Color(0x0d4a8a) },
        uShallowColor:{ value: new THREE.Color(0x1a90cc) },
        uFoamColor:   { value: new THREE.Color(0x88ccff) },
        uSunDir:      { value: new THREE.Vector3(-0.4, 0.8, -0.45).normalize() },
      };
      waterUniforms.push(uni);
      const wMat = new THREE.ShaderMaterial({ uniforms: uni, vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, transparent: true, side: THREE.FrontSide });
      const wGeo = new THREE.PlaneGeometry(z.w, z.d, 40, 40);
      const wMesh = new THREE.Mesh(wGeo, wMat);
      wMesh.rotation.x = -Math.PI / 2;
      const p = G2T(z.cx, z.cy, z.depth);
      wMesh.position.set(p.x, p.y, p.z);
      scene.add(wMesh);
    });
    waterUniRef.current = waterUniforms;

    // ── Elevated highway ──────────────────────────────────────────────────────
    const hwMat = new THREE.MeshStandardMaterial({ color: 0x2a2e3e, roughness: 0.78, metalness: 0.1 });
    const hw = new THREE.Mesh(new THREE.BoxGeometry(62, 0.8, 13), hwMat);
    hw.position.set(0, 0.38, 0);
    hw.receiveShadow = true;
    scene.add(hw);

    // Road lane dashes
    for (let i = -28; i < 28; i += 6) {
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 0.28),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.6 })
      );
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(i, 0.79, 0);
      scene.add(dash);
    }

    // Road block barrier (red+white)
    const barMat = new THREE.MeshStandardMaterial({ color: 0xdd2200, roughness: 0.7 });
    for (let bz = -4; bz <= 4; bz += 2) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.4), barMat);
      bar.position.set(G2T(112, 50, 2.0).x, 1.6, bz);
      scene.add(bar);
    }

    // Street lamp posts along highway
    const lampMat  = new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.7, metalness: 0.6 });
    const lampHead = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffaa, emissiveIntensity: 0.9 });
    for (let lx = -25; lx <= 25; lx += 12) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5, 6), lampMat);
      post.position.set(lx, 3.2, -7.5);
      scene.add(post);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lampHead);
      head.position.set(lx, 5.8, -7.5);
      scene.add(head);
      const lLight = new THREE.PointLight(0xffffaa, 3.5, 20);
      lLight.position.set(lx, 5.5, -7.5);
      scene.add(lLight);
    }

    // ── Flooded houses ────────────────────────────────────────────────────────
    HOUSES_FLOODED.forEach(h => addHouse(scene, h.gx, h.gy));

    // ── Pine trees ────────────────────────────────────────────────────────────
    TREES_DATA.forEach((t, i) => addPineTree(scene, t.gx, t.gy, 0.8 + Math.random() * 0.5, (Math.random() - 0.5) * 0.18));

    // ── Vehicles ──────────────────────────────────────────────────────────────
    const vehicleColors = [0x334466, 0x443322, 0x224433, 0x553322, 0x334455, 0x224466, 0x443333];
    VEHICLES.forEach((v, i) => {
      const p = G2T(v.gx, v.gy, 0.7);
      const vMat = new THREE.MeshStandardMaterial({ color: vehicleColors[i % vehicleColors.length], metalness: 0.5, roughness: 0.55 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.6, 2.2), vMat);
      body.position.set(p.x, 1.9, p.z);
      body.castShadow = true;
      scene.add(body);
      // Cab
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 2.0), vMat);
      cab.position.set(p.x + 0.8, 3.1, p.z);
      scene.add(cab);
      // Windshield glow
      const winMat = new THREE.MeshStandardMaterial({ color: 0x88aacc, emissive: 0x334466, emissiveIntensity: 0.35, transparent: true, opacity: 0.7 });
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.9), winMat);
      win.position.set(p.x + 1.8, 3.1, p.z - 1.01);
      scene.add(win);
    });

    // ── Rescue boat ───────────────────────────────────────────────────────────
    const boatP = G2T(35, 60, 1.2);
    const boatMat = new THREE.MeshStandardMaterial({ color: 0x223a6a, metalness: 0.4, roughness: 0.5 });
    const boat = new THREE.Mesh(new THREE.BoxGeometry(7, 1.2, 3.5), boatMat);
    boat.position.set(boatP.x, 1.2, boatP.z);
    scene.add(boat);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5, 6), new THREE.MeshStandardMaterial({ color: 0xaabbcc }));
    mast.position.set(boatP.x, 4.2, boatP.z);
    scene.add(mast);

    // ── Urban buildings ───────────────────────────────────────────────────────
    URBAN_BUILDINGS.forEach(b => addUrbanBuilding(scene, b));

    // ── Base station ──────────────────────────────────────────────────────────
    const bsp = G2T(0, 50, 0);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1a4a30, metalness: 0.7, roughness: 0.4, emissive: 0x00ff88, emissiveIntensity: 0.4 });
    const baseBody = new THREE.Mesh(new THREE.CylinderGeometry(3, 4.5, 2, 10), baseMat);
    baseBody.position.set(bsp.x, 1, bsp.z);
    scene.add(baseBody);
    const antMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 1.3, metalness: 0.9 });
    const antMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 9, 6), antMat);
    antMesh.position.set(bsp.x, 6.5, bsp.z);
    scene.add(antMesh);
    const baseLight = new THREE.PointLight(0x00ff88, 12, 55);
    baseLight.position.set(bsp.x, 7, bsp.z);
    scene.add(baseLight);
    gsap.to(baseLight, { intensity: 3, duration: 1.3, repeat: -1, yoyo: true, ease: 'power2.inOut' });

    // Pulse ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(8, 0.3, 8, 32), new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.8, transparent: true, opacity: 0.5 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(bsp.x, 0.3, bsp.z);
    scene.add(ring);
    gsap.to(ring.scale, { x: 2.5, y: 2.5, z: 2.5, duration: 2, repeat: -1, ease: 'power2.out' });
    gsap.to((ring.material as THREE.MeshStandardMaterial), { opacity: 0, duration: 2, repeat: -1, ease: 'power2.out' });

    // ── Survivors (humanoid) ──────────────────────────────────────────────────
    SURVIVORS_POS.forEach(s => addPerson(scene, s.gx, s.gy, s.gz));

    // ── Drones ────────────────────────────────────────────────────────────────
    const droneGroups: THREE.Group[] = DRONE_CONFIGS.map(cfg => {
      const wp0 = cfg.waypoints[0];
      const p0  = G2T(wp0.x, wp0.y, cfg.height);
      return addDrone(scene, cfg.color, p0);
    });
    droneMeshesRef.current = droneGroups;

    // ── GSAP intro ────────────────────────────────────────────────────────────
    const initY = camera.position.y;
    camera.position.y += 70;
    gsap.to(camera.position, { y: initY, duration: 2.8, ease: 'power3.out', onUpdate: () => camera.lookAt(0, 0, 0) });

    // ── Mouse orbit ───────────────────────────────────────────────────────────
    const onMouseDown = (e: MouseEvent) => { isDragRef.current = true; lastMouseRef.current = { x: e.clientX, y: e.clientY }; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x, dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      camStateRef.current.theta -= dx * 0.007;
      camStateRef.current.phi = Math.max(0.12, Math.min(1.45, camStateRef.current.phi + dy * 0.007));
      setCamera();
    };
    const onMouseUp   = () => { isDragRef.current = false; };
    const onWheel     = (e: WheelEvent) => {
      e.preventDefault();
      camStateRef.current.r = Math.max(25, Math.min(230, camStateRef.current.r + e.deltaY * 0.16));
      setCamera();
    };
    mount.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    mount.addEventListener('wheel', onWheel, { passive: false });

    // ── Resize ────────────────────────────────────────────────────────────────
    const obs = new ResizeObserver(() => {
      if (!mount) return;
      const W2 = mount.clientWidth, H2 = mount.clientHeight;
      renderer.setSize(W2, H2);
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
    });
    obs.observe(mount);

    // ── Animation loop ────────────────────────────────────────────────────────
    let frame = 0;
    const tick = () => {
      frameRef.current = requestAnimationFrame(tick);
      frame++;
      const t = frame * 0.016;

      // Water shader time
      waterUniRef.current.forEach(u => { u.uTime.value = t; });

      // Beacon flicker
      const [r, a, b2] = beaconsRef.current;
      r.intensity  = 11 + Math.sin(t * 4.2) * 4;
      a.intensity  =  8 + Math.sin(t * 3.1 + 1) * 3;
      b2.intensity =  7 + Math.sin(t * 2.4 + 2) * 2;

      // Drone patrol
      DRONE_CONFIGS.forEach((cfg, i) => {
        const prog = progRef.current[i];
        const wps  = cfg.waypoints;
        const wi   = Math.floor(prog) % wps.length;
        const ni   = (wi + 1) % wps.length;
        const frac = prog - Math.floor(prog);
        const wx = wps[wi].x + (wps[ni].x - wps[wi].x) * frac;
        const wy = wps[wi].y + (wps[ni].y - wps[wi].y) * frac;
        const tp = G2T(wx, wy, cfg.height);
        const grp = droneMeshesRef.current[i];
        grp.position.set(tp.x, cfg.height + Math.sin(t * 1.5 + i * 1.2) * 0.5, tp.z);
        const dx2 = wps[ni].x - wps[wi].x, dy2 = wps[ni].y - wps[wi].y;
        grp.rotation.y = Math.atan2(-dx2, -dy2);
        const tiltNorm = new THREE.Vector2(dx2, dy2).length() > 0 ? new THREE.Vector2(dx2, dy2).normalize() : new THREE.Vector2();
        grp.rotation.x = tiltNorm.y * 0.12;
        grp.rotation.z = -tiltNorm.x * 0.12;
        progRef.current[i] = prog + cfg.speed;
      });

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(frameRef.current);
      mount.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      mount.removeEventListener('wheel', onWheel);
      obs.disconnect();
      gsap.killTweensOf('*');
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab', position: 'relative' }}>
      <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        zIndex: 20, padding: '5px 16px', borderRadius: '6px',
        background: 'rgba(0,20,10,0.75)', border: '1px solid rgba(0,240,255,0.3)',
        color: 'var(--accent-cyan)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
        fontWeight: 'bold', letterSpacing: '0.05em', pointerEvents: 'none', backdropFilter: 'blur(6px)',
      }}>
        ◆ 3D LIVE SCENE — DRAG TO ORBIT · SCROLL TO ZOOM
      </div>
      <div style={{
        position: 'absolute', bottom: 14, right: 14, zIndex: 20,
        display: 'flex', flexDirection: 'column', gap: '5px', pointerEvents: 'none',
      }}>
        {[['🔴','Emergency Beacon C'],['🟠','Amber Road Beacon'],['🔵','Rescue Boat Beacon'],['🟢','Base Gateway'],['🟡','Survivors'],['⬜','Active Drones']].map(([icon, label]) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'0.62rem', color:'rgba(200,220,255,0.8)', fontFamily:'var(--font-mono)', background:'rgba(3,8,18,0.7)', padding:'3px 8px', borderRadius:'4px' }}>
            <span>{icon}</span><span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
