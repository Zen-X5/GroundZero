import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Drone, Survivor, NetworkTopology, BuildingInspection } from '../types';
import { getSocket } from '../services/socket';

const API_BASE = 'http://localhost:3000';
const AI_BASE = 'http://localhost:8000';

export const groundZeroApi = createApi({
  reducerPath: 'groundZeroApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE }),
  tagTypes: ['Drones', 'Survivors', 'Topology', 'Buildings', 'Hazards'],
  endpoints: (builder) => ({
    // 1. Drones Telemetry with Real-Time WebSocket Streaming Cache Update
    getDrones: builder.query<Drone[], void>({
      query: () => '/drones',
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ callsign }) => ({ type: 'Drones' as const, id: callsign })),
            { type: 'Drones', id: 'LIST' },
          ]
          : [{ type: 'Drones', id: 'LIST' }],
      async onCacheEntryAdded(
        _arg,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved },
      ) {
        const socket = getSocket();
        try {
          await cacheDataLoaded;
          const telemetryListener = (drone: Drone) => {
            updateCachedData((draft) => {
              const idx = draft.findIndex((d) => d.callsign === drone.callsign);
              if (idx >= 0) {
                draft[idx] = { ...draft[idx], ...drone };
              } else {
                draft.push(drone);
              }
            });
          };

          socket.on('telemetry:drone', telemetryListener);
          socket.on('state:initial', (data) => {
            if (data?.drones) {
              updateCachedData(() => data.drones);
            }
          });
        } catch {
          // Cache entry removed
        }
        await cacheEntryRemoved;
      },
    }),

    // 2. Survivors Rescue Queue with Real-Time WebSocket Cache Invalidation & Streaming
    getSurvivors: builder.query<Survivor[], void>({
      query: () => '/survivors',
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ code }) => ({ type: 'Survivors' as const, id: code })),
            { type: 'Survivors', id: 'LIST' },
          ]
          : [{ type: 'Survivors', id: 'LIST' }],
      async onCacheEntryAdded(
        _arg,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved },
      ) {
        const socket = getSocket();
        try {
          await cacheDataLoaded;
          const detectionListener = (survivor: Survivor) => {
            updateCachedData((draft) => {
              const idx = draft.findIndex((s) => s.code === survivor.code);
              if (idx >= 0) {
                draft[idx] = { ...draft[idx], ...survivor };
              } else {
                draft.unshift(survivor);
              }
              draft.sort((a, b) => (a.rescuePriorityRank || 999) - (b.rescuePriorityRank || 999));
            });
          };

          socket.on('detection:survivor', detectionListener);
          socket.on('state:initial', (data) => {
            if (data?.survivors) {
              updateCachedData(() => data.survivors);
            }
          });
        } catch {
          // Cache entry removed
        }
        await cacheEntryRemoved;
      },
    }),

    // 3. Network Topology with Tag Caching
    getTopology: builder.query<NetworkTopology, void>({
      query: () => '/network/topology',
      providesTags: ['Topology'],
      async onCacheEntryAdded(
        _arg,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved },
      ) {
        const socket = getSocket();
        try {
          await cacheDataLoaded;
          socket.on('mesh:topology', (top: NetworkTopology) => {
            updateCachedData(() => top);
          });
          socket.on('state:initial', (data) => {
            if (data?.topology) {
              updateCachedData(() => data.topology);
            }
          });
        } catch { }
        await cacheEntryRemoved;
      },
    }),

    // 4. Buildings Openings Inspection with Tag Caching
    getBuildings: builder.query<BuildingInspection[], void>({
      query: () => '/buildings',
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ name }) => ({ type: 'Buildings' as const, id: name })),
            { type: 'Buildings', id: 'LIST' },
          ]
          : [{ type: 'Buildings', id: 'LIST' }],
    }),

    // 5. Upsert Survivor Detection Mutation (Invalidates Survivor Tag Cache)
    upsertSurvivor: builder.mutation<Survivor, Partial<Survivor>>({
      query: (body) => ({
        url: '/survivors/detection',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Survivors', id: 'LIST' }],
    }),

    // 6. Simulation Trigger Mutation (Invalidates Cache Across Drones & Survivors)
    triggerAiSimulation: builder.mutation<any, void>({
      queryFn: async () => {
        try {
          const res = await fetch(`${AI_BASE}/api/ai/seed-phase1-demo`, {
            method: 'POST',
          });
          const data = await res.json();
          return { data };
        } catch (e) {
          // Fallback to direct mock detection via backend
          const mockSurvivor = {
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
          const data = await res.json();
          return { data };
        }
      },
      invalidatesTags: [
        { type: 'Survivors', id: 'LIST' },
        { type: 'Drones', id: 'LIST' },
        'Topology',
      ],
    }),
  }),
});

export const {
  useGetDronesQuery,
  useGetSurvivorsQuery,
  useGetTopologyQuery,
  useGetBuildingsQuery,
  useUpsertSurvivorMutation,
  useTriggerAiSimulationMutation,
} = groundZeroApi;
