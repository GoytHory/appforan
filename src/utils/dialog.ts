import { Alert, Platform } from "react-native";

type DialogAction = {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

const isWeb = Platform.OS === "web";

const formatDialogText = (title: string, message?: string): string => {
  return message ? `${title}\n\n${message}` : title;
};

export const showInfo = (title: string, message?: string): void => {
  if (isWeb && typeof window !== "undefined") {
    window.alert(formatDialogText(title, message));
    return;
  }

  Alert.alert(title, message);
};

export const showConfirm = ({
  title,
  message,
  confirmText = "OK",
  cancelText = "Отмена",
  onConfirm,
  onCancel,
}: ConfirmOptions): void => {
  if (isWeb && typeof window !== "undefined") {
    const confirmed = window.confirm(formatDialogText(title, message));
    if (confirmed) {
      onConfirm?.();
    } else {
      onCancel?.();
    }
    return;
  }

  Alert.alert(title, message, [
    {
      text: cancelText,
      style: "cancel",
      onPress: onCancel,
    },
    {
      text: confirmText,
      style: "destructive",
      onPress: onConfirm,
    },
  ]);
};

export const showActions = (
  title: string,
  message: string,
  actions: DialogAction[],
): void => {
  if (isWeb && typeof window !== "undefined") {
    const printableActions = actions
      .map((action, index) => `${index + 1}. ${action.text}`)
      .join("\n");

    const raw = window.prompt(
      `${formatDialogText(title, message)}\n\n${printableActions}\n\nВведи номер действия`,
      "",
    );

    const selectedIndex = Number(raw) - 1;
    if (
      Number.isInteger(selectedIndex) &&
      selectedIndex >= 0 &&
      selectedIndex < actions.length
    ) {
      actions[selectedIndex].onPress?.();
    }
    return;
  }

  Alert.alert(title, message, actions);
};
