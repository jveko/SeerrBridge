import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Define types for regex presets
export type RegexPreset = {
  id: string;
  name: string;
  pattern: string;
  isDefault: boolean;
  description?: string;
};

// Default regex presets
const DEFAULT_PRESETS: RegexPreset[] = [
  {
    id: "default",
    name: "Default Regex",
    pattern: "^(?!.*【.*?】)(?!.*[\\u0400-\\u04FF])(?!.*\\[esp\\]).*",
    isDefault: true,
    description: "Filters out entries with specific patterns"
  },
  {
    id: "default-resolution",
    name: "Default + 1080p & 2160p",
    pattern: "^(?=.*(1080p|2160p))(?!.*【.*?】)(?!.*[\\u0400-\\u04FF])(?!.*\\[esp\\]).*",
    isDefault: true,
    description: "Default filters plus high resolution content only"
  },
  {
    id: "default-types",
    name: "Default + Torrent Types",
    pattern: "^(?=.*(Remux|BluRay|BDRip|BRRip))(?!.*【.*?】)(?!.*[\\u0400-\\u04FF])(?!.*\\[esp\\]).*",
    isDefault: true,
    description: "Default filters plus high quality formats only"
  },
  {
    id: "default-complete",
    name: "Default with torrent types and resolutions",
    pattern: "^(?=.*(1080p|2160p))(?=.*(Remux|BluRay|BDRip|BRRip))(?!.*【.*?】)(?!.*[\\u0400-\\u04FF])(?!.*\\[esp\\]).*",
    isDefault: true,
    description: "High resolution and high quality formats only"
  },
  {
    id: "resolution-only",
    name: "Resolution Only",
    pattern: "^(?=.*(1080p|2160p)).*",
    isDefault: true,
    description: "Only filter for high resolution content"
  }
];

// Path to store regex presets
const PRESETS_FILE_PATH = path.join(process.cwd(), "data", "regex-presets.json");

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load presets from file, or initialize with defaults
async function loadPresets(): Promise<RegexPreset[]> {
  try {
    await ensureDataDir();
    
    // If file doesn't exist, initialize with defaults
    if (!fs.existsSync(PRESETS_FILE_PATH)) {
      await savePresets(DEFAULT_PRESETS);
      return DEFAULT_PRESETS;
    }
    
    // Read from file
    const data = fs.readFileSync(PRESETS_FILE_PATH, 'utf8');
    const presets: RegexPreset[] = JSON.parse(data);
    
    // Check if we're missing any default presets
    const existingDefaultIds = new Set(
      presets.filter(p => p.isDefault).map(p => p.id)
    );
    
    const missingDefaults = DEFAULT_PRESETS.filter(
      dp => !existingDefaultIds.has(dp.id)
    );
    
    // Add any missing defaults
    if (missingDefaults.length > 0) {
      const updatedPresets = [...presets, ...missingDefaults];
      await savePresets(updatedPresets);
      return updatedPresets;
    }
    
    return presets;
  } catch (error) {
    console.error("Error loading regex presets:", error);
    // If there's an error, return defaults
    return DEFAULT_PRESETS;
  }
}

// Save presets to file
async function savePresets(presets: RegexPreset[]): Promise<boolean> {
  try {
    await ensureDataDir();
    fs.writeFileSync(
      PRESETS_FILE_PATH,
      JSON.stringify(presets, null, 2),
      'utf8'
    );
    return true;
  } catch (error) {
    console.error("Error saving regex presets:", error);
    return false;
  }
}

// GET endpoint - Retrieve all presets
export async function GET(request: NextRequest) {
  try {
    const presets = await loadPresets();
    return NextResponse.json({ presets });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to retrieve regex presets" },
      { status: 500 }
    );
  }
}

// POST endpoint - Add a new preset or update existing ones
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Check if we're updating multiple presets
    if (Array.isArray(data.presets)) {
      // Validate input
      if (!data.presets.every((p: any) => p.id && p.name && p.pattern)) {
        return NextResponse.json(
          { error: "Invalid preset data. Each preset must have id, name, and pattern" },
          { status: 400 }
        );
      }
      
      // Save the updated presets
      await savePresets(data.presets);
      return NextResponse.json({ 
        success: true, 
        message: "Presets updated successfully",
        presets: data.presets
      });
    } 
    // Single preset update/add
    else if (data.preset) {
      const { id, name, pattern, description } = data.preset;
      
      // Validate
      if (!id || !name || !pattern) {
        return NextResponse.json(
          { error: "Invalid preset data. Must include id, name, and pattern" },
          { status: 400 }
        );
      }
      
      // Load existing
      const presets = await loadPresets();
      
      // Check if updating or adding
      const existingIndex = presets.findIndex(p => p.id === id);
      
      if (existingIndex >= 0) {
        // Update existing
        presets[existingIndex] = {
          ...presets[existingIndex],
          name,
          pattern,
          description: description || presets[existingIndex].description
        };
      } else {
        // Add new
        presets.push({
          id,
          name,
          pattern,
          isDefault: false,
          description
        });
      }
      
      // Save
      await savePresets(presets);
      
      return NextResponse.json({ 
        success: true, 
        message: existingIndex >= 0 ? "Preset updated" : "Preset added",
        presets
      });
    }
    
    return NextResponse.json(
      { error: "Invalid request format" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { 
        error: "Failed to save preset",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint - Remove a preset
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { error: "Preset ID is required" },
        { status: 400 }
      );
    }
    
    // Load existing
    const presets = await loadPresets();
    
    // Find the preset
    const presetIndex = presets.findIndex(p => p.id === id);
    
    if (presetIndex < 0) {
      return NextResponse.json(
        { error: "Preset not found" },
        { status: 404 }
      );
    }
    
    // Check if it's a default preset
    if (presets[presetIndex].isDefault) {
      return NextResponse.json(
        { error: "Cannot delete default presets" },
        { status: 403 }
      );
    }
    
    // Remove it
    presets.splice(presetIndex, 1);
    
    // Save
    await savePresets(presets);
    
    return NextResponse.json({ 
      success: true, 
      message: "Preset deleted",
      presets
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete preset" },
      { status: 500 }
    );
  }
} 