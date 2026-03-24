import React, { FC, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Vibration,
  Animated,
} from "react-native";
import { COLORS } from "../constants/colors";
import { BottomProps } from "../types";

/**
 * Bottom — компонент нижней панели для ввода сообщений.
 *
 * ЧТО ДЕЛАЕТ:
 * 1. Отображает поле ввода текста
 * 2. Обновляет текст при вводе (через onTextChange)
 * 3. Показывает кнопку отправки
 * 4. При отправке вызывает onSend
 * 5. Вызывает тактильную отдачу при нажатии кнопки
 *
 * ПАРАМЕТРЫ (Props):
 * - value: текущее значение в инпуте (строка)
 * - onTextChange: функция, вызывается при изменении текста
 * - onSend: функция, вызывается при отправке
 */
export const Bottom: FC<BottomProps> = ({
  value, // Текущий текст
  onTextChange, // Функция изменения
  onSend, // Функция отправки
  onOpenMediaPicker,
  onToggleAudioRecording,
  isRecordingAudio,
  onCancelAudioRecording,
}) => {
  // Ref для фокуса на инпут после отправки
  // useRef создаёт ссылку, которая не теряется при ре-рендере
  const inputRef = useRef<TextInput>(null);

  // sendGestureState управляет визуальным состоянием кнопки отправки.
  // idle        - состояние покоя
  // press       - палец только что нажал кнопку
  // hold        - долгий тап (удержание)
  // swipeCancel - палец увели вверх для отмены отправки
  // release     - короткий успешный тап (сообщение отправлено)
  const [sendGestureState, setSendGestureState] = useState<
    "idle" | "press" | "hold" | "swipeCancel" | "release"
  >("idle");

  // Координата Y в момент касания. Нужна, чтобы посчитать,
  // насколько далеко палец ушел вверх во время удержания.
  const pressStartY = useRef<number | null>(null);

  // movedUpToCancel = true, если пользователь сделал жест отмены (свайп вверх).
  // Этот флаг блокирует отправку в onPress.
  const movedUpToCancel = useRef(false);

  // longPressTriggered = true, если сработал onLongPress.
  // Этот флаг отличает обычный тап от удержания.
  const longPressTriggered = useRef(false);

  // Наборы вибрации для разных сценариев взаимодействия:
  // [пауза, вибрация, пауза, вибрация, ...] в миллисекундах.
  // Сначала короткий импульс при касании (подтверждение, что кнопка "схватилась").
  const PRESS_VIBRATION_PATTERN = [0, 1];
  // При удержании даем более заметный паттерн.
  const HOLD_VIBRATION_PATTERN = [0, 20, 70, 10];
  // При успешной отправке - мягкий двойной отклик.
  const SEND_VIBRATION_PATTERN = [0, 10];
  // При отмене свайпом вверх - ритм, который ощущается иначе, чем отправка.
  const SWIPE_CANCEL_VIBRATION_PATTERN = [0, 20, 25, 15, 25, 10];

  // Минимальное смещение пальца вверх (в px), после которого считаем,
  // что пользователь хочет отменить действие свайпом.
  const SWIPE_CANCEL_THRESHOLD = 140; // Чем больше, тем дальше нужно увести палец для отмены. 80px - это примерно 1.5-2 см на экране, что достаточно для уверенного жеста, но не слишком далеко.
  const CANCEL_ZONE_HEIGHT = 50; // Высота визуальной зоны отмены внутри bottomBar.
  const CANCEL_ZONE_SIDE_PADDING = 20; // меньше = уже зона по бокам
  const CANCEL_ZONE_SHOW_DURATION = 160; // Длительность анимации появления зоны отмены.
  const CANCEL_ZONE_HIDE_DURATION = 120; // Длительность анимации скрытия зоны отмены.
  const CANCEL_ZONE_SCALE_FROM = 0.8; // Начальный масштаб зоны отмены при появлении (для эффекта "вырастания"). Меньше 1 = начинается чуть меньше, чем конечный размер. 0.94 - это примерно 6% уменьшение, что создаёт заметный, но не слишком резкий эффект роста до полного размера.

  // Верхняя граница визуальной зоны отмены внутри bottomBar.
  // null = зона скрыта.
  const [cancelZoneTop, setCancelZoneTop] = useState<number | null>(null);
  const cancelZoneAnim = useRef(new Animated.Value(0)).current;
  const bottomBarRef = useRef<View>(null);
  const bottomBarPageY = useRef(0);

  const sendButtonRef = useRef<View>(null);
  const cancelZonePageLeft = useRef<number | null>(null);
  const cancelZonePageRight = useRef<number | null>(null);

  // Границы зоны отмены в координатах экрана (pageY).
  const cancelZonePageTop = useRef<number | null>(null);
  const cancelZonePageBottom = useRef<number | null>(null);

  const measureBottomBar = () => {
    bottomBarRef.current?.measureInWindow((_, y) => {
      bottomBarPageY.current = y + 30; // Сохраняем координату Y нижней панели для расчёта зоны отмены.
    });
  };

  // Унифицированный запуск вибрации:
  // 1) останавливаем предыдущий шаблон, чтобы паттерны не накладывались,
  // 2) запускаем новый шаблон без повторения.
  const runVibration = (pattern: number[]) => {
    Vibration.cancel();
    Vibration.vibrate(pattern, false);
  };

  // Небольшая задержка перед возвратом в idle нужна,
  // чтобы пользователь увидел состояние release/hold/cancel.
  const resetGestureVisual = () => {
    setTimeout(() => setSendGestureState("idle"), 140);
  };

  const animateCancelZone = (
    toValue: number,
    duration: number,
    onEnd?: () => void,
  ) => {
    Animated.timing(cancelZoneAnim, {
      toValue,
      duration,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && onEnd) {
        onEnd();
      }
    });
  };

  // onPressIn вызывается сразу в момент касания кнопки.
  // Здесь инициализируем жест и сбрасываем флаги предыдущих взаимодействий.
  const handleSendPressIn = (event: any) => {
    measureBottomBar();
    const startY = event.nativeEvent.pageY;
    pressStartY.current = startY;
    movedUpToCancel.current = false;
    longPressTriggered.current = false;
    cancelRecordingRequested.current = false;
    setSendGestureState("press");

    // Зона отмены: от (startY - threshold - height) до (startY - threshold).
    // Срабатывает, когда палец входит в этот диапазон pageY.
    const zoneBottom = startY - SWIPE_CANCEL_THRESHOLD;
    const zoneTop = zoneBottom - CANCEL_ZONE_HEIGHT;
    cancelZonePageTop.current = zoneTop;
    cancelZonePageBottom.current = zoneBottom;

    // До long press зона отмены скрыта.
    setCancelZoneTop(null);
    cancelZoneAnim.setValue(0);
    //runVibration(PRESS_VIBRATION_PATTERN);

    sendButtonRef.current?.measureInWindow((x, _, width) => {
      // Зона отмены по X — центрируем по кнопке с отступом ±60px
      cancelZonePageLeft.current = x - CANCEL_ZONE_SIDE_PADDING;
      cancelZonePageRight.current = x + width + CANCEL_ZONE_SIDE_PADDING;
    });
  };

  const cancelRecordingRequested = useRef(false);
  // onTouchMove следит за движением пальца.
  // Если палец ушел вверх дальше порога - переводим кнопку в режим отмены.
  const handleSendPressMove = (event: any) => {
    if (!longPressTriggered.current) return;
    if (movedUpToCancel.current) return;
    if (
      cancelZonePageBottom.current == null ||
      cancelZonePageLeft.current == null ||
      cancelZonePageRight.current == null
    )
      return;

    const { pageX, pageY } = event.nativeEvent;

    const inY = pageY <= cancelZonePageBottom.current;
    const inX =
      pageX >= cancelZonePageLeft.current &&
      pageX <= cancelZonePageRight.current;

    if (inY && inX) {
      movedUpToCancel.current = true;
      cancelRecordingRequested.current = true; // пометили: при отпускании отменяем запись
      setSendGestureState("swipeCancel");
      runVibration(SWIPE_CANCEL_VIBRATION_PATTERN);
    }
  };

  // onLongPress срабатывает, если пользователь удерживает кнопку.
  // Если жест уже перешел в swipeCancel, удержание игнорируем.
  const handleSendLongPress = () => {
    if (movedUpToCancel.current) {
      return;
    }

    longPressTriggered.current = true;
    setSendGestureState("hold");
    if (cancelZonePageTop.current != null) {
      setCancelZoneTop(cancelZonePageTop.current - bottomBarPageY.current);
      animateCancelZone(1, CANCEL_ZONE_SHOW_DURATION);
    }
    runVibration(HOLD_VIBRATION_PATTERN);
  };

  // onPress срабатывает как "короткий тап".
  // Но мы дополнительно фильтруем кейсы:
  // - если был swipeCancel, отправка запрещена,
  // - если был longPress, отправка тоже не происходит.
  const handleSendPress = () => {
    if (movedUpToCancel.current || longPressTriggered.current) {
      return;
    }

    // Визуально фиксируем успешный tap->send.
    setSendGestureState("release");

    // Вибрация подтверждения отправки.
    //Vibration.vibrate(SEND_VIBRATION_PATTERN, false);

    // Бизнес-действие: отправка сообщения наверх в родительский компонент.
    onSend();

    // Возврат кнопки в исходное состояние.
    resetGestureVisual();
  };

  // onPressOut срабатывает при отпускании пальца.
  // Здесь завершаем жест и очищаем временные данные.
  const handleSendPressOut = () => {
    // Если был cancel/hold, дадим пользователю коротко увидеть итоговый визуал.
    if (movedUpToCancel.current || longPressTriggered.current) {
      resetGestureVisual();
    }

    // Полный сброс внутренних ref-флагов для следующего касания.
    pressStartY.current = null;
    movedUpToCancel.current = false;
    longPressTriggered.current = false;
    cancelZonePageTop.current = null;
    cancelZonePageBottom.current = null;
    if (cancelZoneTop != null) {
      animateCancelZone(0, CANCEL_ZONE_HIDE_DURATION, () =>
        setCancelZoneTop(null),
      );
    } else {
      setCancelZoneTop(null);
    }
  };

  // Динамический стиль кнопки отправки.
  // Он зависит от логического состояния жеста, а не только от pressed,
  // чтобы у каждого сценария был заметно свой визуальный язык.
  const getSendButtonDynamicStyle = (pressed: boolean) => {
    switch (sendGestureState) {
      // Начальное касание: легкое затемнение и уменьшение.
      case "press":
        return {
          backgroundColor: "#2f5f8a",
          transform: [{ scale: 0.93 }],
        };
      // Удержание: зеленый оттенок + контур.
      case "hold":
        return {
          backgroundColor: "#1e7f68",
          borderWidth: 2,
          borderColor: "#8fe9cd",
          transform: [{ scale: 2 }],
        };
      // Свайп-отмена: красный оттенок + небольшое смещение вверх.
      case "swipeCancel":
        return {
          backgroundColor: "#8a3a4c",
          borderWidth: 2,
          borderColor: "#f3afbe",
          transform: [{ scale: 1.9 }, { translateY: -6 }],
        };
      // Успешный отпуск: спокойный "подтверждающий" синий.
      case "release":
        return {
          backgroundColor: "#2b78b8",
          transform: [{ scale: 0.98 }],
        };
      // Обычное поведение кнопки, если нет специальных состояний.
      default:
        return {
          backgroundColor: pressed ? "#366990" : "#4d799c",
          transform: [{ scale: pressed ? 0.95 : 1 }],
        };
    }
  };

  return (
    <View
      ref={bottomBarRef}
      onLayout={measureBottomBar}
      style={styles.bottomBar}
    >
      {cancelZoneTop !== null && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.cancelZone,
            {
              top: cancelZoneTop,
              opacity: cancelZoneAnim,
              transform: [
                {
                  scale: cancelZoneAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [CANCEL_ZONE_SCALE_FROM, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.buttonText}>⨯</Text>
        </Animated.View>
      )}

      {/* Поле ввода сообщения */}
      <TextInput
        ref={inputRef} // Ссылка на инпут
        style={styles.input}
        placeholder="Введите текст..." // Текст-подсказка
        blurOnSubmit={false} // Не закрывать клавиатуру при Enter
        placeholderTextColor="#acaaaa" // Цвет подсказки
        value={value} // Текущее значение
        onChangeText={onTextChange} // Функция при изменении текста
        onSubmitEditing={onSend} // Функция при нажатии Enter на клавиатуре
      />

      {/* Кнопка отправки */}
      <Pressable
        onPress={onOpenMediaPicker}
        style={({ pressed }) => [
          {
            transform: [{ scale: pressed ? 0.9 : 1 }], // Добавляем эффект уменьшения
          },
          styles.button,
        ]}
      >
        {/* Иконка прикрепления */}
        <Text style={styles.buttonText}>⧜</Text>
      </Pressable>

      {/*<Pressable
      //  onPress={onToggleAudioRecording}
      //  style={({ pressed }) => [
      //    {
      //      transform: [{ scale: pressed ? 0.9 : 1 }],
      //      backgroundColor: isRecordingAudio ? "#8a3a4c" : "#4d799c",
      //    },
      //    styles.button,
      //  ]}
     // >
     //   <Text style={styles.buttonText}>{isRecordingAudio ? "■" : "⦿"}</Text>
     //</View> </Pressable>*/}

      <Pressable
        ref={sendButtonRef} // Ссылка на кнопку отправки для измерений
        onPress={handleSendPress}
        // Момент касания (палец лег на кнопку).
        onPressIn={handleSendPressIn}
        // Движение пальца по экрану во время касания.
        onTouchMove={handleSendPressMove}
        // Удержание кнопки дольше delayLongPress.
        onLongPress={() => {
          handleSendLongPress();
          onToggleAudioRecording();
        }}
        // Порог времени (мс), после которого касание считается удержанием.
        delayLongPress={380}
        // Момент завершения касания (палец отпущен).
        onPressOut={() => {
          const shouldCancelVoice =
            longPressTriggered.current &&
            cancelRecordingRequested.current &&
            isRecordingAudio;

          const shouldSendVoice =
            longPressTriggered.current &&
            !cancelRecordingRequested.current &&
            isRecordingAudio;

          handleSendPressOut();

          if (shouldCancelVoice) {
            onCancelAudioRecording?.(); // стоп + удалить локальный файл, без отправки
            return;
          }

          if (shouldSendVoice) {
            onToggleAudioRecording(); // стоп + отправка
          }
        }}
        pressRetentionOffset={{
          top: 9999,
          bottom: 9999,
          left: 9999,
          right: 9999,
        }}
        style={({ pressed }) => [
          // Динамика по текущему жесту + базовые размеры из styles.button.
          getSendButtonDynamicStyle(pressed),
          styles.button,
        ]}
      >
        {/* Иконка отправить */}
        <Text style={styles.buttonText}>⋺</Text>
      </Pressable>
    </View>
  );
};

// Стили для компонента
const styles = StyleSheet.create({
  bottomBar: {
    height: 70, // Высота панели
    backgroundColor: COLORS.header,
    flexDirection: "row", // Элементы в ряд
    alignItems: "center", // Центрируем по центру
    paddingHorizontal: 10, // Боковые отступы
  },
  button: {
    marginLeft: 10, // Отступ от инпута
    width: 45, // Ширина кнопки
    height: 45, // Высота кнопки
    backgroundColor: "#4d799c", // Цвет кнопки
    borderRadius: 22.5, // Круглая кнопка (половина ширины)
    justifyContent: "center", // Центрируем контент
    alignItems: "center",
    zIndex: 99, // Выше других элементов
  },
  buttonText: {
    fontSize: 30, // Размер иконки
    color: "#dadada", // Цвет иконки
  },
  input: {
    flex: 1, // Занимает всё свободное место
    height: 40, // Высота инпута
    backgroundColor: "rgba(255,255,255,0.2)", // Полупрозрачный белый фон
    borderRadius: 20, // Закруглённые края (как в Telegram)
    paddingHorizontal: 15, // Отступ текста от краев
    color: COLORS.otherText, // Цвет вводимого текста
  },

  cancelZone: {
    position: "absolute",
    left: 290,
    right: 10,
    height: 60,
    borderRadius: 29,
    backgroundColor: "#4d799c86",
    borderWidth: 5,
    borderColor: "rgba(207, 127, 127, 0.97)",
    zIndex: 200,
    justifyContent: "center",
    alignItems: "center",
  },
});
