import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { 
  Play, 
  RefreshCw, 
  MapPin, 
  Activity, 
  Radio, 
  Wifi, 
  TrendingUp, 
  CheckCircle2, 
  Info,
  Clock,
  Compass
} from 'lucide-react';

// ------------------------------------------------------------------
// Math Constants & Helpers for Local Geolocation Solver Fallback
// ------------------------------------------------------------------
const C = 3e8; // speed of light, m/s
const EARTH_RADIUS = 6371000.0;

function haversineDistanceJS(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(a));
  return EARTH_RADIUS * c;
}

// Custom Grid Search + Gradient Descent Solver in pure JS
function solveTDoAJS(drones: any[], arrivalTimes: number[]): { estLat: number, estLon: number, error: number } {
  const meanLat = drones.reduce((sum, d) => sum + d.lat, 0) / drones.length;
  const meanLon = drones.reduce((sum, d) => sum + d.lon, 0) / drones.length;

  let bestLat = meanLat;
  let bestLon = meanLon;
  let minCost = Infinity;

  const steps = 60;
  const extLat = 0.04;
  const extLon = 0.04;

  const obsDt: { i: number, j: number, dt: number }[] = [];
  for (let i = 0; i < drones.length; i++) {
    for (let j = i + 1; j < drones.length; j++) {
      obsDt.push({ i, j, dt: arrivalTimes[i] - arrivalTimes[j] });
    }
  }

  function costFunc(lat: number, lon: number): number {
    let cost = 0;
    const predTimes = drones.map(d => haversineDistanceJS(d.lat, d.lon, lat, lon) / C);
    for (const { i, j, dt } of obsDt) {
      const predDt = predTimes[i] - predTimes[j];
      cost += ((predDt - dt) * C) ** 2; // meters squared
    }
    return Math.sqrt(cost);
  }

  // Grid search
  for (let i = 0; i <= steps; i++) {
    const lat = meanLat - extLat / 2 + (i / steps) * extLat;
    for (let j = 0; j <= steps; j++) {
      const lon = meanLon - extLon / 2 + (j / steps) * extLon;
      const c = costFunc(lat, lon);
      if (c < minCost) {
        minCost = c;
        bestLat = lat;
        bestLon = lon;
      }
    }
  }

  // Hill climbing search refinement
  let stepSize = 0.0005;
  const minStep = 0.000001;
  while (stepSize > minStep) {
    let improved = false;
    const dirs = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [-1, 1], [1, -1], [-1, -1]
    ];
    for (const [dLat, dLon] of dirs) {
      const testLat = bestLat + dLat * stepSize;
      const testLon = bestLon + dLon * stepSize;
      const c = costFunc(testLat, testLon);
      if (c < minCost) {
        minCost = c;
        bestLat = testLat;
        bestLon = testLon;
        improved = true;
        break;
      }
    }
    if (!improved) {
      stepSize *= 0.5;
    }
  }

  return { estLat: bestLat, estLon: bestLon, error: minCost };
}

// Parametric hyperbola trace generator in JS (Lat/Lon coordinates)
function generateHyperbolaJS(
  droneA: any,
  droneB: any,
  dtAB: number,
  areaCenter: { lat: number, lon: number },
  halfExtentM = 2000,
  nPoints = 120
): { lat: number, lon: number }[] {
  const lat0 = areaCenter.lat;
  const lon0 = areaCenter.lon;

  // Convert lat/lon coordinates to meters relative to center
  const toMeters = (lat: number, lon: number) => {
    const x = (lon - lon0) * 111139.0 * Math.cos(lat0 * Math.PI / 180);
    const y = (lat - lat0) * 111320.0;
    return { x, y };
  };

  const toLatLon = (x: number, y: number) => {
    const lat = lat0 + y / 111320.0;
    const lon = lon0 + x / (111139.0 * Math.cos(lat0 * Math.PI / 180));
    return { lat, lon };
  };

  const posA = toMeters(droneA.lat, droneA.lon);
  const posB = toMeters(droneB.lat, droneB.lon);

  const dx = posB.x - posA.x;
  const dy = posB.y - posA.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const c = dist / 2;

  // 2a = C * dtAB
  let a = (C * dtAB) / 2;

  // Clip a to avoid imaginary numbers if noisy (must be strictly less than c)
  const maxA = c * 0.98;
  if (Math.abs(a) > maxA) {
    a = Math.sign(a) * maxA;
  }

  const b = Math.sqrt(c * c - a * a);

  const midX = (posA.x + posB.x) / 2;
  const midY = (posA.y + posB.y) / 2;
  const phi = Math.atan2(dy, dx);

  const points: { lat: number, lon: number }[] = [];

  for (let i = 0; i < nPoints; i++) {
    // vary parameter t to cover the extent
    const t = -2.2 + (i / (nPoints - 1)) * 4.4;
    const xp = a * Math.cosh(t);
    const yp = b * Math.sinh(t);

    // Rotate and translate
    const x = midX + xp * Math.cos(phi) - yp * Math.sin(phi);
    const y = midY + xp * Math.sin(phi) + yp * Math.cos(phi);

    points.push(toLatLon(x, y));
  }

  return points;
}

// Parametric hyperbola generator operating directly in Three.js space (1 unit = 10m)
function getHyperbolaPointsParametric(
  posA: { x: number, z: number },
  posB: { x: number, z: number },
  dtAB: number,
  nPoints = 120
): THREE.Vector3[] {
  const dx = posB.x - posA.x;
  const dz = posB.z - posA.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const c = dist / 2;

  // Speed of light in Three.js space units/s (3e8 m/s / 10m/unit = 3e7 units/s)
  const C_three = 3e7;
  let a = (C_three * dtAB) / 2;

  // Clip a to avoid imaginary numbers if noisy
  const maxA = c * 0.98;
  if (Math.abs(a) > maxA) {
    a = Math.sign(a) * maxA;
  }

  const b = Math.sqrt(c * c - a * a);

  const midX = (posA.x + posB.x) / 2;
  const midZ = (posA.z + posB.z) / 2;
  const phi = Math.atan2(dz, dx);

  const points: THREE.Vector3[] = [];

  for (let i = 0; i < nPoints; i++) {
    const t = -2.5 + (i / (nPoints - 1)) * 5.0;
    const xp = a * Math.cosh(t);
    const yp = b * Math.sinh(t);

    const x = midX + xp * Math.cos(phi) - yp * Math.sin(phi);
    const z = midZ + xp * Math.sin(phi) + yp * Math.cos(phi);

    points.push(new THREE.Vector3(x, 4.3, z)); // placed at Y=4.3, slightly above water level
  }

  return points;
}


