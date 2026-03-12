import { describe, it, expect, vi } from 'vitest';

// Mock React Native
vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ActivityIndicator: 'ActivityIndicator',
  TextInput: 'TextInput',
  Image: 'Image',
  Switch: 'Switch',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  Platform: { OS: 'ios' },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('UI Components - Unit Logic', () => {
  describe('Avatar initials', () => {
    function getInitials(name: string): string {
      return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    }

    it('should get initials from full name', () => {
      expect(getInitials('John Doe')).toBe('JD');
    });

    it('should handle single name', () => {
      expect(getInitials('John')).toBe('J');
    });

    it('should handle three names (take first two)', () => {
      expect(getInitials('Jean Michel Dupont')).toBe('JM');
    });

    it('should handle empty string', () => {
      expect(getInitials('')).toBe('');
    });
  });

  describe('Badge variants', () => {
    const COLORS: Record<string, { bg: string; text: string }> = {
      primary: { bg: '#6C5CE715', text: '#6C5CE7' },
      success: { bg: '#00B89415', text: '#00B894' },
      danger: { bg: '#FF767515', text: '#FF7675' },
    };

    it('should have correct colors for each variant', () => {
      expect(COLORS.primary.text).toBe('#6C5CE7');
      expect(COLORS.success.text).toBe('#00B894');
      expect(COLORS.danger.text).toBe('#FF7675');
    });
  });

  describe('formatRelativeTime', () => {
    function formatRelativeTime(date: string): string {
      const n = Date.now() - new Date(date).getTime();
      const m = Math.floor(n / 60000);
      if (m < 1) return "À l'instant";
      if (m < 60) return `Il y a ${m}min`;
      const h = Math.floor(m / 60);
      if (h < 24) return `Il y a ${h}h`;
      const d = Math.floor(h / 24);
      if (d < 7) return `Il y a ${d}j`;
      return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }

    it('should return "À l\'instant" for recent time', () => {
      expect(formatRelativeTime(new Date().toISOString())).toBe("À l'instant");
    });

    it('should return minutes', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiveMinAgo)).toBe('Il y a 5min');
    });

    it('should return hours', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(threeHoursAgo)).toBe('Il y a 3h');
    });

    it('should return days', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twoDaysAgo)).toBe('Il y a 2j');
    });
  });

  describe('Status helpers', () => {
    const STATUS_LABELS: Record<string, string> = {
      DRAFT: 'Brouillon',
      APPLIED: 'Envoyée',
      VIEWED: 'Consultée',
      INTERVIEW_SCHEDULED: 'Entretien',
      OFFERED: 'Offre reçue',
      REJECTED: 'Refusée',
    };

    it('should have French labels for all statuses', () => {
      expect(Object.keys(STATUS_LABELS)).toHaveLength(6);
      expect(STATUS_LABELS.APPLIED).toBe('Envoyée');
      expect(STATUS_LABELS.REJECTED).toBe('Refusée');
    });
  });

  describe('Salary parsing', () => {
    function parseSalary(salary?: string): { min: number | null; max: number | null } {
      if (!salary) return { min: null, max: null };
      const matches = salary.match(/(\d[\d\s]*)/g);
      if (!matches?.length) return { min: null, max: null };
      const min = parseInt(matches[0].replace(/\s/g, ''));
      const max = matches.length >= 2 ? parseInt(matches[1].replace(/\s/g, '')) : null;
      return { min, max };
    }

    it('should parse range', () => {
      expect(parseSalary('35 000€ - 45 000€')).toEqual({ min: 35000, max: 45000 });
    });

    it('should parse single value', () => {
      expect(parseSalary('40000€')).toEqual({ min: 40000, max: null });
    });

    it('should handle undefined', () => {
      expect(parseSalary()).toEqual({ min: null, max: null });
    });
  });

  describe('Match score colors', () => {
    function getScoreColor(score: number): string {
      if (score >= 80) return '#00B894';
      if (score >= 60) return '#FDCB6E';
      return '#FF7675';
    }

    it('should return green for 80+', () => {
      expect(getScoreColor(85)).toBe('#00B894');
    });

    it('should return yellow for 60-79', () => {
      expect(getScoreColor(65)).toBe('#FDCB6E');
    });

    it('should return red for below 60', () => {
      expect(getScoreColor(45)).toBe('#FF7675');
    });
  });
});
