import fs from "fs";
import path from "path";
import { 
  LogEntry, 
  LogStatistics, 
  MediaItem, 
  ParsedLogData, 
  ShowSubscription,
  parseLogLines,
  TokenStatusData
} from "./utils";

// Function to extract Real Debrid token information from logs
function extractTokenInfo(lines: string[]): TokenStatusData | null {
  let expiresOn = '';
  let lastRefreshedAt = '';
  let lastCheckedAt = '';
  let status: 'valid' | 'expiring' | 'refreshing' | 'unknown' = 'unknown';
  
  // Process lines in reverse to get the most recent information first
  const reversedLines = [...lines].reverse();
  
  // First, find the most recent token expiry date
  for (const line of reversedLines) {
    if (line.includes("Access token will expire on:")) {
      const match = line.match(/Access token will expire on: (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
      if (match) {
        expiresOn = match[1];
        // Get timestamp from the beginning of the log line
        const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})/);
        if (timestampMatch) {
          lastCheckedAt = timestampMatch[1];
        }
        break;
      }
    }
  }
  
  // If we didn't find an expiry date, return null
  if (!expiresOn) {
    return null;
  }
  
  // Next, check the status after the expiry date information
  for (const line of reversedLines) {
    // Find status information based on the most recent check
    if (line.includes(lastCheckedAt)) {
      if (line.includes("Access token is still valid")) {
        status = 'valid';
        break;
      } else if (line.includes("Access token is about to expire")) {
        status = 'expiring';
        break;
      }
    }
  }
  
  // Finally, find the most recent refresh timestamp
  for (const line of reversedLines) {
    if (line.includes("Successfully refreshed access token")) {
      const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})/);
      if (timestampMatch) {
        lastRefreshedAt = timestampMatch[1];
        break;
      }
    }
  }
  
  return {
    expiresOn,
    lastRefreshedAt,
    status,
    lastCheckedAt
  };
}

