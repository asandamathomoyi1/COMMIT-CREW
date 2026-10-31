import React from 'react';

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';

export default function ScreenHeader({ title, subtitle, onBack }) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        hitSlop={8}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </Pressable>

      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>

        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 72,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  button: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  spacer: {
    width: 42,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },

  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },

  subtitle: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },

  pressed: {
    opacity: 0.65,
  },
});
