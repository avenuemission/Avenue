export interface PathwayGroup {
  id: number;
  name: string;
  coordinates: [number, number];
  time: string;
  coordinator: string;
  phone: string;
  running: boolean;
  description: string;
}

export async function loadPathwayGroups(): Promise<PathwayGroup[]> {
  try {
    const response = await fetch("/data/pathway_groups.csv");
    const csvText = await response.text();
    
    const lines = csvText.trim().split("\n");
    
    const groups: PathwayGroup[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",");
      if (values.length >= 9) {
        groups.push({
          id: parseInt(values[0]),
          name: values[1],
          coordinates: [parseFloat(values[2]), parseFloat(values[3])],
          time: values[4],
          coordinator: values[5],
          phone: values[6],
          running: values[7] === "1",
          description: values.slice(8).join(","), // Join remaining values in case description has commas
        });
      }
    }
    
    return groups;
  } catch (error) {
    console.error("Error loading pathway groups:", error);
    return [];
  }
}
