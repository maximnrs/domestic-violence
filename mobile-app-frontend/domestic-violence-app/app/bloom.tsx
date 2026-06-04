import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCurrentUser } from '@/services/api';

type BloomView = 'transition' | 'home' | 'settings' | 'general' | 'interface' | 'confirm';

const bloomTeal = '#7FA89C';
const deepTeal = '#1F5857';
const background = '#F6F8F7';
const border = '#E4EAE8';
const mutedText = '#8D9998';

const habits = [
  { complete: true, detail: '10 minutes', title: 'Morning meditation' },
  { complete: true, detail: 'Daily goal', title: 'Drink 8 glasses of water' },
  { complete: true, detail: 'Outdoor', title: '30 min walk' },
  { complete: true, detail: 'Current book', title: 'Read 20 pages' },
  { complete: false, detail: 'Reflection', title: 'Evening journal' },
  { complete: false, detail: 'Before bed', title: 'Stretch routine' },
];

const insights = [
  { label: 'Current streak', value: '12 days' },
  { label: 'Best day', value: 'Tuesday' },
  { label: 'This week', value: '76%' },
];

function compactName(firstName: string, lastName: string) {
  if (!firstName && !lastName) {
    return 'Bloom User';
  }

  if (!lastName) {
    return firstName;
  }

  return `${firstName} ${lastName.charAt(0)}.`;
}

function BloomLogo({ color = bloomTeal, size = 56 }: { color?: string; size?: number }) {
  return (
    <View
      style={[
        styles.logo,
        {
          backgroundColor: color,
          borderRadius: size * 0.3,
          height: size,
          width: size,
        },
      ]}>
      <MaterialCommunityIcons name="pulse" size={size * 0.54} color="#FFFFFF" />
    </View>
  );
}

function AnimatedDots() {
  const opacities = useRef([
    new Animated.Value(0.35),
    new Animated.Value(0.35),
    new Animated.Value(0.35),
  ]).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.stagger(
        150,
        opacities.map((opacity) =>
          Animated.sequence([
            Animated.timing(opacity, {
              duration: 320,
              toValue: 1,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              duration: 320,
              toValue: 0.35,
              useNativeDriver: true,
            }),
          ])
        )
      )
    );

    animation.start();
    return () => animation.stop();
  }, [opacities]);

  return (
    <View style={styles.dots}>
      {opacities.map((opacity, index) => (
        <Animated.View key={index} style={[styles.dot, { opacity }]} />
      ))}
    </View>
  );
}

function Header({
  onBack,
  right,
  title,
}: {
  onBack?: () => void;
  right?: ReactNode;
  title: string;
}) {
  return (
    <View style={styles.topBar}>
      {onBack ? (
        <Pressable
          accessibilityLabel={title ? `Back from ${title}` : 'Back'}
          accessibilityRole="button"
          onPress={onBack}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#102120" />
        </Pressable>
      ) : (
        <View style={styles.topSpacer} />
      )}
      <Text style={styles.topTitle}>{title}</Text>
      <View style={styles.topRight}>{right}</View>
    </View>
  );
}

function Row({
  detail,
  icon,
  iconBackground = '#EAF3F1',
  iconColor = bloomTeal,
  label,
  onPress,
  showChevron = true,
}: {
  detail?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBackground?: string;
  iconColor?: string;
  label: string;
  onPress?: () => void;
  showChevron?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" disabled={!onPress} onPress={onPress} style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      {showChevron ? <Ionicons name="chevron-forward" size={18} color="#B8C2C0" /> : null}
    </Pressable>
  );
}

