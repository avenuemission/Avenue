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

// Parse CSV line handling quoted fields properly
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

// Legacy CSV loader (kept as fallback)
async function loadPathwayGroupsFromCSV(): Promise<PathwayGroup[]> {
  try {
    const response = await fetch("/data/pathway_groups.csv");
    const csvText = await response.text();
    const lines = csvText.trim().split("\n");
    const groups: PathwayGroup[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length >= 9) {
        groups.push({
          id: parseInt(values[0]),
          name: values[1],
          coordinates: [parseFloat(values[2]), parseFloat(values[3])],
          time: values[4],
          coordinator: values[5],
          phone: values[6],
          running: values[7] === "1",
          description: values[8] || "",
        });
      }
    }
    return groups;
  } catch (error) {
    console.error("Error loading pathway groups CSV:", error);
    return [];
  }
}

export async function loadPathwayGroups(): Promise<PathwayGroup[]> {
  try {
    const response = await fetch("/api/content/pathway-groups");
    if (!response.ok) throw new Error("Pathway groups API failed");
    const json = await response.json();
    const raw = json.groups as Array<Record<string, unknown>>;
    const groups = (raw || []).map((g) => ({
      id: Number(g.id),
      name: String(g.name),
      coordinates: [Number(g.latitude), Number(g.longitude)] as [number, number],
      time: String(g.time || ""),
      coordinator: String(g.coordinator || ""),
      phone: String(g.phone || ""),
      running: Boolean(g.running),
      description: String(g.description || ""),
    }));
    if (groups.length > 0) return groups;
  } catch (error) {
    console.error("Supabase pathway groups failed, falling back to CSV:", error);
  }

  return loadPathwayGroupsFromCSV();
}
