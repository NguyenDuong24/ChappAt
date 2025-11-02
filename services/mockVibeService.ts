import { UserVibe, Vibe, PREDEFINED_VIBES } from '@/types/vibe';

// Mock data for development/fallback when indexes are building
export class MockVibeService {
  private static mockVibes: UserVibe[] = [
    {
      id: 'mock1',
      userId: 'user1',
      vibeId: 'happy',
      vibe: PREDEFINED_VIBES.find(v => v.id === 'happy')!,
      customMessage: 'Cảm thấy rất vui hôm nay!',
      createdAt: { toMillis: () => Date.now() - 1000 * 60 * 30 }, // 30 min ago
      expiresAt: { toMillis: () => Date.now() + 1000 * 60 * 60 * 23 }, // 23 hours from now
      isActive: true,
      location: {
        latitude: 10.7769,
        longitude: 106.7009,
        address: 'Quận 1, TP.HCM'
      }
    },
    {
      id: 'mock2',
      userId: 'user2',
      vibeId: 'coffee',
      vibe: PREDEFINED_VIBES.find(v => v.id === 'coffee')!,
      customMessage: 'Ai muốn đi cà phê không?',
      createdAt: { toMillis: () => Date.now() - 1000 * 60 * 15 }, // 15 min ago
      expiresAt: { toMillis: () => Date.now() + 1000 * 60 * 60 * 23.5 },
      isActive: true,
      location: {
        latitude: 10.7800,
        longitude: 106.7050,
        address: 'Quận 3, TP.HCM'
      }
    },
    {
      id: 'mock3',
      userId: 'user3',
      vibeId: 'romantic',
      vibe: PREDEFINED_VIBES.find(v => v.id === 'romantic')!,
      customMessage: 'Ngắm hoàng hôn cùng ai đó 💕',
      createdAt: { toMillis: () => Date.now() - 1000 * 60 * 45 }, // 45 min ago
      expiresAt: { toMillis: () => Date.now() + 1000 * 60 * 60 * 22.5 },
      isActive: true,
      location: {
        latitude: 10.7850,
        longitude: 106.7100,
        address: 'Quận 7, TP.HCM'
      }
    }
  ];

  static getMockNearbyVibes(userLocation: { latitude: number; longitude: number }): UserVibe[] {
    // Return mock data for nearby vibes
    return this.mockVibes.filter(vibe => vibe.isActive);
  }

  static getMockVibesByCategory(category: string): UserVibe[] {
    return this.mockVibes.filter(vibe => 
      vibe.isActive && vibe.vibe.category === category
    );
  }

  static getMockVibeStats() {
    return {
      totalVibes: this.mockVibes.length,
      popularVibes: [
        { vibe: PREDEFINED_VIBES.find(v => v.id === 'happy')!, count: 15 },
        { vibe: PREDEFINED_VIBES.find(v => v.id === 'coffee')!, count: 12 },
        { vibe: PREDEFINED_VIBES.find(v => v.id === 'romantic')!, count: 8 }
      ],
      recentActivity: [...this.mockVibes].sort((a, b) => 
        (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
      )
    };
  }

  static addMockVibe(userId: string, vibe: Vibe, customMessage?: string, location?: any): UserVibe {
    const newVibe: UserVibe = {
      id: `mock_${Date.now()}`,
      userId,
      vibeId: vibe.id,
      vibe,
      customMessage: customMessage || '',
      createdAt: { toMillis: () => Date.now() },
      expiresAt: { toMillis: () => Date.now() + 24 * 60 * 60 * 1000 },
      isActive: true,
      location
    };

    // Remove old active vibes for this user
    this.mockVibes = this.mockVibes.map(v => 
      v.userId === userId ? { ...v, isActive: false } : v
    );

    // Add new vibe
    this.mockVibes.push(newVibe);

    return newVibe;
  }
}
