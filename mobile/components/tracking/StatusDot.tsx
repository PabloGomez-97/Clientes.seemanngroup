import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

type StatusDotProps = {
  color: string;
  pulse?: boolean;
};

/** Punto de estado; con `pulse` hace un latido muy sutil. */
export default function StatusDot({ color, pulse = false }: StatusDotProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pulse) {
      scale.setValue(1);
      glow.setValue(0);
      return;
    }

    const beat = Animated.sequence([
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1.12,
          duration: 420,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.18,
          duration: 420,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: 520,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.04,
          duration: 520,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(900),
    ]);

    const loop = Animated.loop(beat);
    loop.start();
    return () => {
      loop.stop();
    };
  }, [pulse, scale, glow]);

  return (
    <View style={styles.dotWrap}>
      {pulse ? (
        <Animated.View
          style={[
            styles.dotGlow,
            {
              backgroundColor: color,
              opacity: glow,
              transform: [{ scale: Animated.multiply(scale, 1.35) }],
            },
          ]}
        />
      ) : null}
      <Animated.View
        style={[
          styles.statusDot,
          {
            backgroundColor: color,
            transform: [{ scale: pulse ? scale : 1 }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dotWrap: {
    width: 10,
    height: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dotGlow: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
