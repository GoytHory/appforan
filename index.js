import { registerRootComponent } from 'expo';
import App from './src/App';  // Импортируем главный компонент из новой структуры TypeScript

/**
 * registerRootComponent — регистрирует главный компонент приложения в Expo.
 * 
 * ЧТО ДЕЛАЕТ:
 * 1. Вызывает AppRegistry.registerComponent('main', () => App)
 * 2. Обеспечивает правильную инициализацию среды (Expo Go или native build)
 * 3. Устанавливает Hot Reload и другие разработческие инструменты
 */
registerRootComponent(App);
