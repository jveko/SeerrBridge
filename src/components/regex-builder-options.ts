// Regex builder option categories
export type RegexBuilderCategory = {
  id: string;
  name: string;
  options: RegexBuilderOption[];
};

export type RegexBuilderOption = {
  id: string;
  label: string;
  value: string;
};

// Categories of options for the regex builder
export const REGEX_BUILDER_CATEGORIES: RegexBuilderCategory[] = [
  {
    id: "resolution",
    name: "Resolution",
    options: [
      { id: "2160p", label: "2160p", value: "2160p" },
      { id: "1080p", label: "1080p", value: "1080p" },
      { id: "720p", label: "720p", value: "720p" }
    ]
  },
  {
    id: "source",
    name: "Source Type",
    options: [
      { id: "remux", label: "REMUX", value: "REMUX" },
      { id: "bluray", label: "BluRay", value: "BluRay" },
      { id: "uhd-bluray", label: "UHD BluRay", value: "UHD.BluRay|UHD BluRay" },
      { id: "hybrid", label: "Hybrid", value: "HYBRID|Hybrid" },
      { id: "webdl", label: "WEB-DL", value: "WEB-DL|WEBDL" },
      { id: "webrip", label: "WEBRip", value: "WEBRip" },
      { id: "encode", label: "Encode", value: "ENCODE|Encode" }
    ]
  },
  {
    id: "group",
    name: "Release Group",
    options: [
      { id: "framestor", label: "FraMeSToR", value: "FraMeSToR" },
      { id: "cinephiles", label: "CiNEPHiLES", value: "CiNEPHiLES" },
      { id: "bluranium", label: "BLURANiUM", value: "BLURANiUM" },
      { id: "wildcat", label: "WiLDCAT", value: "WiLDCAT" },
      { id: "3l", label: "3L", value: "3L" },
      { id: "epsilon", label: "EPSiLON", value: "EPSiLON" },
      { id: "kralimarko", label: "KRaLiMaRKo", value: "KRaLiMaRKo" },
      { id: "pmp", label: "PmP", value: "PmP" },
      { id: "tigole", label: "Tigole", value: "Tigole" }
    ]
  },
  {
    id: "audio",
    name: "Audio Format",
    options: [
      { id: "truehd-atmos", label: "TrueHD Atmos", value: "TrueHD.Atmos|TrueHD Atmos" },
      { id: "dts-hd-ma", label: "DTS-HD MA", value: "DTS-HD.MA|DTS-HD MA" },
      { id: "flac", label: "FLAC", value: "FLAC" },
      { id: "aac", label: "AAC", value: "AAC" },
      { id: "dolby-digital", label: "Dolby Digital", value: "Dolby.Digital|DD|AC3" },
      { id: "dts-x", label: "DTS-X", value: "DTS-X|DTS:X" }
    ]
  }
];

// Function to generate regex pattern from selected options
export function generateRegexFromOptions(
  selectedOptions: Record<string, string[]>
): string {
  // Start with the default filters
  const basePattern = "^(?!.*【.*?】)(?!.*[\\u0400-\\u04FF])(?!.*\\[esp\\])";
  
  // Group selections by category
  const patternParts: string[] = [];
  
  // Build each category pattern
  Object.entries(selectedOptions).forEach(([categoryId, values]) => {
    if (values.length > 0) {
      // Join options within a category with OR
      const categoryValues = values.map(val => 
        val.includes("|") ? `(${val})` : val
      ).join("|");
      
      // Add to pattern parts with positive lookahead
      patternParts.push(`(?=.*(${categoryValues}))`);
    }
  });
  
  // If no options are selected, return basic pattern
  if (patternParts.length === 0) {
    return `${basePattern}.*`;
  }
  
  // Combine all parts
  return `${basePattern}${patternParts.join("")}.*`;
} 