function BottomNav({
  active,
  onSelectHome,
  onSelectSettings,
}: {
  active: 'home' | 'settings';
  onSelectHome: () => void;
  onSelectSettings: () => void;
}) {
  const items = [
    { icon: 'home-outline' as const, key: 'home', label: 'Home' },
    { icon: 'bar-chart-outline' as const, key: 'insights', label: 'Insights' },
    { icon: 'book-outline' as const, key: 'journal', label: 'Journal' },
    { icon: 'settings-outline' as const, key: 'settings', label: 'Settings' },
  ];

  return (
    <View style={styles.bottomNav}>
      {items.map((item) => {
        const selected = active === item.key;
        const color = selected ? deepTeal : '#9AA5A5';

        return (
          <Pressable
            accessibilityRole="button"
            key={item.key}
            onPress={item.key === 'settings' ? onSelectSettings : onSelectHome}
            style={styles.navItem}>
            <Ionicons name={item.icon} size={23} color={color} />
            <Text style={[styles.navLabel, { color }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function BloomScreen() {
  const [view, setView] = useState<BloomView>('transition');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    async function loadUser() {
      try {
        const user = await getCurrentUser();
        setFirstName(user.first_name);
        setLastName(user.last_name);
        setEmail(user.email);
      } catch (error) {
        console.error('Failed to load Bloom user:', error);
      }
    }

    loadUser();
  }, []);

  const displayName = useMemo(() => compactName(firstName, lastName), [firstName, lastName]);
  const greetingName = firstName || 'there';
  const displayEmail = email || 'private@email.com';

  function returnToNura() {
    router.replace('/?welcomeBack=1' as Href);
  }

  if (view === 'transition') {
    return (
      <SafeAreaView style={styles.blankScreen}>
        <View style={styles.transitionCenter}>
          <BloomLogo size={80} />
          <Text style={styles.transitionTitle}>Opening Bloom</Text>
          <Text style={styles.transitionSubtitle}>Just a moment...</Text>
          <AnimatedDots />
        </View>
        <Pressable accessibilityRole="button" onPress={() => setView('home')} style={styles.continueButton}>
          <Text style={styles.continueButtonText}>Continue -&gt;</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (view === 'home') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.bloomHeader}>
          <View style={styles.brandCluster}>
            <BloomLogo size={32} />
            <Text style={styles.brandTitle}>Bloom</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.streakPill}>
              <Ionicons name="flame-outline" size={14} color="#E0B663" />
              <Text style={styles.streakText}>12</Text>
            </View>
            <View style={styles.userCircle}>
              <Ionicons name="person-outline" size={18} color="#FFFFFF" />
            </View>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.homeContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.dateText}>Thursday, May 21</Text>
          <Text style={styles.greeting}>Good afternoon, {greetingName}</Text>

          <View style={styles.progressCard}>
            <View style={styles.progressRing}>
              <Text style={styles.progressFraction}>4/6</Text>
            </View>
            <View style={styles.progressTextBlock}>
              <Text style={styles.progressTitle}>4 of 6 habits done</Text>
              <Text style={styles.progressSubtitle}>2 remaining today</Text>
              <Text style={styles.progressNote}>12-day streak - keep it up!</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>{"TODAY'S HABITS"}</Text>
            {habits.map((habit) => (
              <View key={habit.title} style={styles.habitRow}>
                <View style={[styles.checkCircle, habit.complete ? styles.checkCircleDone : null]}>
                  {habit.complete ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
                </View>
                <View style={styles.habitText}>
                  <Text style={[styles.habitTitle, habit.complete ? styles.habitDoneText : null]}>
                    {habit.title}
                  </Text>
                  <Text style={styles.habitDetail}>{habit.detail}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.insightRow}>
            {insights.map((insight) => (
              <View key={insight.label} style={styles.insightCard}>
                <Text style={styles.insightValue}>{insight.value}</Text>
                <Text style={styles.insightLabel}>{insight.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
        <BottomNav
          active="home"
          onSelectHome={() => setView('home')}
          onSelectSettings={() => setView('settings')}
        />
      </SafeAreaView>
    );
  }

  if (view === 'settings') {
    return (
      <SafeAreaView style={styles.screen}>
        <Header onBack={() => setView('home')} title="Settings" />
        <ScrollView contentContainerStyle={styles.settingsContent} showsVerticalScrollIndicator={false}>
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Ionicons name="person-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.profileText}>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileEmail}>{displayEmail}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C6CFCD" />
          </View>

          <Text style={styles.groupTitle}>PREFERENCES</Text>
          <View style={styles.cardSection}>
            <Row icon="settings-outline" label="General" onPress={() => setView('general')} />
            <View style={styles.divider} />
            <Row icon="notifications-outline" iconBackground="#EEF5FC" iconColor="#5E8BBF" label="Notifications" />
            <View style={styles.divider} />
            <Row icon="star-outline" iconBackground="#FFF7E7" iconColor="#E0B663" label="Appearance" />
          </View>

          <Text style={styles.groupTitle}>PRIVACY</Text>
          <View style={styles.cardSection}>
            <Row icon="lock-closed-outline" iconBackground="#EFF2F2" iconColor="#9AA3A3" label="Privacy Settings" />
            <View style={styles.divider} />
            <Row icon="globe-outline" iconBackground="#EFF2F2" iconColor="#9AA3A3" label="Data & Storage" />
          </View>

          <Text style={styles.groupTitle}>ABOUT</Text>
          <View style={styles.cardSection}>
            <Row icon="information-circle-outline" iconBackground="#EFF2F2" iconColor="#9AA3A3" label="App Info" detail="v2.1.0" />
            <View style={styles.divider} />
            <Row icon="help-circle-outline" iconBackground="#EFF2F2" iconColor="#9AA3A3" label="Help Center" />
          </View>
        </ScrollView>
        <BottomNav
          active="settings"
          onSelectHome={() => setView('home')}
          onSelectSettings={() => setView('settings')}
        />
      </SafeAreaView>
    );
  }

  if (view === 'general') {
    return (
      <SafeAreaView style={styles.screen}>
        <Header onBack={() => setView('settings')} title="General" />
        <ScrollView contentContainerStyle={styles.settingsContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.groupTitle}>PREFERENCES</Text>
          <View style={styles.cardSection}>
            <Row icon="calendar-outline" label="Week starts on" detail="Monday" />
            <View style={styles.divider} />
            <Row icon="notifications-outline" iconBackground="#EEF5FC" iconColor="#5E8BBF" label="Default reminder" detail="8:00 AM" />
            <View style={styles.divider} />
            <Row icon="globe-outline" iconBackground="#EFF2F2" iconColor="#9AA3A3" label="Language" detail="English" />
          </View>

          <Text style={styles.groupTitle}>INTERFACE</Text>
          <View style={styles.cardSection}>
            <Row icon="layers-outline" label="App Interface" detail="Bloom" onPress={() => setView('interface')} />
          </View>
          <Text style={styles.helperText}>Manage which interface is currently active</Text>

          <Text style={styles.groupTitle}>SYNC</Text>
          <View style={styles.cardSection}>
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name="heart-outline" size={18} color={bloomTeal} />
              </View>
              <Text style={styles.rowLabel}>Sync with Health</Text>
              <Switch
                ios_backgroundColor="#DFE6E4"
                thumbColor="#FFFFFF"
                trackColor={{ false: '#DFE6E4', true: bloomTeal }}
                value
              />
            </View>
            <View style={styles.divider} />
            <Row icon="sync-outline" iconBackground="#EEF5FC" iconColor="#6C9BD1" label="iCloud Backup" detail="On" />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (view === 'interface') {
    return (
      <SafeAreaView style={styles.screen}>
        <Header onBack={() => setView('general')} title="App Interface" />
        <ScrollView contentContainerStyle={styles.interfaceContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.interfaceIntro}>
            Switch between interfaces at any time. Your data in both is always kept safe and private.
          </Text>

          <View style={[styles.interfaceOption, styles.interfaceOptionActive]}>
            <BloomLogo size={48} />
            <View style={styles.interfaceCopy}>
              <View style={styles.interfaceTitleRow}>
                <Text style={styles.interfaceTitle}>Bloom</Text>
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>Active</Text>
                </View>
              </View>
              <Text style={styles.interfaceSubtitle}>Habit tracker - Currently active</Text>
            </View>
            <View style={styles.radioSelected}>
              <View style={styles.radioInner} />
            </View>
          </View>

          <View style={styles.interfaceOption}>
            <View style={[styles.logo, styles.nuraLogo]}>
              <Ionicons name="moon-outline" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.interfaceCopy}>
              <Text style={styles.interfaceTitle}>nura</Text>
              <Text style={styles.interfaceSubtitle}>Safety & evidence app</Text>
            </View>
            <View style={styles.radio} />
            <Pressable accessibilityRole="button" onPress={() => setView('confirm')} style={styles.switchButton}>
              <Text style={styles.switchButtonText}>Switch to Nura</Text>
            </Pressable>
          </View>

          <Text style={styles.privateNote}>
            Both interfaces are fully private. No notifications or banners will indicate a switch.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.blankScreen}>
      <Header onBack={() => setView('interface')} title="" />
      <View style={styles.confirmCenter}>
        <View style={[styles.logo, styles.confirmLogo]}>
          <Ionicons name="moon-outline" size={40} color="#FFFFFF" />
        </View>
        <Text style={styles.confirmTitle}>Return to Nura?</Text>
        <Text style={styles.confirmMessage}>
          Bloom will continue running quietly in the background. Your habits and progress are saved.
        </Text>
        <Pressable accessibilityRole="button" onPress={returnToNura} style={styles.confirmPrimary}>
          <Text style={styles.confirmPrimaryText}>Switch to Nura</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setView('home')} style={styles.confirmSecondary}>
          <Text style={styles.confirmSecondaryText}>Stay in Bloom</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: background,
    flex: 1,
  },
  blankScreen: {
    backgroundColor: '#FAFBFB',
    flex: 1,
  },
  transitionCenter: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16312F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
  },
  transitionTitle: {
    color: '#071314',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    marginTop: 28,
  },
  transitionSubtitle: {
    color: mutedText,
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    marginTop: 6,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 28,
  },
  dot: {
    backgroundColor: '#9FC3BA',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  continueButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: deepTeal,
    borderRadius: 14,
    justifyContent: 'center',
    marginBottom: 34,
    minHeight: 46,
    paddingHorizontal: 32,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
  },
  bloomHeader: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#EBEFEE',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  brandCluster: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  brandTitle: {
    color: '#071314',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginLeft: 'auto',
  },
  streakPill: {
    alignItems: 'center',
    backgroundColor: '#FFF7E7',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  streakText: {
    color: '#D7A94D',
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
  },
  userCircle: {
    alignItems: 'center',
    backgroundColor: bloomTeal,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  homeContent: {
    padding: 20,
    paddingBottom: 112,
  },
  dateText: {
    color: mutedText,
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
  },
  greeting: {
    color: '#071314',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 21,
    marginTop: 4,
  },
  progressCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: border,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    marginTop: 18,
    padding: 18,
    shadowColor: '#12312F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  progressRing: {
    alignItems: 'center',
    borderColor: '#DDE7E4',
    borderLeftColor: bloomTeal,
    borderRadius: 31,
    borderTopColor: bloomTeal,
    borderWidth: 6,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  progressFraction: {
    color: deepTeal,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
  },
  progressTextBlock: {
    flex: 1,
    marginLeft: 18,
  },
  progressTitle: {
    color: '#071314',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
  },
  progressSubtitle: {
    color: mutedText,
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    marginTop: 4,
  },
  progressNote: {
    color: '#A88745',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  sectionLabel: {
    color: '#A3ABAD',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
  },
  habitRow: {
    alignItems: 'center',
    borderBottomColor: '#E8EDED',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 62,
  },
  checkCircle: {
    borderColor: '#CDD6D4',
    borderRadius: 12,
    borderWidth: 2,
    height: 25,
    width: 25,
  },
  checkCircleDone: {
    alignItems: 'center',
    backgroundColor: bloomTeal,
    borderColor: bloomTeal,
    justifyContent: 'center',
  },
  habitText: {
    flex: 1,
    marginLeft: 12,
  },
  habitTitle: {
    color: '#071314',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  habitDoneText: {
    color: '#889392',
    textDecorationLine: 'line-through',
  },
  habitDetail: {
    color: '#9AA3A3',
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    marginTop: 2,
  },
  insightRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderColor: border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 78,
    padding: 12,
  },
  insightValue: {
    color: deepTeal,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
  },
  insightLabel: {
    color: mutedText,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    marginTop: 4,
  },
  topBar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E7ECEA',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 56,
    paddingHorizontal: 16,
  },
  backButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  topSpacer: {
    width: 40,
  },
  topTitle: {
    color: '#071314',
    flex: 1,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
  },
  topRight: {
    alignItems: 'flex-end',
    minWidth: 40,
  },
  settingsContent: {
    padding: 20,
    paddingBottom: 112,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: border,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    padding: 16,
    shadowColor: '#12312F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
  },
  profileAvatar: {
    alignItems: 'center',
    backgroundColor: '#A8C8BE',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  profileText: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    color: '#071314',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
  },
  profileEmail: {
    color: mutedText,
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    marginTop: 2,
  },
  groupTitle: {
    color: '#8D9998',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 22,
  },
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderColor: border,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 58,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: '#EAF3F1',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  rowLabel: {
    color: '#071314',
    flex: 1,
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    marginLeft: 13,
  },
  rowDetail: {
    color: mutedText,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    marginRight: 8,
  },
  divider: {
    backgroundColor: '#E8EDED',
    height: 1,
    marginLeft: 65,
  },
  helperText: {
    color: mutedText,
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    marginLeft: 4,
    marginTop: 8,
  },
  bottomNav: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E8ECEA',
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    height: 72,
    justifyContent: 'space-around',
    left: 0,
    paddingBottom: 9,
    paddingTop: 8,
    position: 'absolute',
    right: 0,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
    justifyContent: 'center',
  },
  navLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
  },
  interfaceContent: {
    padding: 20,
    paddingBottom: 90,
  },
  interfaceIntro: {
    color: mutedText,
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 18,
  },
  interfaceOption: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
    padding: 16,
  },
  interfaceOptionActive: {
    borderColor: bloomTeal,
    borderWidth: 2,
  },
  interfaceCopy: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  interfaceTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interfaceTitle: {
    color: '#071314',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
  },
  interfaceSubtitle: {
    color: mutedText,
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    marginTop: 3,
  },
  activePill: {
    backgroundColor: bloomTeal,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activePillText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
  },
  radio: {
    borderColor: '#D0D8D6',
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    width: 20,
  },
  radioSelected: {
    alignItems: 'center',
    borderColor: bloomTeal,
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  radioInner: {
    backgroundColor: bloomTeal,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  nuraLogo: {
    backgroundColor: deepTeal,
    borderRadius: 14,
    height: 48,
    width: 48,
  },
  switchButton: {
    alignItems: 'center',
    backgroundColor: deepTeal,
    borderRadius: 14,
    flexBasis: '100%',
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 48,
  },
  switchButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
  },
  privateNote: {
    alignSelf: 'center',
    color: mutedText,
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    maxWidth: 280,
    textAlign: 'center',
  },
  confirmCenter: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  confirmLogo: {
    backgroundColor: deepTeal,
    borderRadius: 20,
    height: 80,
    width: 80,
  },
  confirmTitle: {
    color: '#071314',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    marginTop: 28,
  },
  confirmMessage: {
    color: mutedText,
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 10,
    maxWidth: 320,
    textAlign: 'center',
  },
  confirmPrimary: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: deepTeal,
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 30,
    minHeight: 52,
  },
  confirmPrimaryText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
  },
  confirmSecondary: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderColor: border,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 52,
  },
  confirmSecondaryText: {
    color: '#071314',
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
  },
});
