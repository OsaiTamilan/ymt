// TV detection utilities

/**
 * Detects if the current device is a Smart TV
 * @returns {boolean} True if the device is a Smart TV
 */
export function isSmartTV() {
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    userAgent.includes('smart-tv') || 
    userAgent.includes('tv') || 
    userAgent.includes('android tv') || 
    userAgent.includes('hbbtv') || 
    userAgent.includes('netcast') || 
    userAgent.includes('viera') || 
    userAgent.includes('webos') ||
    userAgent.includes('tizen')
  );
}

/**
 * Logs device information for debugging
 */
export function logDeviceInfo() {
  console.log(`Is Smart TV: ${isSmartTV()}`);
  console.log(`User Agent: ${navigator.userAgent}`);
}