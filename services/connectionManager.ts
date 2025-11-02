import { Unsubscribe } from 'firebase/firestore';

interface ConnectionInfo {
  unsubscribe: Unsubscribe;
  lastActivity: number;
  roomId: string;
  type: 'messages' | 'status' | 'typing' | 'presence';
}

class ConnectionManager {
  private connections = new Map<string, ConnectionInfo>();
  private readonly MAX_CONNECTIONS = 10;
  private readonly INACTIVE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveConnections();
    }, 60 * 1000); // Check every minute
  }

  // Add a new connection
  addConnection(key: string, unsubscribe: Unsubscribe, roomId: string, type: ConnectionInfo['type']) {
    // Remove existing connection if exists
    this.removeConnection(key);

    // Check if we're at the limit
    if (this.connections.size >= this.MAX_CONNECTIONS) {
      this.removeOldestConnection();
    }

    this.connections.set(key, {
      unsubscribe,
      lastActivity: Date.now(),
      roomId,
      type
    });

    console.log('📡 Connection added:', key, 'Total:', this.connections.size);
  }

  // Register a listener with automatic connection management
  registerListener(key: string, unsubscribe: Unsubscribe, roomId: string = 'global', type: ConnectionInfo['type'] = 'messages') {
    this.addConnection(key, unsubscribe, roomId, type);
    return unsubscribe;
  }

  // Remove a specific connection
  removeConnection(key: string): boolean {
    const connection = this.connections.get(key);
    if (connection) {
      connection.unsubscribe();
      this.connections.delete(key);
      console.log('📡 Connection removed:', key, 'Total:', this.connections.size);
      return true;
    }
    return false;
  }

  // Update activity for a connection
  updateActivity(key: string) {
    const connection = this.connections.get(key);
    if (connection) {
      connection.lastActivity = Date.now();
    }
  }

  // Remove connections for a specific room
  removeRoomConnections(roomId: string) {
    const keysToRemove: string[] = [];
    
    this.connections.forEach((connection, key) => {
      if (connection.roomId === roomId) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(key => this.removeConnection(key));
    console.log('📡 Removed', keysToRemove.length, 'connections for room:', roomId);
  }

  // Clean up inactive connections
  private cleanupInactiveConnections() {
    const now = Date.now();
    const keysToRemove: string[] = [];

    this.connections.forEach((connection, key) => {
      if (now - connection.lastActivity > this.INACTIVE_TIMEOUT) {
        keysToRemove.push(key);
      }
    });

    if (keysToRemove.length > 0) {
      keysToRemove.forEach(key => this.removeConnection(key));
      console.log('🧹 Cleaned up', keysToRemove.length, 'inactive connections');
    }
  }

  // Remove oldest connection when at limit
  private removeOldestConnection() {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    this.connections.forEach((connection, key) => {
      if (connection.lastActivity < oldestTime) {
        oldestTime = connection.lastActivity;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.removeConnection(oldestKey);
      console.log('🚫 Removed oldest connection due to limit');
    }
  }

  // Get connection stats
  getStats() {
    const stats = {
      total: this.connections.size,
      byType: new Map<string, number>(),
      byRoom: new Map<string, number>(),
      oldestConnection: 0,
      newestConnection: 0
    };

    let oldest = Date.now();
    let newest = 0;

    this.connections.forEach((connection) => {
      // Count by type
      const typeCount = stats.byType.get(connection.type) || 0;
      stats.byType.set(connection.type, typeCount + 1);

      // Count by room
      const roomCount = stats.byRoom.get(connection.roomId) || 0;
      stats.byRoom.set(connection.roomId, roomCount + 1);

      // Track oldest/newest
      if (connection.lastActivity < oldest) {
        oldest = connection.lastActivity;
      }
      if (connection.lastActivity > newest) {
        newest = connection.lastActivity;
      }
    });

    stats.oldestConnection = oldest;
    stats.newestConnection = newest;

    return stats;
  }

  // Cleanup all connections
  cleanup() {
    this.connections.forEach((connection) => {
      connection.unsubscribe();
    });
    this.connections.clear();

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    console.log('📡 All connections cleaned up');
  }

  // Get active connections for debugging
  getActiveConnections(): string[] {
    return Array.from(this.connections.keys());
  }

  // Check if a connection exists
  hasConnection(key: string): boolean {
    return this.connections.has(key);
  }

  // Priority cleanup - remove non-essential connections
  priorityCleanup() {
    const nonEssentialTypes: ConnectionInfo['type'][] = ['typing', 'presence'];
    const keysToRemove: string[] = [];

    this.connections.forEach((connection, key) => {
      if (nonEssentialTypes.includes(connection.type)) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(key => this.removeConnection(key));
    console.log('🚨 Priority cleanup removed', keysToRemove.length, 'non-essential connections');
  }
}

export default new ConnectionManager();
