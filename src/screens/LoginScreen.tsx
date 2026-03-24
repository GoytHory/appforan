import React, { FC, useState, useRef, ReactNode, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Easing,
  StyleSheet,
  Animated,
} from "react-native";
import { COLORS } from "../constants/colors";
import { LoginScreenProps } from "../types";

// Размеры экрана вычисляются один раз при загрузке модуля
const { width: SW, height: SH } = Dimensions.get("window");

// Хардкодные позиции и параметры декоративных символов.
// Меняй symbol/top/left/size/opacity чтобы перестроить раскладку.
const FLOATING_GLYPHS = [
  {
    id: "g0",
    symbol: "ꙮ",
    top: SH * 0.08,
    left: SW * 0.06,
    size: 28,
    duration: 2400,
    opacity: 0.35,
    driftX: 2,
    driftY: 2,
  },
  {
    id: "g1",
    symbol: "Ⳛ",
    top: SH * 0.09,
    left: SW * 0.7,
    size: 22,
    duration: 3100,
    opacity: 0.3,
    driftX: -2,
    driftY: 2,
  },
  {
    id: "g2",
    symbol: "ꂾ",
    top: SH * 0.18,
    left: SW * 0.88,
    size: 18,
    duration: 2700,
    opacity: 0.4,
    driftX: -2,
    driftY: -2,
  },
  {
    id: "g3",
    symbol: "𐂂",
    top: SH * 0.27,
    left: SW * 0.14,
    size: 24,
    duration: 2000,
    opacity: 0.28,
    driftX: 2,
    driftY: 2,
  },
  {
    id: "g4",
    symbol: "Ꝇ",
    top: SH * 0.93,
    left: SW * 0.4,
    size: 32,
    duration: 3500,
    opacity: 0.25,
    driftX: -2,
    driftY: 2,
  },
  {
    id: "g5",
    symbol: "꒴",
    top: SH * 0.82,
    left: SW * 0.06,
    size: 20,
    duration: 2200,
    opacity: 0.38,
    driftX: 2,
    driftY: -2,
  },
  {
    id: "g6",
    symbol: "ꘐ",
    top: SH * 0.86,
    left: SW * 0.8,
    size: 26,
    duration: 2900,
    opacity: 0.32,
    driftX: 2,
    driftY: -2,
  },
];

// Переключатели эффектов экрана.
// Здесь можно быстро отключать декоративные штуки без поиска по JSX.
const FX = {
  enabled: true,
  floatingGlyphs: true,
  shadows: false,
  drift: true,
  glyphCount: 7,
} as const;

type FloatingTextProps = {
  children: ReactNode;
  duration?: number;
  driftX?: number;
  driftY?: number;
  enableDrift?: boolean;
  jitterValue?: Animated.Value;
};

// Основная плавающая анимация вынесена из LoginScreen.
// Иначе при каждом вводе текста React создаёт новый тип компонента,
// и вся анимация у декоративных символов стартует заново.
const FloatingText: FC<FloatingTextProps> = ({
  children,
  duration = 2600,
  driftX = 10,
  driftY = 6,
  enableDrift = true,
  jitterValue,
}) => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!FX.enabled) {
      animValue.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [animValue, duration]);

  const rotateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["-8deg", "8deg"],
  });

  const rotateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["-8deg", "8deg"],
  });

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [driftY, -driftY],
  });

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-driftX, driftX],
  });

  // Это дополнительная микродрожь поверх основной плавной анимации.
  // Она запускается от ввода/нажатия, но не сбрасывает основной цикл.
  const jitterX = jitterValue?.interpolate({
    inputRange: [-1, 0, 1], // Сильнее по горизонтали, чтобы лучше заметить эффект при вводе
    outputRange: [0, 0, 0.5], // Чуть сильнее по горизонтали для лучшей заметности
  });

  const jitterY = jitterValue?.interpolate({
    inputRange: [-1, 0, 1], // Сильнее по вертикали, чтобы не перекрывать основной дрейф
    outputRange: [0.5, 0, 0], //  Слегка меньше по вертикали, чтобы не перекрывать основной дрейф
  });

  const jitterRotate = jitterValue?.interpolate({
    inputRange: [-1, 0, 1], // Лёгкая ротация для более заметного эффекта при вводе
    outputRange: ["-4deg", "0deg", "4deg"], // Лёгкая ротация для более заметного эффекта при вводе
  });

  return (
    <Animated.View
      style={{
        transform: [
          { perspective: 900 },
          { rotateX },
          { rotateY },
          ...(enableDrift && FX.drift ? [{ translateX }, { translateY }] : []),
          ...(jitterX && jitterY && jitterRotate
            ? [
                { translateX: jitterX },
                { translateY: jitterY },
                { rotateZ: jitterRotate },
              ]
            : []),
        ],
      }}
    >
      {children}
    </Animated.View>
  );
};

