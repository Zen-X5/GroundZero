import xml.etree.ElementTree as ET

def get_buildings():
    try:
        tree = ET.parse('d:/GroundZero/simulation/worlds/disaster_night_world.sdf')
        root = tree.getroot()
        world = root.find('world')
        for model in world.findall('model'):
            name = model.get('name')
            if name and ('building' in name or 'house' in name or 'commercial' in name):
                pose = model.find('pose')
                if pose is not None:
                    print(f"Name: {name}, Pose: {pose.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    get_buildings()
