import { Drone, Survivor, NetworkTopology, BuildingInspection } from '../types';

const API_BASE = 'http://localhost:3000';
const AI_BASE = 'http://localhost:8000';

export async function fetchDrones(): Promise<Drone[]> {
  const res = await fetch(`${API_BASE}/drones`);
  if (!res.ok) throw new Error('Failed to fetch drones');
  return res.json();
}

export async function fetchSurvivors(): Promise<Survivor[]> {
  const res = await fetch(`${API_BASE}/survivors`);
  if (!res.ok) throw new Error('Failed to fetch survivors');
  return res.json();
}

export async function fetchNetworkTopology(): Promise<NetworkTopology> {
  const res = await fetch(`${API_BASE}/network/topology`);
  if (!res.ok) throw new Error('Failed to fetch network topology');
  return res.json();
}

export async function fetchBuildings(): Promise<BuildingInspection[]> {
  const res = await fetch(`${API_BASE}/buildings`);
  if (!res.ok) throw new Error('Failed to fetch buildings');
  return res.json();
}

export async function triggerPhase1AISimulation(): Promise<any> {
  // Trigger AI seed demo endpoint to send live detections to NestJS
  try {
    const res = await fetch(`${AI_BASE}/api/ai/seed-phase1-demo`, {
      method: 'POST',
    });
    return await res.json();
  } catch (e) {
    // If AI service is not running locally, fallback to direct NestJS mock post
    console.warn('AI Service offline, posting direct to NestJS:', e);
    const mockSurvivor: Partial<Survivor> = {
      code: `SURV_LIVE_${Math.floor(Math.random() * 900 + 100)}`,
      globalPosition: { x: 155.0, y: 28.5, z: 3.8 },
      sector: 'SECTOR_C',
      environment: 'WINDOW_VOID',
      confidenceScore: 0.95,
      riskScore: 89.0,
      rescuePriorityRank: 1,
      riskDetails: {
        environmentalThreat: 85,
        mobilityStatus: 90,
        accessibilityScore: 70,
        urgencyMultiplier: 1.2,
        reasoning: ['Trapped in 2nd-floor window opening', 'Rising flood lake (1.0m flood line)'],
      },
      status: 'RESCUE_QUEUED',
      estimatedGroupSize: 2,
    };
    const res = await fetch(`${API_BASE}/survivors/detection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockSurvivor),
    });
    return await res.json();
  }
}
