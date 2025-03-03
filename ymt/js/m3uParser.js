/**
 * Parse M3U playlist content into channel objects
 * @param {string} content - The M3U file content
 * @returns {Array} Array of channel objects
 */
export function parseM3U(content) {
  const lines = content.split('\n');
  const channels = [];
  let currentChannel = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('#EXTINF:')) {
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const titleMatch = line.match(/,(.+)$/);
      const categoryMatch = line.match(/Category="([^"]*)"/);
      const languageMatch = line.match(/Language="([^"]*)"/);
      const channelNoMatch = line.match(/c-no="([^"]*)"/);
      
      if (titleMatch) {
        currentChannel = {
          title: titleMatch[1].trim(),
          logo: logoMatch ? logoMatch[1] : '',
          category: categoryMatch ? categoryMatch[1] : 'Uncategorized',
          language: languageMatch ? languageMatch[1] : 'Unknown',
          channelNo: channelNoMatch ? parseInt(channelNoMatch[1]) : null,
          url: ''
        };
      }
    } else if (line && !line.startsWith('#') && currentChannel) {
      currentChannel.url = line;
      channels.push(currentChannel);
      currentChannel = null;
    }
  }

  return channels;
}

/**
 * Fetch and parse a playlist file
 * @param {string} url - URL of the playlist file
 * @returns {Promise<Array>} Promise resolving to array of channel objects
 */
export async function fetchPlaylist(url) {
  try {
    const response = await fetch(url);
    const data = await response.text();
    return parseM3U(data);
  } catch (error) {
    console.error('Error loading playlist:', error);
    return [];
  }
}