// ------------------------------------------------------------------
// Static Simulation Parameters & Geolocation Config
// ------------------------------------------------------------------
const LAT_CENTER = 26.145;
const LON_CENTER = 91.750;

// Converts (lat, lon) to local Three.js coordinates (X, Z). Scale: 1 unit = 10 meters.
const latLonToThree = (lat: number, lon: number) => {
  const x = (lon - LON_CENTER) * 111139.0 * Math.cos(LAT_CENTER * Math.PI / 180.0) / 10.0;
  const z = -(lat - LAT_CENTER) * 111320.0 / 10.0;
  return { x, z };
};

const HOUSES = [
  {
    id: 'house_1',
    name: 'Sector A - NW Villa',
    lat: 26.1480,
    lon: 91.7420,
    survivorsCount: 3,
    networks: [
      { username: '@nilotpal', device: 'smartphone' },
      { username: '@sahid_sec', device: 'smartphone' },
      { username: '@rashel_design', device: 'none' }
    ]
  },
  {
    id: 'house_2',
    name: 'Sector B - NE Office',
    lat: 26.1500,
    lon: 91.7580,
    survivorsCount: 3,
    networks: [
      { username: '@rescue_op', device: 'smartphone' },
      { username: '@trapped_expert', device: 'smartphone' },
      { username: '@guest_01', device: 'none' }
    ]
  },
  {
    id: 'house_3',
    name: 'Sector A - SW School',
    lat: 26.1360,
    lon: 91.7450,
    survivorsCount: 1,
    networks: [
      { username: '@assamboy', device: 'smartphone' }
    ]
  },
  {
    id: 'house_4',
    name: 'Sector C - Central Store',
    lat: 26.1440,
    lon: 91.7490,
    survivorsCount: 1,
    networks: [
      { username: '@survivor_c', device: 'smartphone' }
    ]
  },
  {
    id: 'house_5',
    name: 'Sector C - SE Hub',
    lat: 26.1390,
    lon: 91.7560,
    survivorsCount: 1,
    networks: [
      { username: '@flood_victim_01', device: 'smartphone' }
    ]
  }
];

const DEFAULT_DRONES = [
  { id: 'Drone-A', lat: 26.1580, lon: 91.7350, color: 0x00f0ff, label: 'Drone Alpha (NW)' },
  { id: 'Drone-B', lat: 26.1600, lon: 91.7650, color: 0x00ff88, label: 'Drone Beta (NE)' },
  { id: 'Drone-C', lat: 26.1300, lon: 91.7500, color: 0xa78bfa, label: 'Drone Gamma (S)' }
];

interface BeaconRecord {
  beacon_id: string;
  lat: number;
  lon: number;
  confidence: 'high' | 'medium' | 'low';
  source: string;
  timestamp: string;
  estimated_error_meters: number;
  targetUser: string;
}

