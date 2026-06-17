import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface CheerModalProps {
  visible: boolean;
  message?: string;
  onClose: () => void;
}

const MESSAGES = [
  "You did it! I'm so proud of you! 🌸",
  "Amazing work, keep shining! ✨",
  "That's my girl! You're unstoppable! 💪",
  "One step closer to your goals! 🌷",
  "You're doing so well! Love you! ❤️",
];

export default function CheerModal({ visible, message, onClose }: CheerModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const cheerMessage = message ?? MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 6,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -12, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0, duration: 400, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ])
      ).start();

      const timer = setTimeout(onClose, 3500);
      return () => clearTimeout(timer);
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      bounceAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View style={[styles.container, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={['#fff1f2', '#fce7f3', '#fff']}
            style={styles.card}
          >
            <Animated.Text style={[styles.mascot, { transform: [{ translateY: bounceAnim }] }]}>
              🌸
            </Animated.Text>
            <Text style={styles.title}>Yay!</Text>
            <Text style={styles.message}>{cheerMessage}</Text>
            <Pressable style={styles.button} onPress={onClose}>
              <LinearGradient colors={['#fb7185', '#ec4899']} style={styles.buttonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.buttonText}>Thank you! 💖</Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(244,63,94,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  card: {
    padding: 36,
    alignItems: 'center',
    gap: 12,
  },
  mascot: { fontSize: 72, marginBottom: 4 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#be123c',
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 17,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  button: {
    marginTop: 8,
    borderRadius: 100,
    overflow: 'hidden',
    width: '100%',
  },
  buttonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderRadius: 100,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