// Отдельный короткий jitter для декоративных символов.
// Он только наслаивается на текущую анимацию, а не перезапускает её.
const triggerGlyphJitter = (jitterValue: Animated.Value): void => {
  jitterValue.stopAnimation();
  jitterValue.setValue(0);

  Animated.sequence([
    Animated.timing(jitterValue, {
      toValue: 1,
      duration: 40,
      useNativeDriver: true,
    }),
    Animated.timing(jitterValue, {
      toValue: -1,
      duration: 40,
      useNativeDriver: true,
    }),
    Animated.timing(jitterValue, {
      toValue: 0.6,
      duration: 30,
      useNativeDriver: true,
    }),
    Animated.timing(jitterValue, {
      toValue: 0,
      duration: 30,
      useNativeDriver: true,
    }),
  ]).start();
};

/**
 * LoginScreen — экран входа в приложение.
 *
 * ЧТО ДЕЛАЕТ:
 * 1. Показывает форму для ввода имени пользователя
 * 2. При вводе обновляет локальное состояние
 * 3. При нажатии на кнопку "ВОЙТИ В ЧАТ" вызывает onLogin
 *
 * ПАРАМЕТРЫ (Props):
 * - onLogin: функция для входа, принимает имя и возвращает Promise
 *
 * КОГДА ИСПОЛЬЗУЕТСЯ:
 * - Когда приложение загружается и нет сохранённого имени пользователя
 */
