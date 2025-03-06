export function parseM3U(content) {
  try {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const entries = [];
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#EXTINF')) {
        const infoLine = lines[i];
        const urlLine = lines[i + 1];
        
        if (!urlLine) {
          console.warn('Missing URL line for EXTINF:', infoLine);
          continue;
        }
        
        // Parse the EXTINF line
        const startTimeMatch = infoLine.match(/start-time="(\d+)"/);
        const endTimeMatch = infoLine.match(/end-time="(\d+)"/);
        const totalTimeMatch = infoLine.match(/total-time="(\d+)"/);
        const streamingTimeMatch = infoLine.match(/streaming-time="(\d{2}:\d{2}:\d{2})"/);
        const titleMatch = infoLine.match(/,\s*(.+)$/);
        
        // Extract video ID from URL
        const urlMatch = urlLine.match(/[?&]v=([^&]+)/);
        const videoId = urlMatch ? urlMatch[1] : null;
        
        if (startTimeMatch && endTimeMatch && totalTimeMatch && titleMatch && videoId) {
          entries.push({
            title: titleMatch[1],
            url: urlLine,
            startTime: parseInt(startTimeMatch[1]),
            endTime: parseInt(endTimeMatch[1]),
            totalTime: parseInt(totalTimeMatch[1]),
            streamingTime: streamingTimeMatch ? streamingTimeMatch[1] : '00:00:00',
            videoId: videoId
          });
        } else {
          console.warn('Invalid entry format:', infoLine);
        }
        
        i++; // Skip the URL line
      }
    }
    
    if (entries.length === 0) {
      throw new Error('No valid entries found in playlist');
    }
    
    return entries;
  } catch (error) {
    throw new Error(`Failed to parse M3U file: ${error.message}`);
  }
}