from langchain_core.tools import tool
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

db_client = None

async def get_db():
    """Returns a singleton MongoDB database instance."""
    global db_client
    if not db_client:
        db_client = AsyncIOMotorClient(settings.MONGODB_URI)
    return db_client["groundZero"]

@tool
async def get_high_priority_survivors(threshold: int = 80) -> str:
    """Queries the Ground-Zero live database for survivors with a Risk Score above the threshold. 
    Use this when you need to know where the most critical victims are located to deploy rescue teams."""
    try:
        db = await get_db()
        cursor = db.survivors.find({"riskScore": {"$gt": threshold}}).sort("riskScore", -1)
        survivors = await cursor.to_list(length=50)
        
        if not survivors:
            return f"No survivors found with a risk score above {threshold}."
            
        res = []
        for s in survivors:
            pos = s.get("globalPosition", {})
            res.append(
                f"- {s.get('survivorCode')} (Risk: {s.get('riskScore')}): "
                f"Located in {s.get('sector')} at Coordinates (x: {pos.get('x')}m, y: {pos.get('y')}m)."
            )
        return "\n".join(res)
    except Exception as e:
        return f"Database error while querying survivors: {str(e)}"

@tool
async def get_drone_status(callsign: str) -> str:
    """Fetches the live status, battery percentage, and precise coordinates of a specific drone by its callsign.
    Valid callsigns are drone_1, drone_2, and drone_3. Use this to check on the swarm's health or location."""
    try:
        db = await get_db()
        drone = await db.drones.find_one({"callsign": callsign.lower()})
        
        if not drone:
            return f"Could not find any telemetry for drone '{callsign}'. It may be disconnected or offline."
            
        pos = drone.get("position", {})
        status_lines = [
            f"Drone {callsign.upper()} Status: {drone.get('status')}",
            f"Battery: {drone.get('batteryPercentage')}%",
            f"Sector Assignment: {drone.get('sector')}",
            f"Live Position: (x: {pos.get('x')}m, y: {pos.get('y')}m, altitude: {pos.get('z')}m)",
            f"Heading: {drone.get('heading')} degrees"
        ]
        return "\n".join(status_lines)
    except Exception as e:
        return f"Database error while querying drone telemetry: {str(e)}"

@tool
async def get_building_status(building_id: str) -> str:
    """Fetches the structural status and estimated survivor occupancy for a specific building.
    Valid building IDs are usually like 'urban_building_1_apartments', 'urban_building_5_clinic'.
    Use this when asked about the condition of a specific structure."""
    try:
        db = await get_db()
        # Create an index on buildingId if it doesn't exist, but search by buildingId
        bld = await db.buildings.find_one({"buildingId": building_id.lower()})
        if not bld:
            # Fallback to loose text matching
            bld = await db.buildings.find_one({"buildingId": {"$regex": building_id.lower()}})
            
        if not bld:
            return f"Could not find any structural data for building '{building_id}'."
            
        return (f"Building: {bld.get('buildingId')}\n"
                f"Occupancy Probability: {bld.get('occupancyProbability', 0) * 100}%\n"
                f"Inspection Progress: {bld.get('inspectionProgress', 0) * 100}%\n"
                f"Clear Voids: {bld.get('clearVoids', 0)}\n"
                f"Total Accessible Voids: {bld.get('totalAccessibleVoids', 0)}")
    except Exception as e:
        return f"Database error querying building: {str(e)}"

@tool
async def get_network_topology() -> str:
    """Checks the MANET (Mobile Ad-Hoc Network) topology to see if the swarm is fully connected or if nodes are isolated."""
    try:
        db = await get_db()
        # Since topology is often single document or updated continuously
        drones = await db.drones.find().to_list(length=10)
        disconnected = []
        connected = []
        for d in drones:
            # Look at connectedPeers or lastHeartbeat
            peers = d.get("connectedPeers", [])
            if not peers or len(peers) == 0:
                disconnected.append(d.get('callsign'))
            else:
                connected.append(d.get('callsign'))
        
        return (f"MANET Network Status:\n"
                f"Connected Nodes: {', '.join(connected) if connected else 'None'}\n"
                f"Isolated/Disconnected Nodes: {', '.join(disconnected) if disconnected else 'None'}")
    except Exception as e:
        return f"Database error querying network topology: {str(e)}"

@tool
async def get_sector_summary(sector_name: str) -> str:
    """Returns a high-level situation report (sit-rep) for a specific sector (e.g., 'SECTOR_A', 'SECTOR_B', 'SECTOR_C').
    Provides survivor counts and drone coverage."""
    try:
        db = await get_db()
        sector_upper = sector_name.upper()
        
        survivors_count = await db.survivors.count_documents({"sector": sector_upper})
        drones_in_sector = await db.drones.find({"sector": sector_upper}).to_list(length=10)
        
        drone_names = [d.get("callsign") for d in drones_in_sector]
        
        return (f"Sector {sector_upper} Sit-Rep:\n"
                f"Total Detected Survivors: {survivors_count}\n"
                f"Drones Patrolling Sector: {', '.join(drone_names) if drone_names else 'None assigned'}")
    except Exception as e:
        return f"Database error querying sector summary: {str(e)}"

# List of tools to bind to the LangGraph LLM later
AGENT_TOOLS = [
    get_high_priority_survivors, 
    get_drone_status, 
    get_building_status, 
    get_network_topology, 
    get_sector_summary
]
