import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, type Href, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useState } from 'react';

import {
  getCases,
  getCurrentUser,
  getEvidenceTypes,
  listIncidentEvidence,
  listIncidents,
  type EvidenceResponse,
  type EvidenceTypeResponse,
  type IncidentResponse,
} from '@/services/api';

const captureActions = [
  {
    title: 'Voice\nNote',
    icon: 'mic-outline' as const,
    color: '#4B86C5',
    backgroundColor: '#EEF4FC',
  },
  {
    title: 'Photo\n& Video',
    icon: 'camera-outline' as const,
    color: '#5C9A8E',
    backgroundColor: '#EFF7F4',
  },
  {
    title: 'Written\nNote',
    icon: 'file-document-outline' as const,
    color: '#225963',
    backgroundColor: '#EEF2F2',
  },
];
const evidenceTypeColors: Record<string, string> = {
  written_note: '#75AFA4',
  audio: '#E8B34E',
  video: '#D76670',
};

type RecentEvidenceMoment = {
  color: string;
  evidence: EvidenceResponse;
  incident: IncidentResponse;
  meta: string;
  time: string;
  title: string;
};

function formatEvidenceTitle(typeName: string | undefined, fileName: string) {
  if (typeName === 'written_note') {
    return 'Written note';
  }

  if (typeName === 'audio') {
    return 'Voice note';
  }

  if (typeName === 'video') {
    return fileName.toLowerCase().includes('photo') ? 'Photo evidence' : 'Video evidence';
  }

  return fileName || 'Evidence item';
}

function formatIncidentLabel(incident: IncidentResponse) {
  if (incident.incident_type) {
    return `${incident.incident_type.charAt(0).toUpperCase()}${incident.incident_type.slice(1)} incident`;
  }

  return 'Incident';
}

function formatEvidenceMeta(evidence: EvidenceResponse, incident: IncidentResponse) {
  if (evidence.description) {
    return evidence.description;
  }

  if (incident.location) {
    return `${formatIncidentLabel(incident)} - ${incident.location}`;
  }

  return evidence.file_name || formatIncidentLabel(incident);
}

function evidenceTimelineValue(evidence: EvidenceResponse) {
  return evidence.timestamp_time ?? evidence.created_at;
}

function parseEvidenceTimestamp(value: string) {
  const normalizedValue = value.trim().replace(' ', 'T');
  const timestampParts = normalizedValue.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/
  );

  if (timestampParts) {
    const [, year, month, day, hour, minute, second = '0'] = timestampParts;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    ).getTime();
  }

  const parsedTimestamp = Date.parse(value);
  return Number.isNaN(parsedTimestamp) ? 0 : parsedTimestamp;
}

function formatRecentTime(value: string) {
  const timestamp = parseEvidenceTimestamp(value);

  if (timestamp === 0) {
    return value;
  }

  const date = new Date(timestamp);
  const currentYear = new Date().getFullYear();

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    ...(date.getFullYear() !== currentYear ? { year: 'numeric' } : {}),
  }).format(date);
}