const LoginScreen: FC<LoginScreenProps> = ({ onLogin }) => {
  // Состояние: имя, введённое пользователем
  const [tempName, setTempName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [errorText, setErrorText] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Общая микродрожь для всех плавающих символов вокруг формы.
  const glyphJitter = useRef(new Animated.Value(0)).current;

  const handleNameChange = (text: string): void => {
    setTempName(text);
    triggerGlyphJitter(glyphJitter);
  };

  const handlePasswordChange = (text: string): void => {
    setPassword(text);
    triggerGlyphJitter(glyphJitter);
  };

  const handleModeChange = (nextMode: "login" | "register"): void => {
    setMode(nextMode);
    triggerGlyphJitter(glyphJitter);
  };

  /**
   * Обработчик нажатия на кнопку "ВОЙТИ В ЧАТ"
   *
   * ЧТО ДЕЛАЕТ:
   * 1. Проверяет, что имя не пустое
   * 2. Очищает от лишних пробелов (trim())
   * 3. Вызывает функцию onLogin
   */
  const handlePress = async (): Promise<void> => {
    setErrorText("");

    // Проверяем, что имя содержит хотя бы один символ (не только пробелы)
    if (tempName.trim().length < 3) {
      setErrorText("Имя должно быть минимум 3 символа");
      return;
    }

    if (password.length < 6) {
      setErrorText("Пароль должен быть минимум 6 символов");
      return;
    }

    try {
      setIsSubmitting(true);
      await onLogin(tempName.trim(), password, mode);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ошибка авторизации";
      setErrorText(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {FX.enabled && FX.floatingGlyphs ? (
        <View pointerEvents="none" style={styles.floatingLayer}>
          {FLOATING_GLYPHS.slice(0, FX.glyphCount).map((item) => (
            <View
              key={item.id}
              style={[styles.glyphSlot, { top: item.top, left: item.left }]}
            >
              <FloatingText
                duration={item.duration}
                driftX={item.driftX}
                driftY={item.driftY}
                enableDrift
                jitterValue={glyphJitter}
              >
                <Text
                  style={[
                    styles.floatingGlyph,
                    {
                      fontSize: item.size,
                      opacity: item.opacity,
                    },
                    FX.shadows ? styles.floatingGlyphShadow : null,
                  ]}
                >
                  {item.symbol}
                </Text>
              </FloatingText>
            </View>
          ))}
        </View>
      ) : null}

      {/* Заголовок */}
      <Text style={styles.title}>-----⨕-----</Text>

      {/* Поле ввода имени */}
      <TextInput
        style={styles.input}
        placeholder="Твой ник..."
        placeholderTextColor="#999"
        value={tempName} // Текущее значение
        onChangeText={handleNameChange} // При вводе слегка дёргаем плавающие символы
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Пароль..."
        placeholderTextColor="#999"
        value={password}
        onChangeText={handlePasswordChange}
        secureTextEntry
        autoCapitalize="none"
      />

      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

      <View style={styles.switcher}>
        <TouchableOpacity
          onPress={() => handleModeChange("login")}
          style={[styles.modeBtn, mode === "login" && styles.modeBtnActive]}
        >
          <Text style={styles.modeBtnText}>Вход</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleModeChange("register")}
          style={[styles.modeBtn, mode === "register" && styles.modeBtnActive]}
        >
          <Text style={styles.modeBtnText}>Регистрация</Text>
        </TouchableOpacity>
      </View>

      {/* Кнопка входа */}
      <TouchableOpacity
        onPress={() => {
          triggerGlyphJitter(glyphJitter);
          handlePress();
        }}
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          {isSubmitting
            ? "Загрузка..."
            : mode === "login"
              ? "ВОЙТИ В ЧАТ"
              : "СОЗДАТЬ АККАУНТ"}
        </Text>
      </TouchableOpacity>
      <Text style={styles.title}>-----⨖-----</Text>
    </SafeAreaView>
  );
};

// Стили для компонента
const styles = StyleSheet.create({
  container: {
    flex: 1, // Занимает весь экран
    backgroundColor: COLORS.background,
    justifyContent: "center", // Центрируем вертикально
    alignItems: "center", // Центрируем горизонтально
  },
  title: {
    color: COLORS.myBubble,
    fontSize: 50, // Большой размер
    marginBottom: 40, // Отступ снизу
    marginTop: 30, // Отступ сверху
    zIndex: 1,
  },
  titleShadow: {
    textShadowColor: "rgba(0, 0, 0, 0.55)",
    textShadowOffset: { width: 5, height: 5 },
    textShadowRadius: 10,
  },
  input: {
    backgroundColor: "#3e454a", // Тёмный фон
    color: "#fff", // Белый текст
    width: "80%", // 80% ширины экрана
    padding: 15, // Внутренний отступ
    borderRadius: 10, // Закруглённые углы
    marginBottom: 20, // Отступ снизу
    zIndex: 1,
  },
  error: {
    width: "80%",
    color: "#ff8080",
    marginBottom: 12,
    zIndex: 1,
  },
  switcher: {
    flexDirection: "row",
    width: "80%",
    gap: 10,
    marginBottom: 16,
    zIndex: 1,
  },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  modeBtnActive: {
    backgroundColor: "#2f3a40",
    borderColor: COLORS.myBubble,
  },
  modeBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  button: {
    backgroundColor: COLORS.myBubble,
    padding: 15, // Внутренний отступ (делает кнопку выше)
    borderRadius: 10, // Закруглённые углы
    width: "80%", // 80% ширины экрана
    alignItems: "center", // Центрируем текст
    zIndex: 1,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  floatingLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  glyphSlot: {
    position: "absolute",
  },
  floatingGlyph: {
    color: "#a6b3eb",
  },
  floatingGlyphShadow: {
    textShadowColor: "rgba(151, 170, 255, 0.45)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});

export default LoginScreen;
