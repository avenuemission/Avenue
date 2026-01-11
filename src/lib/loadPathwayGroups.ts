export interface PathwayGroup {
  id: number;
  name: string;
  coordinates: [number, number];
  time: string;
  coordinator: string;
  phone: string;
}

export async function loadPathwayGroups(): Promise<PathwayGroup[]> {
  try {
    const response = await fetch("/data/pathway_groups.csv");
    const csvText = await response.text();
    
    const lines = csvText.trim().split("\n");
    const headers = lines[0].split(",");
    
    const groups: PathwayGroup[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",");
      if (values.length >= 7) {
        groups.push({
          id: parseInt(values[0]),
          name: values[1],
          coordinates: [parseFloat(values[2]), parseFloat(values[3])],
          time: values[4],
          coordinator: values[5],
          phone: values[6],
        });
      }
    }
    
    return groups;
  } catch (error) {
    console.error("Error loading pathway groups:", error);
    return [];
  }
}