export async function parseLogFile(logFilePath: string): Promise<ParsedLogData> {
  try {
    // Check if the file exists
    if (!fs.existsSync(logFilePath)) {
      console.error(`Log file not found at path: ${logFilePath}`);
      return { 
        recentLogs: [],
        statistics: {
          totalLogs: 0,
          successCount: 0,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
          failedEpisodes: 0,
          successfulGrabs: 0,
          criticalErrors: 0,
          tokenStatus: null
        },
        recentSuccesses: [],
        recentFailures: []
      };
    }

    // Get file stats to determine if file is too large for full processing
    const stats = fs.statSync(logFilePath);
    const isLargeFile = stats.size > 2 * 1024 * 1024; // 2MB threshold
    
    let lines: string[] = [];
    let totalLines = 0;
    
    if (isLargeFile) {
      // For large files, use streaming to count statistics without loading entire file
      const fileStream = fs.createReadStream(logFilePath, { encoding: 'utf8' });
      const rl = require('readline').createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });
      
      // Initialize statistics counters
      let successCount = 0;
      let errorCount = 0;
      let warningCount = 0;
      let infoCount = 0;
      let failedEpisodes = 0;
      let successfulGrabs = 0;
      let criticalErrors = 0;
      
      // Collect the last 1000 lines for detailed processing
      const lastLines: string[] = [];
      
      for await (const line of rl) {
        if (line.trim()) {
          totalLines++;
          
          // Update statistics
          if (line.includes("SUCCESS")) successCount++;
          if (line.includes("ERROR")) errorCount++;
          if (line.includes("WARNING")) warningCount++;
          if (line.includes("INFO")) infoCount++;
          if (line.includes("Failed to confirm E") || line.includes("Could not find")) failedEpisodes++;
          if (line.includes("CRITICAL")) criticalErrors++;
          if (line.includes("SUCCESS") && (
            line.includes("RD (100%)") || 
            line.includes("RD (100%) confirmed for") ||
            line.includes("Successfully handled movie") || 
            line.includes("Successfully handled E")
          )) successfulGrabs++;
          
          // Keep only the most recent lines for detailed processing
          lastLines.push(line);
          if (lastLines.length > 1000) {
            lastLines.shift(); // Remove oldest line
          }
        }
      }
      
      // Use only the last 1000 lines for detailed processing
      lines = lastLines;
      
      // Extract token information
      const tokenStatus = extractTokenInfo(lastLines);
      
      // Create statistics object
      const statistics = {
        totalLogs: totalLines,
        successCount,
        errorCount,
        warningCount,
        infoCount,
        failedEpisodes,
        successfulGrabs,
        criticalErrors,
        tokenStatus
      };
      
      const recentLogs = parseLogLines(lines.slice(-100));
      const recentSuccesses = extractMediaItems(lines, "success");
      const recentFailures = extractMediaItems(lines, "error");
      
      return { 
        recentLogs,
        statistics,
        recentSuccesses,
        recentFailures
      };
    } else {
      // For smaller files, original implementation
      const content = await fs.promises.readFile(logFilePath, "utf8");
      lines = content.split("\n").filter(Boolean);
      totalLines = lines.length;
      
      const recentLogs = parseLogLines(lines.slice(-100));
      
      // Count successful grabs based on RD (100%) pattern
      const successfulGrabs = lines.filter(line => 
        (line.includes("SUCCESS") && (
          line.includes("RD (100%)") || 
          line.includes("RD (100%) confirmed for") ||
          line.includes("Successfully handled movie") || 
          line.includes("Successfully handled E")
        ))
      ).length;
      
      // Count critical errors
      const criticalErrors = lines.filter(line => line.includes("CRITICAL")).length;
      
      // Extract token information
      const tokenStatus = extractTokenInfo(lines);
      
      const statistics = {
        totalLogs: lines.length,
        successCount: lines.filter(line => line.includes("SUCCESS")).length,
        errorCount: lines.filter(line => line.includes("ERROR")).length,
        warningCount: lines.filter(line => line.includes("WARNING")).length,
        infoCount: lines.filter(line => line.includes("INFO")).length,
        failedEpisodes: lines.filter(line => 
          line.includes("Failed to confirm E") || 
          line.includes("Could not find")
        ).length,
        successfulGrabs,
        criticalErrors,
        tokenStatus
      };
      
      const recentSuccesses = extractMediaItems(lines, "success");
      const recentFailures = extractMediaItems(lines, "error");
      
      return { 
        recentLogs,
        statistics,
        recentSuccesses,
        recentFailures
      };
    }
  } catch (error) {
    console.error("Error parsing log file:", error);
    return { 
      recentLogs: [],
      statistics: {
        totalLogs: 0,
        successCount: 0,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        failedEpisodes: 0,
        successfulGrabs: 0,
        criticalErrors: 0,
        tokenStatus: null
      },
      recentSuccesses: [],
      recentFailures: []
    };
  }
}