export default function HomeScreen() {

    const [firstName, setFirstName] = useState('');
    const [recentEvidenceMoments, setRecentEvidenceMoments] = useState<RecentEvidenceMoment[]>([]);
    const [recentEvidenceError, setRecentEvidenceError] = useState<string | null>(null);
    const [isRecentEvidenceLoading, setIsRecentEvidenceLoading] = useState(false);
    const [showWelcomeToast, setShowWelcomeToast] = useState(false);
    const { welcomeBack } = useLocalSearchParams<{ welcomeBack?: string }>();

    useEffect(() => {
    async function loadUser() {
      try {
        const user = await getCurrentUser();
        setFirstName(user.first_name);
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    }

    loadUser();
  }, []);

  const loadRecentEvidence = useCallback(async () => {
    setIsRecentEvidenceLoading(true);
    setRecentEvidenceError(null);

    try {
      const [cases, evidenceTypes] = await Promise.all([getCases(), getEvidenceTypes()]);
      const evidenceTypeNameById = evidenceTypes.reduce<Record<number, string>>(
        (typesById: Record<number, string>, evidenceType: EvidenceTypeResponse) => {
          typesById[evidenceType.evidence_type_id] = evidenceType.type_name;
          return typesById;
        },
        {}
      );

      if (cases.length === 0) {
        setRecentEvidenceMoments([]);
        return;
      }

      const incidentGroups = await Promise.all(
        cases.map((caseInfo) => listIncidents(caseInfo.case_id))
      );
      const incidents = incidentGroups.flat();

      if (incidents.length === 0) {
        setRecentEvidenceMoments([]);
        return;
      }

      const evidenceResults = await Promise.allSettled(
        incidents.map(async (incident) => {
          const evidence = await listIncidentEvidence(incident.incident_id);
          return evidence.map((item) => ({ evidence: item, incident }));
        })
      );
      const fulfilledEvidence = evidenceResults
        .filter((result): result is PromiseFulfilledResult<{ evidence: EvidenceResponse; incident: IncidentResponse }[]> => result.status === 'fulfilled')
        .flatMap((result) => result.value);

      if (fulfilledEvidence.length === 0 && evidenceResults.some((result) => result.status === 'rejected')) {
        throw new Error('Unable to load recent evidence.');
      }

      const nextMoments = fulfilledEvidence
        .sort(
          (first, second) => {
            const timestampDifference =
              parseEvidenceTimestamp(evidenceTimelineValue(second.evidence)) -
              parseEvidenceTimestamp(evidenceTimelineValue(first.evidence));

            if (timestampDifference !== 0) {
              return timestampDifference;
            }

            return second.evidence.evidence_id - first.evidence.evidence_id;
          }
        )
        .slice(0, 3)
        .map<RecentEvidenceMoment>(({ evidence, incident }) => {
          const typeName = evidenceTypeNameById[evidence.evidence_type_id];

          return {
            color: typeName ? evidenceTypeColors[typeName] ?? '#75AFA4' : '#75AFA4',
            evidence,
            incident,
            meta: formatEvidenceMeta(evidence, incident),
            time: formatRecentTime(evidenceTimelineValue(evidence)),
            title: formatEvidenceTitle(typeName, evidence.file_name),
          };
        });

      setRecentEvidenceMoments(nextMoments);
    } catch (error) {
      setRecentEvidenceMoments([]);
      setRecentEvidenceError(error instanceof Error ? error.message : 'Unable to load recent evidence.');
    } finally {
      setIsRecentEvidenceLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecentEvidence();
  }, [loadRecentEvidence]);

  useEffect(() => {
    if (welcomeBack !== '1') {
      return;
    }

    setShowWelcomeToast(true);
    const timeout = setTimeout(() => {
      setShowWelcomeToast(false);
    }, 3600);

    return () => clearTimeout(timeout);
  }, [welcomeBack]);

  function handleCapturePress(title: string) {
    if (title === 'Voice\nNote') {
      router.push('/voice-note' as Href);
    }

    if (title === 'Written\nNote') {
      router.push('/written-note' as Href);
    }
    
    if (title === "Photo\n& Video") {
      router.push("/camera-evidence" as Href);
    }
  }

  // Returns a greeting based on local time: morning / afternoon / evening
  function getTimeOfDay(date = new Date()) {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  // Returns formatted date like "Thursday, May 21"
  function getFormattedDate(date = new Date()) {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${weekdays[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  }

  function openBloomDisguise() {
    router.push('/bloom' as Href);
  }

  function openRecentMoment(moment: RecentEvidenceMoment) {
    router.push(
      `/incidents/${moment.incident.incident_id}?evidenceId=${moment.evidence.evidence_id}` as Href
    );
  }

  function openCaseOverview() {
    router.push('/case' as Href);
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <SafeAreaView edges={['top']} style={styles.heroSafeArea}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <Ionicons name="moon-outline" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.brandName}>nura</Text>
              <Pressable accessibilityRole="button" style={styles.bellButton}>
                <Ionicons name="notifications-outline" size={22} color="#B9D9D4" />
                <View style={styles.notificationDot} />
              </Pressable>
            </View>

            {showWelcomeToast ? (
              <View accessibilityLiveRegion="polite" style={styles.welcomeToast}>
                <View style={styles.toastIcon}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" />
                </View>
                <View style={styles.toastTextBlock}>
                  <Text style={styles.toastTitle}>Welcome back to Nura</Text>
                  <Text style={styles.toastSubtitle}>Your safety. Your evidence. Your control.</Text>
                </View>
                <Pressable
                  accessibilityLabel="Dismiss welcome message"
                  accessibilityRole="button"
                  onPress={() => setShowWelcomeToast(false)}
                  style={styles.toastClose}>
                  <Ionicons name="close" size={18} color="#B9D9D4" />
                </Pressable>
              </View>
            ) : null}

            <View style={styles.greetingBlock}>
              <Text style={styles.eyebrow}>{getTimeOfDay()}</Text>
              <Text style={styles.userName}>{firstName || 'Welcome'}</Text>
              <Text style={styles.safetyText}>{`${getFormattedDate()} · You are safe right now`}</Text>
            </View>

            <Pressable accessibilityRole="button" style={styles.recordCard}>
              <View style={styles.recordIcon}>
                <Ionicons name="add" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.recordTextBlock}>
                <Text style={styles.recordTitle}>Record a moment</Text>
                <Text style={styles.recordSubtitle}>Capture evidence securely</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#A6C7C2" />
            </Pressable>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>QUICK CAPTURE</Text>
          <View style={styles.quickCaptureRow}>
            {captureActions.map((action) => (
              <Pressable
                accessibilityRole="button"
                key={action.title}
                onPress={() => handleCapturePress(action.title)}
                style={styles.captureCard}>
                <View style={[styles.captureIcon, { backgroundColor: action.backgroundColor }]}>
                  {action.icon === 'file-document-outline' ? (
                    <MaterialCommunityIcons name={action.icon} size={22} color={action.color} />
                  ) : (
                    <Ionicons name={action.icon} size={22} color={action.color} />
                  )}
                </View>
                <Text style={styles.captureTitle}>{action.title}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>RECENT MOMENTS</Text>
            <Pressable accessibilityRole="button" onPress={openCaseOverview}>
              <Text style={styles.seeAllText}>See all</Text>
            </Pressable>
          </View>

          <View style={styles.momentList}>
            {isRecentEvidenceLoading ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator color="#1F5857" />
                <Text style={styles.loadingText}>Loading recent evidence...</Text>
              </View>
            ) : null}

            {!isRecentEvidenceLoading && recentEvidenceError ? (
              <View style={styles.statusPanel}>
                <Text style={styles.statusTitle}>Recent evidence unavailable</Text>
                <Text style={styles.statusMessage}>{recentEvidenceError}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={loadRecentEvidence}
                  style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </Pressable>
              </View>
            ) : null}

            {!isRecentEvidenceLoading && !recentEvidenceError && recentEvidenceMoments.length === 0 ? (
              <View style={styles.statusPanel}>
                <Text style={styles.statusTitle}>No evidence yet</Text>
                <Text style={styles.statusMessage}>Captured evidence will appear here.</Text>
              </View>
            ) : null}

            {!isRecentEvidenceLoading && !recentEvidenceError
              ? recentEvidenceMoments.map((moment) => (
              <Pressable
                accessibilityRole="button"
                key={moment.evidence.evidence_id}
                onPress={() => openRecentMoment(moment)}
                style={styles.momentCard}>
                <View style={[styles.momentDot, { backgroundColor: moment.color }]} />
                <View style={styles.momentText}>
                  <Text style={styles.momentTime}>{moment.time}</Text>
                  <Text style={styles.momentTitle}>{moment.title}</Text>
                  <Text style={styles.momentMeta}>{moment.meta}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#CAD3D1" />
              </Pressable>
                ))
              : null}
          </View>
        </View>
      </ScrollView>

      <Pressable
        accessibilityLabel="Open Bloom interface"
        accessibilityRole="button"
        onPress={openBloomDisguise}
        style={styles.floatingAction}>
        <MaterialCommunityIcons name="pulse" size={32} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F7F5',
  },
  scrollContent: {
    paddingBottom: 112,
  },
  hero: {
    backgroundColor: '#1F5857',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  heroSafeArea: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingTop: 12,
  },
  brandMark: {
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  brandName: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 20,
    marginLeft: 4,
  },
  bellButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    marginLeft: 'auto',
    position: 'relative',
    width: 40,
  },
  notificationDot: {
    backgroundColor: '#E06468',
    borderRadius: 3,
    height: 6,
    position: 'absolute',
    right: 10,
    top: 9,
    width: 6,
  },
  welcomeToast: {
    alignItems: 'center',
    backgroundColor: 'rgba(25, 78, 76, 0.92)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 10,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toastIcon: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  toastTextBlock: {
    flex: 1,
    marginLeft: 10,
  },
  toastTitle: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
  },
  toastSubtitle: {
    color: '#B8E1DB',
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    marginTop: 2,
  },
  toastClose: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  greetingBlock: {
    marginTop: 22,
  },
  eyebrow: {
    color: '#84C3BA',
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
  },
  userName: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
    lineHeight: 34,
    marginTop: 2,
  },
  safetyText: {
    color: '#A8CFC8',
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    marginTop: 4,
  },
  recordCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 26,
    minHeight: 76,
    paddingHorizontal: 18,
  },
  recordIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  recordTextBlock: {
    flex: 1,
    marginLeft: 16,
  },
  recordTitle: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
  },
  recordSubtitle: {
    color: '#B8E1DB',
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    backgroundColor: '#F5F7F5',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  sectionTitle: {
    color: '#A7ADAF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    letterSpacing: 1,
  },
  quickCaptureRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  captureCard: {
    alignItems: 'center',
    aspectRatio: 0.98,
    backgroundColor: '#FFFFFF',
    borderColor: '#E9EDED',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 3,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#12312E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },
  captureIcon: {
    alignItems: 'center',
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    marginBottom: 10,
    width: 38,
  },
  captureTitle: {
    color: '#020B0C',
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    lineHeight: 15,
    textAlign: 'center',
  },
  seeAllText: {
    color: '#79908E',
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
  },
  momentList: {
    gap: 12,
    marginTop: 12,
  },
  inlineLoading: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E7ECEA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 72,
    paddingHorizontal: 16,
  },
  loadingText: {
    color: '#71807E',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  statusPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7ECEA',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  statusTitle: {
    color: '#071314',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
  },
  statusMessage: {
    color: '#71807E',
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAF3F1',
    borderRadius: 12,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  retryButtonText: {
    color: '#1F5857',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
  },
  momentCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#E7ECEA',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    minHeight: 88,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#16312F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  momentDot: {
    borderRadius: 4,
    height: 8,
    marginTop: 6,
    width: 8,
  },
  momentText: {
    flex: 1,
    marginLeft: 14,
  },
  momentTime: {
    color: '#A4ACAE',
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  momentTitle: {
    color: '#071314',
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    marginTop: 3,
  },
  momentMeta: {
    color: '#A4ACAE',
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    marginTop: 5,
  },
  floatingAction: {
    alignItems: 'center',
    backgroundColor: '#1F5857',
    borderRadius: 30,
    bottom: 74,
    elevation: 8,
    height: 60,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    shadowColor: '#12312F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    width: 60,
  },
});
