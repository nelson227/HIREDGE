import { config } from '../config/env';

const DAILY_API_URL = 'https://api.daily.co/v1';

export class DailyService {
  private apiKey: string;

  constructor() {
    this.apiKey = config.daily.apiKey;
  }

  private get isConfigured(): boolean {
    return this.apiKey.length > 5;
  }

  /**
   * Create a Daily.co room for a video call.
   */
  async createRoom(params: {
    name?: string;
    expiryMinutes?: number;
    maxParticipants?: number;
  }): Promise<{ url: string; name: string; token?: string } | null> {
    if (!this.isConfigured) {
      return { url: `https://meet.jit.si/hiredge-${Date.now()}`, name: 'fallback-jitsi', token: undefined };
    }

    const expiry = Math.round(Date.now() / 1000) + (params.expiryMinutes || 60) * 60;

    const response = await fetch(`${DAILY_API_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        name: params.name || `hiredge-${Date.now()}`,
        properties: {
          exp: expiry,
          max_participants: params.maxParticipants || 10,
          enable_chat: true,
          enable_screenshare: true,
          enable_recording: 'local',
        },
      }),
    });

    if (!response.ok) {
      console.error('[Daily] Room creation failed:', response.status);
      return null;
    }

    const room = await response.json();
    return { url: room.url, name: room.name };
  }

  /**
   * Create a meeting token for a specific room.
   */
  async createToken(roomName: string, params: {
    userName?: string;
    isOwner?: boolean;
    expiryMinutes?: number;
  }): Promise<string | null> {
    if (!this.isConfigured) return null;

    const expiry = Math.round(Date.now() / 1000) + (params.expiryMinutes || 60) * 60;

    const response = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_name: params.userName,
          is_owner: params.isOwner || false,
          exp: expiry,
        },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.token;
  }

  /**
   * Delete a room.
   */
  async deleteRoom(roomName: string): Promise<boolean> {
    if (!this.isConfigured) return false;

    const response = await fetch(`${DAILY_API_URL}/rooms/${encodeURIComponent(roomName)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    return response.ok;
  }
}

export const dailyService = new DailyService();