function extractMediaItems(lines: string[], type: "success" | "error"): MediaItem[] {
  const items: MediaItem[] = [];
  const processedTitles = new Set<string>();
  const processedCriticals = new Set<string>();
  
  // Process lines in reverse to get the most recent entries first
  const reversedLines = [...lines].reverse();
  
  // Track related entries for TV show seasons
  const seasonProcessingEntries: { [key: string]: boolean } = {};
  
  for (let i = 0; i < reversedLines.length; i++) {
    const line = reversedLines[i];
    let mediaItem: MediaItem | null = null;
    
    const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}) \|/);
    if (!timestampMatch) continue;
    const timestamp = timestampMatch[1];
    
    // Extract CRITICAL errors
    if (type === "error" && line.includes("CRITICAL")) {
      let errorMessage = "Critical error detected";
      let detailedError = line;
      
      // Find error message - pattern for Selenium error
      if (line.includes("Error during Selenium automation")) {
        const errorMatch = line.match(/Error during Selenium automation: (.+)/);
        if (errorMatch) {
          errorMessage = `Selenium error: ${errorMatch[1].split('\n')[0].trim()}`;
        }
      }
      
      // Look for related stacktrace
      let fullError = detailedError;
      let j = 1;
      // Collect stacktrace and detailed error info
      while (i + j < reversedLines.length && j < 30) {
        const nextLine = reversedLines[i + j];
        if (nextLine.match(/^\d{4}-\d{2}-\d{2}/) && 
           (nextLine.includes("ERROR") || nextLine.includes("WARNING") || nextLine.includes("INFO") || nextLine.includes("SUCCESS"))) {
          break;
        }
        fullError = fullError + "\n" + nextLine;
        j++;
      }
      
      // Find title information from previous lines
      let title = "Unknown media";
      for (let k = 1; k < 20; k++) {
        if (i + k >= reversedLines.length) break;
        
        const prevLine = reversedLines[i + k];
        if (prevLine.includes("Added request to queue for IMDb ID") || 
            prevLine.includes("Processing request for IMDb ID")) {
          const titleMatch = prevLine.match(/Title: (.+?),/);
          if (titleMatch) {
            title = titleMatch[1];
            const mediaType = prevLine.includes("Media Type: tv") ? "tv" : "movie";
            
            // Generate unique ID for this critical error
            const uniqueId = `critical-${title}-${errorMessage.substring(0, 30)}`;
            
            if (!processedCriticals.has(uniqueId)) {
              mediaItem = {
                title,
                type: mediaType,
                status: "critical",
                message: errorMessage,
                detailedError: fullError,
                timestamp
              };
              processedCriticals.add(uniqueId);
            }
            break;
          }
        }
      }
      
      // If no specific title found but still a critical error
      if (!mediaItem && !processedCriticals.has(errorMessage)) {
        mediaItem = {
          title: "System Error",
          type: "movie", // Default to movie for system errors
          status: "critical",
          message: errorMessage,
          detailedError: fullError,
          timestamp
        };
        processedCriticals.add(errorMessage);
      }
    }
    
    // Extract TV show episode failures
    else if (type === "error" && line.includes("ERROR") && line.includes("Failed to confirm E")) {
      const match = line.match(/Failed to confirm (E\d+) for (.+) Season (\d+)/);
      if (match) {
        const [, episode, showTitle, season] = match;
        const uniqueId = `${showTitle}-S${season}E${episode}`;
        
        if (!processedTitles.has(uniqueId)) {
          mediaItem = {
            title: showTitle,
            type: "tv",
            season: parseInt(season),
            episode,
            status: "error",
            message: `Failed to confirm ${episode} (Season ${season})`,
            timestamp
          };
          processedTitles.add(uniqueId);
        }
      }
    }
    
    // Extract movie failures (that aren't critical)
    else if (type === "error" && line.includes("ERROR") && !line.includes("Failed to confirm E")) {
      // Check for "Could not find Movie Title" pattern
      const notFoundMatch = line.match(/Could not find (.+?), since no results were found/);
      if (notFoundMatch) {
        const title = notFoundMatch[1];
        const uniqueId = `movie-notfound-${title}`;
        
        if (!processedTitles.has(uniqueId)) {
          mediaItem = {
            title,
            type: "movie", // These errors are typically for movies
            status: "error",
            message: `No results found for this title`,
            timestamp
          };
          processedTitles.add(uniqueId);
        }
      } else {
        // Look for the previous lines to find the movie title
        for (let j = 1; j < 20; j++) {
          if (i + j >= reversedLines.length) break;
          
          const previousLine = reversedLines[i + j];
          if (previousLine.includes("Added request to queue for IMDb ID") || 
              previousLine.includes("Processing request for IMDb ID")) {
            const titleMatch = previousLine.match(/Title: (.+?),/);
            const typeMatch = previousLine.match(/Media Type: (\w+)/);
            
            if (titleMatch) {
              const title = titleMatch[1];
              const mediaType = typeMatch && typeMatch[1] === "tv" ? "tv" : "movie";
              
              // Check if this is a TV season failure
              if (line.includes("Failed to process individual episodes for")) {
                const showMatch = line.match(/Failed to process individual episodes for (.+) Season (\d+)/);
                if (showMatch) {
                  const [, showTitle, season] = showMatch;
                  const uniqueId = `${showTitle}-S${season}-failure`;
                  
                  if (!processedTitles.has(uniqueId)) {
                    mediaItem = {
                      title: showTitle,
                      type: "tv",
                      season: parseInt(season),
                      status: "error",
                      message: `Failed to process Season ${season}`,
                      timestamp
                    };
                    processedTitles.add(uniqueId);
                  }
                }
              } else {
                // Regular movie/show failure
                const uniqueId = `${mediaType}-${title}`;
                if (!processedTitles.has(uniqueId)) {
                  mediaItem = {
                    title,
                    type: mediaType as "movie" | "tv",
                    status: "error",
                    message: line.includes(":") ? line.split(":").pop()?.trim() || "Processing failed" : "Processing failed",
                    timestamp
                  };
                  processedTitles.add(uniqueId);
                }
              }
              break;
            }
          }
        }
      }
    }
    
    // Extract successful grabs based on RD (100%) pattern
    else if (type === "success" && line.includes("SUCCESS") && 
            (line.includes("RD (100%)") || line.includes("Successfully handled"))) {
      
      // Check for season success
      if (line.includes("RD (100%) button detected.")) {
        // Look for pattern like: RD (100%) button detected. 1 Regular.Show.S08.WEBRip.EAC3.2.0.1080p.x265-PoF. This entry is complete.
        const seasonMatch = line.match(/RD \(100%\) button detected\. \d+ (.+?)S(\d+).+?\. This entry is complete\./i);
        
        if (seasonMatch) {
          const rawTitle = seasonMatch[1].replace(/\./g, ' ').trim();
          const season = seasonMatch[2];
          const uniqueId = `${rawTitle}-S${season}`;
          
          // Skip this success if there was a failure message for the same season
          const seasonFailureKey = `${rawTitle}-S${season}-failure`;
          if (!processedTitles.has(uniqueId) && !processedTitles.has(seasonFailureKey)) {
            // Mark this season as processed
            seasonProcessingEntries[uniqueId] = true;
            
            mediaItem = {
              title: rawTitle,
              type: "tv",
              season: parseInt(season),
              status: "success",
              message: `Successfully processed Season ${season}`,
              timestamp
            };
            processedTitles.add(uniqueId);
          }
        } 
        // Otherwise it's likely a movie
        else {
          const movieMatch = line.match(/RD \(100%\) button detected\. \d+ (.+?)\. This entry is complete\./);
          if (movieMatch) {
            let rawTitle = movieMatch[1];
            // Clean up the title from filename
            let cleanTitle = rawTitle.replace(/\(\d{4}\).*/i, '').replace(/\.\d{4}\..*/i, '').replace(/\./g, ' ').trim();
            
            // Check for a more accurate title from earlier logs
            for (let j = 1; j < 20; j++) {
              if (i + j >= reversedLines.length) break;
              
              const previousLine = reversedLines[i + j];
              if (previousLine.includes("Processing request for IMDb ID")) {
                const titleMatch = previousLine.match(/Title: (.+?),/);
                if (titleMatch) {
                  cleanTitle = titleMatch[1];
                  break;
                }
              }
            }
            
            const uniqueId = `movie-${cleanTitle}`;
            if (!processedTitles.has(uniqueId)) {
              mediaItem = {
                title: cleanTitle,
                type: "movie",
                status: "success",
                message: "Successfully processed movie",
                timestamp
              };
              processedTitles.add(uniqueId);
            }
          }
        }
      }
      
      // RD (100%) confirmed for episode
      else if (line.includes("RD (100%) confirmed for E")) {
        const episodeMatch = line.match(/RD \(100%\) confirmed for (E\d+)\. Episode fully processed\./);
        if (episodeMatch) {
          const episode = episodeMatch[1];
          
          // Find the show and season this episode belongs to
          for (let j = 1; j < 20; j++) {
            if (i + j >= reversedLines.length) break;
            
            const previousLine = reversedLines[i + j];
            if (previousLine.includes("Searching for")) {
              const titleMatch = previousLine.match(/Searching for (.+) Season (\d+)/);
              if (titleMatch) {
                const [, showTitle, season] = titleMatch;
                const uniqueId = `${showTitle}-S${season}${episode}`;
                
                if (!processedTitles.has(uniqueId)) {
                  mediaItem = {
                    title: showTitle,
                    type: "tv",
                    season: parseInt(season),
                    episode,
                    status: "success",
                    message: `Successfully processed ${episode} (Season ${season})`,
                    timestamp
                  };
                  processedTitles.add(uniqueId);
                }
                break;
              }
            }
          }
        }
      }
      
      // Successfully handled episode or movie
      else if (line.includes("Successfully handled")) {
        if (line.includes("Successfully handled E")) {
          const match = line.match(/Successfully handled (E\d+) in box/);
          if (match) {
            const episode = match[1];
            
            // Look for the show title in the previous lines
            for (let j = 1; j < 10; j++) {
              if (i + j >= reversedLines.length) break;
              
              const previousLine = reversedLines[i + j];
              if (previousLine.includes("Searching for")) {
                const titleMatch = previousLine.match(/Searching for (.+) Season (\d+) (E\d+)/);
                if (titleMatch) {
                  const [, showTitle, season] = titleMatch;
                  const uniqueId = `${showTitle}-S${season}${episode}`;
                  
                  if (!processedTitles.has(uniqueId)) {
                    mediaItem = {
                      title: showTitle,
                      type: "tv",
                      season: parseInt(season),
                      episode,
                      status: "success",
                      message: `Successfully processed ${episode} (Season ${season})`,
                      timestamp
                    };
                    processedTitles.add(uniqueId);
                  }
                  break;
                }
              }
            }
          }
        } else if (line.includes("Successfully handled movie")) {
          for (let j = 1; j < 20; j++) {
            if (i + j >= reversedLines.length) break;
            
            const previousLine = reversedLines[i + j];
            if (previousLine.includes("Added request to queue") || previousLine.includes("Processing movie")) {
              const titleMatch = previousLine.match(/Title: (.+?)[,\.]/);
              if (titleMatch) {
                const title = titleMatch[1];
                const uniqueId = `movie-${title}`;
                
                if (!processedTitles.has(uniqueId)) {
                  mediaItem = {
                    title,
                    type: "movie",
                    status: "success",
                    message: "Successfully processed movie",
                    timestamp
                  };
                  processedTitles.add(uniqueId);
                }
                break;
              }
            }
          }
        }
      }
    }
    
    if (mediaItem) {
      items.push(mediaItem);
    }
  }
  
  return items;
}

