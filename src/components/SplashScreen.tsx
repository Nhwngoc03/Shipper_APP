import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing
} from 'react-native';
import { Bike } from 'lucide-react-native';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const scaleAnim = new Animated.Value(0.5);
  const opacityAnim = new Animated.Value(0);
  const dotOpacity1 = new Animated.Value(0.4);
  const dotOpacity2 = new Animated.Value(0.4);
  const dotOpacity3 = new Animated.Value(0.4);

  useEffect(() => {
    // Animate logo
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Animate loader dots
    const createDotAnimation = (delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(dotOpacity1, {
            toValue: 1,
            duration: 600,
            delay: delay,
            useNativeDriver: true,
          }),
          Animated.timing(dotOpacity1, {
            toValue: 0.4,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
    };

    Animated.parallel([
      createDotAnimation(0),
      createDotAnimation(200),
      createDotAnimation(400),
    ]).start();

    // Navigate after 3 seconds
    const timer = setTimeout(() => {
      onFinish();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <View style={styles.logoBg}>
          <Bike size={80} color="white" strokeWidth={1.5} />
        </View>
      </Animated.View>

      <Animated.Text
        style={[
          styles.appName,
          {
            opacity: opacityAnim,
          },
        ]}
      >
        Shipper Pro
      </Animated.Text>

      <Animated.Text
        style={[
          styles.appSubtitle,
          {
            opacity: opacityAnim,
          },
        ]}
      >
        Hệ thống đối tác tài xế
      </Animated.Text>

      <View style={styles.loader}>
        <Animated.View 
          style={[
            styles.loaderDot,
            { opacity: dotOpacity1 }
          ]} 
        />
        <Animated.View 
          style={[
            styles.loaderDot,
            { opacity: dotOpacity2 }
          ]} 
        />
        <Animated.View 
          style={[
            styles.loaderDot,
            { opacity: dotOpacity3 }
          ]} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoBg: {
    width: 140,
    height: 140,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  appName: {
    fontSize: 36,
    fontWeight: '900',
    color: 'white',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 60,
  },
  loader: {
    flexDirection: 'row',
    gap: 8,
    position: 'absolute',
    bottom: 60,
  },
  loaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
});
