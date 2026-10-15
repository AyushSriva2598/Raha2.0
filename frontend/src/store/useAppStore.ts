// Zustand Global Store for Glacial Threat Early Warning (Raha / Avalon)
import { create } from 'zustand';
import {
  AlertLevel,
  EventLog,
  Lake,
  LakeAssessment,
  SafePoint,
  SosContact,
  SosResponse,
  UserProfile,
} from '@/types';
import { apiClient } from '@/services/api';
import { TRANSLATIONS, Translations, LanguageCode } from '@/i18n/translations';

import { LakeId, LakeConfig, LAKES_REGISTRY } from '@/constants/lakes';
import { DownstreamReachConfig, DOWNSTREAM_REACHES } from '@/constants/downstreamReaches';

interface AppState {
  // Core State
  alertLevel: AlertLevel;
  activeAssessment: LakeAssessment | null;
  lakes: Lake[];
  events: EventLog[];
  safePoints: SafePoint[];
  selectedSafePoint: SafePoint | null;
  userProfile: UserProfile | null;
  language: LanguageCode;
  isLoading: boolean;
  error: string | null;

  // Multi-Lake & Downstream Reach State
  activeLakeId: LakeId;
  activeLake: LakeConfig;
  activeReach: DownstreamReachConfig;
  surgeMinutesRemaining: number;
  mapViewMode: 'TACTICAL_2D' | 'BASIN_3D';
  sosDelayMode: 'instant' | '3s_delay';
  isSimulatingBreach: boolean;

  // UI Interactive States
  mapMode: 'EVACUATE' | 'NAVIGATE';
  targetPerson: 'ME' | 'OTHER';
  isLegendOpen: boolean;
  isSosModalOpen: boolean;
  isAddContactModalOpen: boolean;
  sosBroadcastResult: SosResponse | null;

  // Actions
  init: () => Promise<void>;
  setActiveLakeId: (lakeId: LakeId) => void;
  setMapViewMode: (mode: 'TACTICAL_2D' | 'BASIN_3D') => void;
  setSosDelayMode: (mode: 'instant' | '3s_delay') => void;
  setSimulatingBreach: (active: boolean) => void;
  decrementSurgeMinutes: () => void;
  resetSurgeCountdown: () => void;
  setAlertLevel: (level: AlertLevel) => Promise<void>;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  setMapMode: (mode: 'EVACUATE' | 'NAVIGATE') => void;
  setTargetPerson: (person: 'ME' | 'OTHER') => void;
  toggleLegend: () => void;
  setSelectedSafePoint: (safePoint: SafePoint | null) => void;
  toggleContact: (contactId: string) => Promise<void>;
  addEmergencyContact: (contact: Omit<SosContact, 'contactId'>) => Promise<void>;
  openSosModal: (open: boolean) => void;
  openAddContactModal: (open: boolean) => void;
  triggerEmergencySos: () => Promise<SosResponse>;
  t: () => Translations;
}

