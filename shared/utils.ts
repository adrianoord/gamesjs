// Function to check rate limits
export function checkRateLimit(socketId: string, event: string, limit: number, timeWindow: number, rateLimits: {[socketId: string]: {[event: string]: number[]}}): boolean {
    if (!rateLimits[socketId]) {
        rateLimits[socketId] = {};
    }
    
    if (!rateLimits[socketId][event]) {
        rateLimits[socketId][event] = [];
    }
    
    const now = Date.now();
    const windowStart = now - timeWindow;
    
    // Remove old timestamps
    rateLimits[socketId][event] = rateLimits[socketId][event].filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (rateLimits[socketId][event].length >= limit) {
        return false;
    }
    
    // Add current timestamp
    rateLimits[socketId][event].push(now);
    return true;
}

// Helper function to validate room ID
export function isValidRoomId(roomId: string): boolean {
    return typeof roomId === 'string' && 
           roomId.length >= 3 && 
           roomId.length <= 20 && 
           /^[a-zA-Z0-9-_]+$/.test(roomId);
}

// Helper function to validate color
export function isValidColor(color: string): boolean {
    const validColors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
    return validColors.includes(color);
}