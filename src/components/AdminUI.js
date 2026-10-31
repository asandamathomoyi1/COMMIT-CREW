import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';

export function AdminHeader({ title, subtitle, onBack, right }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backButton} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>

      <View style={styles.headerText}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ?? <View style={styles.backButton} />}
    </View>
  );
}

export function Chip({ label, active, onPress, count }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
        {typeof count === 'number' ? ` (${count})` : ''}
      </Text>
    </Pressable>
  );
}

export function Badge({ label, tone = 'neutral' }) {
  const palette = {
    neutral: { bg: colors.surfaceSoft, fg: colors.textSecondary },
    admin: { bg: colors.primaryLight, fg: colors.primary },
    danger: { bg: '#FEE9E7', fg: colors.danger },
    warning: { bg: '#FEF1DC', fg: '#B54708' },
    success: { bg: '#E3F8EE', fg: '#067647' },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

export function ActionButton({ label, icon, tone = 'primary', onPress, disabled, loading }) {
  const toneStyle = {
    primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
    danger: { bg: colors.danger, fg: colors.white, border: colors.danger },
    soft: { bg: colors.white, fg: colors.text, border: colors.border },
    softDanger: { bg: colors.white, fg: colors.danger, border: '#F8C7C2' },
  }[tone];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.actionButton,
        { backgroundColor: toneStyle.bg, borderColor: toneStyle.border },
        (pressed || disabled || loading) && { opacity: 0.6 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={toneStyle.fg} />
      ) : icon ? (
        <Ionicons name={icon} size={16} color={toneStyle.fg} />
      ) : null}
      <Text style={[styles.actionButtonText, { color: toneStyle.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ icon = 'checkmark-circle-outline', title, text }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={styles.emptyText}>{text}</Text> : null}
    </View>
  );
}

export function ErrorCard({ message, onRetry }) {
  return (
    <View style={styles.errorCard}>
      <Ionicons name="warning-outline" size={20} color={colors.danger} />
      <View style={{ flex: 1 }}>
        <Text style={styles.errorText}>{message}</Text>
        {onRetry ? (
          <Pressable onPress={onRetry} style={{ marginTop: 8 }}>
            <Text style={styles.errorRetry}>Try again</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  chipTextActive: { color: colors.white },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '800' },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionButtonText: { fontSize: 13, fontWeight: '800' },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { marginTop: 14, fontSize: 16, fontWeight: '800', color: colors.text },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  errorCard: {
    margin: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FEE9E7',
    flexDirection: 'row',
    gap: 10,
  },
  errorText: { fontSize: 13, lineHeight: 19, color: '#7A271A' },
  errorRetry: { fontSize: 13, fontWeight: '800', color: colors.danger },
});