export const useAppStore = create<AppState>((set, get) => ({
  alertLevel: 'CLEAR',
  activeAssessment: null,
  lakes: [],
  events: [],
  safePoints: [],
  selectedSafePoint: null,
  userProfile: null,
  language: 'en',
  isLoading: false,
  error: null,

  // Multi-Lake & Downstream Reach Initial State
  activeLakeId: 'imja_tsho',
  activeLake: LAKES_REGISTRY.imja_tsho,
  activeReach: DOWNSTREAM_REACHES.imja_tsho,
  surgeMinutesRemaining: 42,
  mapViewMode: 'TACTICAL_2D',
  sosDelayMode: '3s_delay',
  isSimulatingBreach: false,

  mapMode: 'EVACUATE',
  targetPerson: 'ME',
  isLegendOpen: false,
  isSosModalOpen: false,
  isAddContactModalOpen: false,
  sosBroadcastResult: null,

  setActiveLakeId: (lakeId: LakeId) => {
    const lake = LAKES_REGISTRY[lakeId] || LAKES_REGISTRY.imja_tsho;
    const reach = DOWNSTREAM_REACHES[lakeId] || DOWNSTREAM_REACHES.imja_tsho;
    set({
      activeLakeId: lakeId,
      activeLake: lake,
      activeReach: reach,
      surgeMinutesRemaining: lake.surgeMinutesToSettlement,
    });
  },

  setMapViewMode: (mode: 'TACTICAL_2D' | 'BASIN_3D') => {
    set({ mapViewMode: mode });
  },

  setSosDelayMode: (mode: 'instant' | '3s_delay') => {
    set({ sosDelayMode: mode });
  },

  setSimulatingBreach: (active: boolean) => {
    set({ isSimulatingBreach: active });
  },

  decrementSurgeMinutes: () => {
    set((state) => ({
      surgeMinutesRemaining: Math.max(0, state.surgeMinutesRemaining - 1),
    }));
  },

  resetSurgeCountdown: () => {
    const activeLake = get().activeLake;
    set({ surgeMinutesRemaining: activeLake.surgeMinutesToSettlement });
  },

  init: async () => {
    try {
      set({ isLoading: true, error: null });
      const [assessment, lakes, events, safePoints, profile] = await Promise.all([
        apiClient.getActiveAssessment(),
        apiClient.getLakes(),
        apiClient.getEventLogs(),
        apiClient.getSafePoints(),
        apiClient.getUserProfile(),
      ]);

      set({
        activeAssessment: assessment,
        alertLevel: assessment.level,
        lakes,
        events,
        safePoints,
        selectedSafePoint: safePoints.find((s) => s.isRecommended) || safePoints[0] || null,
        userProfile: profile,
        language: profile.language || 'en',
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to initialize app',
      });
    }
  },

  setAlertLevel: async (level: AlertLevel) => {
    try {
      const assessment = await apiClient.updateThreatLevel(level);
      const events = await apiClient.getEventLogs(level);
      set({
        alertLevel: level,
        activeAssessment: assessment,
        events,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to switch alert level' });
    }
  },

  setLanguage: async (lang: LanguageCode) => {
    set({ language: lang });
    const profile = get().userProfile;
    if (profile) {
      await apiClient.updateUserProfile({ language: lang });
      set({ userProfile: { ...profile, language: lang } });
    }
  },

  setMapMode: (mode: 'EVACUATE' | 'NAVIGATE') => {
    set({ mapMode: mode });
  },

  setTargetPerson: (person: 'ME' | 'OTHER') => {
    set({ targetPerson: person });
  },

  toggleLegend: () => {
    set((state) => ({ isLegendOpen: !state.isLegendOpen }));
  },

  setSelectedSafePoint: (safePoint: SafePoint | null) => {
    set({ selectedSafePoint: safePoint });
  },

  toggleContact: async (contactId: string) => {
    const profile = get().userProfile;
    if (!profile) return;
    const target = profile.contacts.find((c) => c.contactId === contactId);
    if (!target) return;

    const nextState = !target.isActive;
    await apiClient.toggleContactDispatch(contactId, nextState);
    const updatedContacts = profile.contacts.map((c) =>
      c.contactId === contactId ? { ...c, isActive: nextState } : c
    );
    set({ userProfile: { ...profile, contacts: updatedContacts } });
  },

  addEmergencyContact: async (contactData) => {
    const newContact = await apiClient.addEmergencyContact(contactData);
    const profile = get().userProfile;
    if (profile) {
      set({
        userProfile: {
          ...profile,
          contacts: [...profile.contacts, newContact],
        },
        isAddContactModalOpen: false,
      });
    }
  },

  openSosModal: (open: boolean) => {
    set({ isSosModalOpen: open });
  },

  openAddContactModal: (open: boolean) => {
    set({ isAddContactModalOpen: open });
  },

  triggerEmergencySos: async () => {
    const { userProfile, alertLevel } = get();
    const activeContactIds = (userProfile?.contacts || [])
      .filter((c) => c.isActive)
      .map((c) => c.contactId);

    const response = await apiClient.triggerEmergencySos({
      userId: userProfile?.userId || 'usr-anonymous',
      latitude: 27.892,
      longitude: 86.83,
      elevationM: userProfile?.elevationM || 4410,
      batteryPct: 88,
      networkStatus: 'IRIDIUM_SATELLITE_HYBRID',
      alertLevel,
      timestamp: new Date().toISOString(),
      recipientContactIds: activeContactIds,
    });

    set({ sosBroadcastResult: response });
    return response;
  },

  t: () => {
    const lang = get().language;
    return TRANSLATIONS[lang] || TRANSLATIONS.en;
  },
}));