export async function readEnvFile(filePath: string): Promise<Record<string, string>> {
  try {
    const content = await fs.promises.readFile(filePath, "utf8");
    const lines = content.split("\n").filter(Boolean);
    
    const envVars: Record<string, string> = {};
    
    for (const line of lines) {
      // Skip comments and empty lines
      if (line.startsWith("#") || line.trim() === "") continue;
      
      const [key, ...valueParts] = line.split("=");
      const value = valueParts.join("=");
      
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    }
    
    return envVars;
  } catch (error) {
    console.error("Error reading env file:", error);
    return {};
  }
}

export async function writeEnvFile(filePath: string, envVars: Record<string, string>): Promise<boolean> {
  try {
    // First read the current file to preserve comments and formatting
    const currentContent = await fs.promises.readFile(filePath, "utf8");
    const lines = currentContent.split("\n");
    
    const updatedLines = lines.map(line => {
      // Skip comments and empty lines
      if (line.startsWith("#") || line.trim() === "") return line;
      
      const [key] = line.split("=");
      
      if (key && key.trim() in envVars) {
        return `${key.trim()}=${envVars[key.trim()]}`;
      }
      
      return line;
    });
    
    // Add any new variables that weren't in the original file
    for (const [key, value] of Object.entries(envVars)) {
      if (!lines.some(line => line.startsWith(`${key}=`))) {
        updatedLines.push(`${key}=${value}`);
      }
    }
    
    await fs.promises.writeFile(filePath, updatedLines.join("\n"));
    return true;
  } catch (error) {
    console.error("Error writing env file:", error);
    return false;
  }
}