export function TDoASimulation3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedHouse, setSelectedHouse] = useState(HOUSES[0]);
  const [selectedUser, setSelectedUser] = useState(HOUSES[0].networks.filter(n => n.device === 'smartphone')[0].username);
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [animationStep, setAnimationStep] = useState<string>('Idle');
  const [beacons, setBeacons] = useState<BeaconRecord[]>([]);

  // Simulation metrics state
  const [stats, setStats] = useState<{
    arrivalTimes: number[];
    pairwiseDts: { pair: string; dt: number }[];
    errorMeters: number;
    estPos: [number, number];
    truePos: [number, number];
  } | null>(null);

  // References for Three.js elements
  const sceneRef = useRef<THREE.Scene | null>(null);
  const dronesRef = useRef<Map<string, THREE.Group>>(new Map());
  const beamsRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const hyperbolasGroupRef = useRef<THREE.Group | null>(null);
  const convergenceMarkerRef = useRef<THREE.Group | null>(null);
  const rippleRef = useRef<THREE.Mesh | null>(null);
  const signalBeamsGroupRef = useRef<THREE.Group | null>(null);
  const isSimulatingRef = useRef(false);
  const selectedHouseRef = useRef(HOUSES[0]);


  // Track coordinates for camera looking
  const targetCamPos = useRef({ x: 0, y: 180, z: 120 });
  const currentCamLookAt = useRef(new THREE.Vector3(0, 0, 0));

  // Change user when house changes
  const handleHouseChange = (houseId: string) => {
    const house = HOUSES.find(h => h.id === houseId);
    if (house) {
      setSelectedHouse(house);
      selectedHouseRef.current = house;
      const phones = house.networks.filter(n => n.device === 'smartphone');
      if (phones.length > 0) {
        setSelectedUser(phones[0].username);
      }
    }
  };


  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth || 800, H = mount.clientHeight || 500;

    // --- 1. Scene & Renderer Setup ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0c152b, 0.0025);
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.85;
    renderer.setClearColor(0x0c152b, 1);
    mount.appendChild(renderer.domElement);

    // --- 2. Camera ---
    const camera = new THREE.PerspectiveCamera(45, W / H, 1, 1000);
    camera.position.set(0, 240, 180);
    camera.lookAt(0, 0, 0);

    // --- 3. Lights ---
    scene.add(new THREE.AmbientLight(0x7ea2d6, 3.8));
    const hemi = new THREE.HemisphereLight(0x9bd0ff, 0x223555, 2.2);
    scene.add(hemi);

    const dirLight = new THREE.DirectionalLight(0xb0d3ff, 4.0);
    dirLight.position.set(50, 150, -50);
    scene.add(dirLight);

    // --- 4. Environment Grid & Submerged Base Grid ---
    // glowing grid helper
    const gridHelper = new THREE.GridHelper(400, 40, 0x00f0ff, 0x1f3c63);
    gridHelper.position.y = 0.1;
    scene.add(gridHelper);

    // Dark ground base
    const groundGeo = new THREE.PlaneGeometry(500, 500);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0x091424, 
      roughness: 0.9, 
      metalness: 0.7 
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // --- 5. Flood Water (Half Submerged level) ---
    // A transparent, slightly glowing plane showing the water level
    const waterGeo = new THREE.PlaneGeometry(500, 500, 20, 20);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0b78c4,
      transparent: true,
      opacity: 0.58,
      roughness: 0.08,
      metalness: 0.4,
      side: THREE.DoubleSide
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = 4.0; // half-submerged height (houses are 8 units tall)
    scene.add(waterMesh);

    // --- 6. Add 5 Houses (Submerged) ---
    const houseMeshes: THREE.Group[] = [];
    HOUSES.forEach(h => {
      const { x, z } = latLonToThree(h.lat, h.lon);
      const houseGroup = new THREE.Group();
      houseGroup.position.set(x, 0, z);
      houseGroup.name = h.id;

      // House wall (half submerged, 8 units high, placed at y=4 so bottom 4 are underwater)
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0x3d5675,
        roughness: 0.8,
        metalness: 0.2
      });
      const walls = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), wallMat);
      walls.position.y = 4.0; // Base rests at 0, top at 8.
      houseGroup.add(walls);

      // Waterline stain band (showing flood mud line)
      const mudMat = new THREE.MeshBasicMaterial({
        color: 0x332211,
        transparent: true,
        opacity: 0.7
      });
      const mudLine = new THREE.Mesh(new THREE.BoxGeometry(12.1, 1.2, 12.1), mudMat);
      mudLine.position.y = 3.9; // Just below water level
      houseGroup.add(mudLine);

      // Warm glow windows above water level (e.g. at y=6)
      const windowMat = new THREE.MeshStandardMaterial({
        color: 0xffbb00,
        emissive: 0xff8800,
        emissiveIntensity: 2.5,
        transparent: true,
        opacity: 0.9
      });
      
      // Front window
      const winF = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), windowMat);
      winF.position.set(0, 6.0, 6.01);
      houseGroup.add(winF);

      // Back window
      const winB = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), windowMat);
      winB.position.set(0, 6.0, -6.01);
      winB.rotation.y = Math.PI;
      houseGroup.add(winB);

      // Roof (Cone with 4 segments = Pyramid)
      const roofMat = new THREE.MeshStandardMaterial({
        color: 0xb5354a,
        roughness: 0.75
      });
      const roof = new THREE.Mesh(new THREE.ConeGeometry(9.5, 4.5, 4), roofMat);
      roof.position.y = 10.25; // rests on top of box (walls go up to 8)
      roof.rotation.y = Math.PI / 4; // Align pyramid walls with cube walls
      houseGroup.add(roof);

      // Trapped indicators (glowing phone signal dots floating above chimney)
      const signalGeo = new THREE.SphereGeometry(0.5, 8, 8);
      const signalMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.8
      });
      const signalIndicator = new THREE.Mesh(signalGeo, signalMat);
      signalIndicator.position.set(0, 13.5, 0);
      houseGroup.add(signalIndicator);
      gsap.to(signalIndicator.scale, {
        x: 1.6, y: 1.6, z: 1.6,
        duration: 1.0 + Math.random(),
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      scene.add(houseGroup);
      houseMeshes.push(houseGroup);
    });

    // --- 7. Spawn 3 Mesh Drones ---
    DEFAULT_DRONES.forEach(d => {
      const { x, z } = latLonToThree(d.lat, d.lon);
      const droneGroup = new THREE.Group();
      droneGroup.position.set(x, 25.0, z); // Hovering height 250m
      droneGroup.name = d.id;

      // Central disc body
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x111e2e,
        metalness: 0.9,
        roughness: 0.2
      });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 1.8, 0.6, 8), bodyMat);
      droneGroup.add(body);

      // Accent colored LED status dome
      const ledMat = new THREE.MeshStandardMaterial({
        color: d.color,
        emissive: d.color,
        emissiveIntensity: 1.8
      });
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 6), ledMat);
      led.position.y = 0.35;
      droneGroup.add(led);

      // Arm booms (diagonal)
      const armMat = new THREE.MeshStandardMaterial({ color: 0x222d3d, metalness: 0.6 });
      [[2, 2], [-2, 2], [2, -2], [-2, -2]].forEach(([ax, az]) => {
        const boom = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 3.0), armMat);
        boom.position.set(ax * 0.5, 0, az * 0.5);
        boom.rotation.y = Math.atan2(az, ax) + Math.PI / 4;
        droneGroup.add(boom);

        // Rotor discs (semi transparent, spin)
        const rotorMat = new THREE.MeshStandardMaterial({
          color: d.color,
          transparent: true,
          opacity: 0.4,
          emissive: d.color,
          emissiveIntensity: 0.4
        });
        const rotor = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.05, 10), rotorMat);
        rotor.position.set(ax * 0.9, 0.2, az * 0.9);
        droneGroup.add(rotor);

        // Spin rotors
        gsap.to(rotor.rotation, {
          y: Math.PI * 2,
          duration: 0.12 + Math.random() * 0.05,
          repeat: -1,
          ease: 'none'
        });
      });

      // Directional Searchlight Spot Pointing Down
      const spotLight = new THREE.SpotLight(d.color, 8, 80, Math.PI / 7, 0.5, 1.2);
      spotLight.position.set(0, -0.2, 0);
      spotLight.target.position.set(0, -60, 0);
      droneGroup.add(spotLight);
      droneGroup.add(spotLight.target);

      // Volumetric beam cylinder (custom signal beam overlay)
      const beamGeo = new THREE.CylinderGeometry(0.1, 4.0, 25.0, 16, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: d.color,
        transparent: true,
        opacity: 0.0, // hidden by default, animated during signal trigger
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const beamMesh = new THREE.Mesh(beamGeo, beamMat);
      beamMesh.position.y = -12.5;
      droneGroup.add(beamMesh);

      scene.add(droneGroup);
      dronesRef.current.set(d.id, droneGroup);
      beamsRef.current.set(d.id, beamMesh);
    });

    // --- 8. Set Up Groups for Animation Objects ---
    const hyperbolasGroup = new THREE.Group();
    scene.add(hyperbolasGroup);
    hyperbolasGroupRef.current = hyperbolasGroup;

    const convergenceMarker = new THREE.Group();
    scene.add(convergenceMarker);
    convergenceMarkerRef.current = convergenceMarker;

    const signalBeamsGroup = new THREE.Group();
    scene.add(signalBeamsGroup);
    signalBeamsGroupRef.current = signalBeamsGroup;

    // Spawn straight signal lines & moving dots (Signal packets)
    DEFAULT_DRONES.forEach(d => {
      // Dashed line
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0)
      ]);
      const lineMat = new THREE.LineDashedMaterial({
        color: d.color,
        dashSize: 2.0,
        gapSize: 2.0,
        transparent: true,
        opacity: 0.25
      });
      const line = new THREE.Line(lineGeo, lineMat);
      line.name = `line_${d.id}`;
      signalBeamsGroup.add(line);

      // 5 glowing dots per line
      const dotGeo = new THREE.SphereGeometry(0.3, 8, 8);
      for (let i = 0; i < 5; i++) {
        const dotMat = new THREE.MeshBasicMaterial({
          color: d.color,
          transparent: true,
          opacity: 0.15,
          blending: THREE.AdditiveBlending
        });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.name = `dot_${d.id}_${i}`;
        signalBeamsGroup.add(dot);
      }
    });

    // --- 9. Ripple / Pulse Ring for Step 1 ---
    const ripMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const ripMesh = new THREE.Mesh(new THREE.RingGeometry(0.5, 2.0, 32), ripMat);
    ripMesh.rotation.x = -Math.PI / 2;
    scene.add(ripMesh);
    rippleRef.current = ripMesh;

    // --- 10. Drag Orbit controls (Simple Implementation) ---
    let isDragging = false;
    let previousMouse = { x: 0, y: 0 };
    const camState = { theta: 0.6, phi: 0.9, r: 240 };

    const setCameraCoords = () => {
      camera.position.x = currentCamLookAt.current.x + camState.r * Math.sin(camState.phi) * Math.sin(camState.theta);
      camera.position.y = currentCamLookAt.current.y + camState.r * Math.cos(camState.phi);
      camera.position.z = currentCamLookAt.current.z + camState.r * Math.sin(camState.phi) * Math.cos(camState.theta);
      camera.lookAt(currentCamLookAt.current);
    };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - previousMouse.x;
      const dy = e.clientY - previousMouse.y;
      previousMouse = { x: e.clientX, y: e.clientY };

      camState.theta -= dx * 0.007;
      camState.phi = Math.max(0.15, Math.min(1.4, camState.phi + dy * 0.007));
      setCameraCoords();
    };

    const onMouseUp = () => { isDragging = false; };
    
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camState.r = Math.max(80, Math.min(380, camState.r + e.deltaY * 0.2));
      setCameraCoords();
    };

    mount.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    mount.addEventListener('wheel', onWheel, { passive: false });

    // Resize handler
    const resizeObserver = new ResizeObserver(() => {
      const w2 = mount.clientWidth, h2 = mount.clientHeight;
      renderer.setSize(w2, h2);
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(mount);

    // --- 11. Animation Loop ---
    let frameId = 0;
    let clock = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      clock += 0.016;

      // Animate water waves slightly
      const posAttr = waterGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const z = Math.sin(x * 0.08 + clock * 2.0) * 0.28 + Math.cos(y * 0.09 + clock * 1.5) * 0.22;
        posAttr.setZ(i, z);
      }
      waterGeo.computeVertexNormals();
      waterGeo.attributes.position.needsUpdate = true;

      // Drones hovering/patrolling
      DEFAULT_DRONES.forEach((d, idx) => {
        const drone = dronesRef.current.get(d.id);
        if (drone) {
          // Patrol inside distinct sectors (circles)
          const angle = clock * 0.15 + idx * 2.1;
          const radius = idx === 0 ? 25 : idx === 1 ? 20 : 30;
          const center = latLonToThree(d.lat, d.lon);
          
          const targetX = center.x + Math.cos(angle) * radius;
          const targetZ = center.z + Math.sin(angle) * radius;
          
          drone.position.x = THREE.MathUtils.lerp(drone.position.x, targetX, 0.05);
          drone.position.z = THREE.MathUtils.lerp(drone.position.z, targetZ, 0.05);
          
          // Hover bobbing
          drone.position.y = 25.0 + Math.sin(clock * 2.0 + idx) * 0.5;

          // Align drone roll/pitch into flight direction
          drone.rotation.y = -angle;
          drone.rotation.x = Math.sin(angle) * 0.08;
          drone.rotation.z = -Math.cos(angle) * 0.08;
        }
      });

      // Update dynamic straight signal beams from selected house to drones
      const houseGroup = scene.getObjectByName(selectedHouseRef.current.id);
      if (houseGroup) {
        // Selected house position (indicator height ~13.5)
        const hPos = new THREE.Vector3(houseGroup.position.x, 13.5, houseGroup.position.z);
        
        DEFAULT_DRONES.forEach((d, idx) => {
          const drone = dronesRef.current.get(d.id);
          if (drone) {
            const dPos = new THREE.Vector3(drone.position.x, drone.position.y - 0.5, drone.position.z);
            
            // 1. Update the straight line geometry
            const lineMesh = scene.getObjectByName(`line_${d.id}`) as THREE.Line;
            if (lineMesh) {
              const pos = lineMesh.geometry.attributes.position;
              pos.setXYZ(0, hPos.x, hPos.y, hPos.z);
              pos.setXYZ(1, dPos.x, dPos.y, dPos.z);
              pos.needsUpdate = true;
              lineMesh.computeLineDistances(); // required for dashed lines
            }
            
            // 2. Update the position of the moving dots (packets) along the line
            for (let i = 0; i < 5; i++) {
              const dotMesh = scene.getObjectByName(`dot_${d.id}_${i}`) as THREE.Mesh;
              if (dotMesh) {
                // Determine phase. We use clock for animation phase
                let phase = (clock * 0.5 + i / 5) % 1.0;
                
                // Lerp between house and drone
                const currentPos = new THREE.Vector3().lerpVectors(hPos, dPos, phase);
                dotMesh.position.copy(currentPos);
                
                // Fade out near the ends for smooth appearance
                if (dotMesh.material instanceof THREE.MeshBasicMaterial) {
                  const edgeFade = Math.sin(phase * Math.PI); // peak at center, 0 at ends
                  dotMesh.material.opacity = isSimulatingRef.current ? (edgeFade * 0.7) : (edgeFade * 0.12);
                }
              }
            }
          }
        });
      }

      // Camera look target smoothing
      currentCamLookAt.current.lerp(
        new THREE.Vector3(targetCamPos.current.x, 0, targetCamPos.current.z), 
        0.03
      );
      setCameraCoords();

      renderer.render(scene, camera);
    };
    animate();

    // Clean up
    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      mount.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      mount.removeEventListener('wheel', onWheel);
      
      // dispose geometries/materials
      groundGeo.dispose();
      groundMat.dispose();
      waterGeo.dispose();
      waterMat.dispose();
      ripGeo.dispose(); // Wait, ripGeo? Let's check below. Ah, it's ripMesh's geometry, which we will dispose
      ripMesh.geometry.dispose();
      ripMat.dispose();
      
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // helper to dispose geometry
  const ripGeo = new THREE.RingGeometry(0.5, 2.0, 32);

  // ------------------------------------------------------------------
  // TDoA Animation Sequence Execution (Step 1 to Step 5)
  // ------------------------------------------------------------------
  const triggerSimulation = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    isSimulatingRef.current = true;
    setStats(null);


    // 1. Clear previous curves and markers
    if (hyperbolasGroupRef.current) {
      while(hyperbolasGroupRef.current.children.length > 0){
        const child = hyperbolasGroupRef.current.children[0] as THREE.Line;
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
        hyperbolasGroupRef.current.remove(child);
      }
    }
    if (convergenceMarkerRef.current) {
      while(convergenceMarkerRef.current.children.length > 0){
        const child = convergenceMarkerRef.current.children[0];
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
        convergenceMarkerRef.current.remove(child);
      }
    }

    // Hide drone laser beams
    beamsRef.current.forEach(beam => {
      if (beam.material instanceof THREE.MeshBasicMaterial) {
        beam.material.opacity = 0.0;
      }
    });

    const houseCoords = latLonToThree(selectedHouse.lat, selectedHouse.lon);
    
    // Smoothly focus camera lookAt on target house
    targetCamPos.current = { x: houseCoords.x, y: 150, z: houseCoords.z };

    // --- STEP 1: Ripple outward from survivor ---
    setAnimationStep('Step 1/5: Signal pulse ripple outward...');
    
    const ripple = rippleRef.current;
    if (ripple) {
      ripple.position.set(houseCoords.x, 4.1, houseCoords.z); // rest at water level
      ripple.scale.set(0.1, 0.1, 0.1);
      if (ripple.material instanceof THREE.MeshBasicMaterial) {
        ripple.material.opacity = 1.0;
        ripple.material.color.setHex(0x00f0ff);
      }

      gsap.to(ripple.scale, {
        x: 120, y: 120, z: 120, // expanding ~1200 meters in simulation
        duration: 2.0,
        ease: 'power1.out'
      });
      gsap.to(ripple.material, {
        opacity: 0.0,
        duration: 2.0,
        ease: 'power1.out'
      });
    }

    // Wait for ripple to spread
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get current actual positions of the 3 drones
    const droneList = DEFAULT_DRONES.map(d => {
      const grp = dronesRef.current.get(d.id);
      // Map Three.js coords (X, Z) back to lat/lon for the solver
      // X = (lon - LON_CENTER) * 111139 * cos(lat_center) / 10
      // Z = -(lat - LAT_CENTER) * 111320 / 10
      const currentX = grp ? grp.position.x : 0;
      const currentZ = grp ? grp.position.z : 0;
      
      const lon = LON_CENTER + (currentX * 10) / (111139.0 * Math.cos(LAT_CENTER * Math.PI / 180));
      const lat = LAT_CENTER - (currentZ * 10) / 111320.0;
      
      return { id: d.id, lat, lon };
    });

    // Make API Call or local calculation fallback
    let data;
    try {
      const response = await fetch('http://localhost:8000/api/ai/tdoa-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drones: droneList,
          trueSurvivorPos: [selectedHouse.lat, selectedHouse.lon],
          noiseStdNs: 10.0,
          seed: 42
        })
      });
      if (response.ok) {
        data = await response.json();
      } else {
        throw new Error('API failure');
      }
    } catch (e) {
      console.warn("FastAPI offline. Running local Javascript TDoA solver...", e);
      // Run local solver fallback
      const arrivalTimes = droneList.map(d => {
        const dist = haversineDistanceJS(d.lat, d.lon, selectedHouse.lat, selectedHouse.lon);
        const t_true = dist / C;
        // add 10ns timing noise
        const noise = (Math.random() - 0.5) * 20e-9;
        return t_true + noise;
      });

      const solverRes = solveTDoAJS(droneList, arrivalTimes);
      const est_pos: [number, number] = [solverRes.estLat, solverRes.estLon];
      const error_m = haversineDistanceJS(selectedHouse.lat, selectedHouse.lon, est_pos[0], est_pos[1]);

      const beaconId = `B-TDOA-${Math.floor(Math.random() * 900 + 100)}`;
      const confidence = error_m < 20 ? 'high' : error_m < 100 ? 'medium' : 'low';
      
      // Generate hyperbolas
      const areaCenter = {
        lat: droneList.reduce((sum, d) => sum + d.lat, 0) / droneList.length,
        lon: droneList.reduce((sum, d) => sum + d.lon, 0) / droneList.length
      };

      const hyperbolas: any = {};
      const pairs = [
        { a: 0, b: 1, key: 'Drone-A-Drone-B' },
        { a: 0, b: 2, key: 'Drone-A-Drone-C' },
        { a: 1, b: 2, key: 'Drone-B-Drone-C' }
      ];
      for (const { a, b, key } of pairs) {
        const dt = arrivalTimes[a] - arrivalTimes[b];
        hyperbolas[key] = generateHyperbolaJS(droneList[a], droneList[b], dt, areaCenter);
      }

      data = {
        drones: droneList,
        arrivalTimes,
        estimatedPosition: est_pos,
        truePosition: [selectedHouse.lat, selectedHouse.lon],
        errorMeters: error_m,
        beacon: {
          beacon_id: beaconId,
          lat: est_pos[0],
          lon: est_pos[1],
          confidence,
          source: 'tdoa_drone_triangulation_local',
          timestamp: new Date().toISOString(),
          estimated_error_meters: error_m
        },
        hyperbolas
      };
    }

    // Update stats readout
    const pairwiseDts = [
      { pair: 'Alpha - Beta', dt: (data.arrivalTimes[0] - data.arrivalTimes[1]) * 1e9 },
      { pair: 'Alpha - Gamma', dt: (data.arrivalTimes[0] - data.arrivalTimes[2]) * 1e9 },
      { pair: 'Beta - Gamma', dt: (data.arrivalTimes[1] - data.arrivalTimes[2]) * 1e9 }
    ];

    setStats({
      arrivalTimes: data.arrivalTimes,
      pairwiseDts,
      errorMeters: data.errorMeters,
      estPos: data.estimatedPosition,
      truePos: data.truePosition
    });

    // --- STEP 2: Drones flash and show timestamps in sequence ---
    setAnimationStep('Step 2/5: Signal logged by drone sensors sequentially...');

    // Sort drones based on arrival times to animate in actual order
    const droneOrder = data.arrivalTimes.map((t: number, i: number) => ({ id: droneList[i].id, t, idx: i }))
      .sort((a: any, b: any) => a.t - b.t);

    for (let index = 0; index < droneOrder.length; index++) {
      const { id, t } = droneOrder[index];
      const dMesh = dronesRef.current.get(id);
      const bMesh = beamsRef.current.get(id);

      if (dMesh && bMesh) {
        // Volumetric signal beam flash
        if (bMesh.material instanceof THREE.MeshBasicMaterial) {
          bMesh.material.opacity = 0.5;
          gsap.to(bMesh.material, { opacity: 0.1, duration: 1.0 });
        }

        // Drone LED flashing yellow
        const led = dMesh.children.find(c => c instanceof THREE.Mesh && c.material !== bMesh.material) as THREE.Mesh;
        if (led && led.material instanceof THREE.MeshStandardMaterial) {
          const originalColor = led.material.color.getHex();
          led.material.color.setHex(0xffaa00);
          led.material.emissive.setHex(0xff8800);
          led.material.emissiveIntensity = 4.0;
          
          gsap.to(led.material.color, {
            r: ((originalColor >> 16) & 255) / 255,
            g: ((originalColor >> 8) & 255) / 255,
            b: (originalColor & 255) / 255,
            duration: 1.5
          });
          gsap.to(led.material.emissive, {
            r: ((originalColor >> 16) & 255) / 255,
            g: ((originalColor >> 8) & 255) / 255,
            b: (originalColor & 255) / 255,
            duration: 1.5
          });
          gsap.to(led.material, { emissiveIntensity: 1.8, duration: 1.5 });
        }
      }

      await new Promise(resolve => setTimeout(resolve, 800));
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // --- STEP 3: Hyperbola curves draw themselves one at a time ---
    setAnimationStep('Step 3/5: Tracing geometric hyperbolas...');

    const colors = [0x00f0ff, 0x00ff88, 0xa78bfa]; // Cyan, Emerald, Purple
    const keys = ['Drone-A-Drone-B', 'Drone-A-Drone-C', 'Drone-B-Drone-C'];
    const pairLabels = ['Pair: Alpha - Beta', 'Pair: Alpha - Gamma', 'Pair: Beta - Gamma'];

    for (let k = 0; k < keys.length; k++) {
      const key = keys[k];
      
      // Get the two drones for this pair to construct the baseline
      const pairDrones = key.split('-');
      const dAMesh = dronesRef.current.get(pairDrones[0]);
      const dBMesh = dronesRef.current.get(pairDrones[1]);
      
      const dA_pos = dAMesh ? { x: dAMesh.position.x, z: dAMesh.position.z } : { x: 0, z: 0 };
      const dB_pos = dBMesh ? { x: dBMesh.position.x, z: dBMesh.position.z } : { x: 0, z: 0 };
      
      // Get the corresponding pairwise time difference
      const firstIdx = k === 0 ? 0 : k === 1 ? 0 : 1;
      const secondIdx = k === 0 ? 1 : k === 1 ? 2 : 2;
      const dt = data.arrivalTimes[firstIdx] - data.arrivalTimes[secondIdx];
      
      // Generate perfectly smooth parametric points in Three.js space
      const threePoints = getHyperbolaPointsParametric(dA_pos, dB_pos, dt, 150);


      const hyperbolaGeo = new THREE.BufferGeometry().setFromPoints(threePoints);
      const hyperbolaMat = new THREE.LineBasicMaterial({
        color: colors[k],
        linewidth: 2,
        transparent: true,
        opacity: 0.8
      });

      const line = new THREE.Line(hyperbolaGeo, hyperbolaMat);
      
      // Animate draw range
      hyperbolaGeo.setDrawRange(0, 0);
      hyperbolasGroupRef.current?.add(line);

      const animationObj = { progress: 0 };
      await new Promise<void>(resolve => {
        gsap.to(animationObj, {
          progress: 1.0,
          duration: 1.2,
          ease: 'power1.inOut',
          onUpdate: () => {
            const count = Math.floor(animationObj.progress * threePoints.length);
            hyperbolaGeo.setDrawRange(0, count);
          },
          onComplete: () => {
            resolve();
          }
        });
      });

      await new Promise(resolve => setTimeout(resolve, 400));
    }

    // --- STEP 4: Convergence point highlight ---
    setAnimationStep('Step 4/5: Computing multilateration intersection point...');
    
    const estCoords = latLonToThree(data.estimatedPosition[0], data.estimatedPosition[1]);

    // Animate camera focusing closely on the convergence point
    targetCamPos.current = { x: estCoords.x, y: 80, z: estCoords.z };

    // Draw glowing crosshair circle
    const ringGeo = new THREE.RingGeometry(0.1, 4.0, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff3b30, // Bright Red-Crimson accent
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const markerRing = new THREE.Mesh(ringGeo, ringMat);
    markerRing.rotation.x = -Math.PI / 2;
    markerRing.position.set(estCoords.x, 4.4, estCoords.z);
    convergenceMarkerRef.current?.add(markerRing);

    // Draw vertical laser target cylinder beam
    const targetBeamGeo = new THREE.CylinderGeometry(0.5, 0.5, 50.0, 16, 1, true);
    const targetBeamMat = new THREE.MeshBasicMaterial({
      color: 0xff3b30,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const targetBeam = new THREE.Mesh(targetBeamGeo, targetBeamMat);
    targetBeam.position.set(estCoords.x, 29.4, estCoords.z);
    convergenceMarkerRef.current?.add(targetBeam);

    // Animate convergence markers appearing
    gsap.to(ringMat, { opacity: 0.9, duration: 0.5 });
    gsap.to(targetBeamMat, { opacity: 0.4, duration: 0.5 });

    // Ripple effect on marker
    gsap.to(markerRing.scale, {
      x: 1.8, y: 1.8, z: 1.8,
      duration: 1.0,
      repeat: -1,
      yoyo: true
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    // --- STEP 5: Geotag & append to beacon list ---
    setAnimationStep('Step 5/5: Estimated location geotagged! Beacon dispatched.');
    
    const newBeacon: BeaconRecord = {
      beacon_id: data.beacon.beacon_id,
      lat: data.beacon.lat,
      lon: data.beacon.lon,
      confidence: data.beacon.confidence,
      source: data.beacon.source,
      timestamp: new Date().toLocaleTimeString(),
      estimated_error_meters: data.beacon.estimated_error_meters,
      targetUser: selectedUser
    };

    setBeacons(prev => [newBeacon, ...prev]);

    // Hold visual convergence view for a second, then restore camera zoom out
    await new Promise(resolve => setTimeout(resolve, 1000));
    targetCamPos.current = { x: 0, y: 180, z: 120 };
    
    setIsSimulating(false);
    isSimulatingRef.current = false;
    setAnimationStep('Done - Estimation Completed');
  };


  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: '#05070c' }}>
      
      {/* Simulation Header Overlay */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(7, 10, 18, 0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radio size={20} color="var(--accent-cyan)" className="animate-pulse" />
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              TDoA Geolocation Triangulation
            </h1>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Multilateration engine solving time-difference-of-arrival of RF beacons across swarm networks.
          </p>
        </div>

        {/* Current sequence step indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-subtle)',
          padding: '6px 14px',
          borderRadius: '6px'
        }}>
          <div className={`live-dot ${isSimulating ? 'yellow animate-ping' : 'green'}`} />
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: isSimulating ? 'var(--accent-amber)' : 'var(--text-main)' }}>
            STATUS: {isSimulating ? animationStep.toUpperCase() : 'AWAITING TRIGGER'}
          </span>
        </div>
      </div>

      {/* Main Workspace split panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Left Area: 3D Visualization */}
        <div style={{ flex: 1, position: 'relative', height: '100%' }}>
          {/* ThreeJS container */}
          <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />

          {/* Interactive floating map overlay controls */}
          <div style={{
            position: 'absolute',
            top: 14,
            left: 14,
            background: 'rgba(5, 8, 15, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-subtle)',
            padding: '10px 14px',
            borderRadius: '6px',
            pointerEvents: 'none',
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Compass size={12} />
              <span>NAVIGATION INFO</span>
            </div>
            <span>• Drag left-click to orbit camera</span>
            <span>• Scroll wheel to zoom in / out</span>
            <span>• Selected House: <span style={{ color: '#fff' }}>{selectedHouse.name}</span></span>
          </div>

          {/* Flooded Status HUD Indicator */}
          <div style={{
            position: 'absolute',
            bottom: 14,
            left: 14,
            background: 'rgba(10, 20, 40, 0.75)',
            border: '1px solid rgba(0, 240, 255, 0.25)',
            padding: '8px 12px',
            borderRadius: '4px',
            pointerEvents: 'none',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            color: 'var(--accent-cyan)'
          }}>
            🌊 GROUND LEVEL FLOOD WATER: 40m (50% Submerged)
          </div>
        </div>

        {/* Right Area: Control & Stats Panels */}
        <div style={{
          width: '380px',
          borderLeft: '1px solid var(--border-subtle)',
          background: 'rgba(6, 9, 15, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: '20px',
          gap: '20px'
        }}>
          
          {/* PANEL A: Target Geolocation Selector */}
          <div className="glass-panel" style={{ padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Wifi size={16} color="var(--accent-cyan)" />
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                RF Transmitter Selection
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  SELECT TARGET HOUSE
                </label>
                <select 
                  value={selectedHouse.id} 
                  onChange={(e) => handleHouseChange(e.target.value)}
                  disabled={isSimulating}
                  style={{
                    width: '100%',
                    background: '#0c101a',
                    border: '1px solid var(--border-subtle)',
                    padding: '8px',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-heading)',
                    outline: 'none'
                  }}
                >
                  {HOUSES.map(h => (
                    <option key={h.id} value={h.id}>{h.name} ({h.survivorsCount} Trapped)</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  ACTIVE WIRELESS NODE (SMARTPHONE)
                </label>
                <select 
                  value={selectedUser} 
                  onChange={(e) => setSelectedUser(e.target.value)}
                  disabled={isSimulating}
                  style={{
                    width: '100%',
                    background: '#0c101a',
                    border: '1px solid var(--border-subtle)',
                    padding: '8px',
                    borderRadius: '6px',
                    color: 'var(--accent-cyan)',
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none'
                  }}
                >
                  {selectedHouse.networks.filter(n => n.device === 'smartphone').map(n => (
                    <option key={n.username} value={n.username}>{n.username} (WiFi Beacon)</option>
                  ))}
                </select>
              </div>

              <button
                onClick={triggerSimulation}
                disabled={isSimulating}
                style={{
                  width: '100%',
                  marginTop: '12px',
                  background: isSimulating ? 'rgba(0, 240, 255, 0.05)' : 'linear-gradient(135deg, var(--accent-cyan) 0%, #00a8ff 100%)',
                  color: isSimulating ? 'var(--accent-cyan)' : '#000',
                  border: isSimulating ? '1px solid rgba(0, 240, 255, 0.3)' : 'none',
                  padding: '12px',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: isSimulating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.25s ease'
                }}
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    <span>SIMULATING SOLVER...</span>
                  </>
                ) : (
                  <>
                    <Play size={16} fill="#000" />
                    <span>TRIGGER TDoA SIGNAL</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* PANEL B: Solver Stats Readout (The math verification) */}
          <div className="glass-panel" style={{ padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={16} color="var(--accent-cyan)" />
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Numerical Solver Stats
                </h2>
              </div>
              <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', background: 'rgba(0,240,255,0.08)', color: 'var(--accent-cyan)', padding: '2px 6px', borderRadius: '4px' }}>
                σ = 10.0ns
              </span>
            </div>

            {stats ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                
                {/* Raw Arrival Times */}
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '6px', fontWeight: 'bold' }}>
                    🛰️ RAW SIGNAL ARRIVAL TIMES (t_true + jitter)
                  </div>
                  {stats.arrivalTimes.map((t, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                      <span style={{ color: 'var(--text-main)' }}>{DEFAULT_DRONES[i].id}:</span>
                      <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                        {(t * 1e6).toFixed(4)} μs
                      </span>
                    </div>
                  ))}
                </div>

                {/* Pairwise Differences */}
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '6px', fontWeight: 'bold' }}>
                    ⏱️ PAIRWISE TIME DIFFERENCES (dt)
                  </div>
                  {stats.pairwiseDts.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                      <span style={{ color: 'var(--text-main)' }}>{p.pair}:</span>
                      <span style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>
                        {p.dt > 0 ? '+' : ''}{p.dt.toFixed(2)} ns
                      </span>
                    </div>
                  ))}
                </div>

                {/* Geolocation Coordinate Delta */}
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Estimated Pos:</span>
                    <span style={{ color: '#fff' }}>({stats.estPos[0].toFixed(5)}, {stats.estPos[1].toFixed(5)})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>True Target Pos:</span>
                    <span style={{ color: '#fff' }}>({stats.truePos[0].toFixed(5)}, {stats.truePos[1].toFixed(5)})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>POSITION ERROR:</span>
                    <span style={{ color: 'var(--accent-crimson)', fontWeight: 'bold', fontSize: '0.8rem' }}>
                      {stats.errorMeters.toFixed(2)} meters
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                <Info size={24} style={{ margin: '0 auto 6px', opacity: 0.3 }} />
                <span>Awaiting signal trigger to execute least-squares multilateration solver.</span>
              </div>
            )}
          </div>

          {/* PANEL C: Beacon Received Feed (Matching Digital Twin list styling) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="var(--accent-cyan)" />
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Beacon Received Feed
                </h2>
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                {beacons.length} Beacons Logged
              </span>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              paddingRight: '2px'
            }}>
              {beacons.length === 0 ? (
                <div style={{
                  padding: '24px 12px',
                  textAlign: 'center',
                  color: 'var(--text-dim)',
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: '6px',
                  fontSize: '0.75rem'
                }}>
                  No geotagged beacons logged in this session yet.
                </div>
              ) : (
                beacons.map((b) => (
                  <div
                    key={b.beacon_id}
                    style={{
                      padding: '12px',
                      background: 'rgba(13, 18, 28, 0.7)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      borderLeft: b.confidence === 'high' ? '3px solid var(--accent-emerald)' : '3px solid var(--accent-amber)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                        📟 {b.beacon_id}
                      </span>
                      <span style={{ 
                        fontSize: '0.62rem', 
                        padding: '1px 5px', 
                        borderRadius: '3px',
                        fontWeight: 'bold',
                        background: b.confidence === 'high' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 184, 0, 0.1)',
                        color: b.confidence === 'high' ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                        textTransform: 'uppercase'
                      }}>
                        {b.confidence} Conf
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                      <span>Target Node: <strong style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{b.targetUser}</strong></span>
                      <span>{b.timestamp}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '2px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '6px' }}>
                      <MapPin size={11} color="var(--accent-crimson)" />
                      <span>{b.lat.toFixed(5)}°N, {b.lon.toFixed(5)}°E</span>
                      <span style={{ marginLeft: 'auto', color: 'var(--accent-crimson)', fontWeight: 'bold' }}>
                        ±{b.estimated_error_meters.toFixed(1)}m
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default TDoASimulation3D;