export async function readDiscrepanciesFile(filePath: string): Promise<ShowSubscription[]> {
  try {
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.error(`Discrepancies file not found at path: ${filePath}`);
      return [];
    }

    console.log(`Found discrepancies file at: ${filePath}`);
    
    // Get file stats to check size
    const stats = fs.statSync(filePath);
    console.log(`Reading file: ${filePath}`);
    
    // For large files (>5MB), use stream parsing to avoid memory issues
    if (stats.size > 5 * 1024 * 1024) {
      // Use streaming JSON parser for large files
      try {
        // Read in smaller chunks
        const fileContent = await new Promise<string>((resolve, reject) => {
          let content = '';
          const stream = fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 1024 * 64 }); // 64KB chunks
          
          stream.on('data', (chunk) => {
            content += chunk;
          });
          
          stream.on('end', () => {
            resolve(content);
          });
          
          stream.on('error', (err) => {
            reject(err);
          });
        });
        
        console.log(`File content length: ${fileContent.length} characters`);
        
        let data;
        try {
          data = JSON.parse(fileContent);
          console.log(`Parsed data structure: ${typeof data}, is object: ${typeof data === 'object'}`);
          
          // Check if data has a 'discrepancies' property (the actual structure)
          if (data && typeof data === 'object' && 'discrepancies' in data && Array.isArray(data.discrepancies)) {
            console.log(`Found discrepancies array with ${data.discrepancies.length} items`);
            data = data.discrepancies; // Use the array inside the discrepancies key
          } else if (Array.isArray(data)) {
            console.log(`Found direct array with ${data.length} items`);
          } else {
            console.error("Unexpected data structure:", data);
            return [];
          }
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          return [];
        }
        
        // Process and return the data
        return Array.isArray(data) ? data : [];
      } catch (streamError) {
        console.error("Error streaming discrepancies file:", streamError);
        return [];
      }
    } else {
      // Original implementation for smaller files
      const content = await fs.promises.readFile(filePath, "utf8");
      console.log(`File content length: ${content.length} characters`);
      
      let data;
      try {
        data = JSON.parse(content);
        console.log(`Parsed data structure: ${typeof data}, is object: ${typeof data === 'object'}`);
        
        // Check if data has a 'discrepancies' property (the actual structure)
        if (data && typeof data === 'object' && 'discrepancies' in data && Array.isArray(data.discrepancies)) {
          console.log(`Found discrepancies array with ${data.discrepancies.length} items`);
          data = data.discrepancies; // Use the array inside the discrepancies key
        } else if (Array.isArray(data)) {
          console.log(`Found direct array with ${data.length} items`);
        } else {
          console.error("Unexpected data structure:", data);
          return [];
        }
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        return [];
      }
      
      // Process and return the data
      return Array.isArray(data) ? data : [];
    }
  } catch (error) {
    console.error("Error reading discrepancies file:", error);
    return [];
  }
} 