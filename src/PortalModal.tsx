import {
  createContext,
  memo,
  useRef,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { FC, ReactNode } from 'react';
import {
  BackHandler,
  Dimensions,
  Keyboard,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import type { KeyboardEvent, StyleProp, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Portal from './Portal';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// Modal açılış/kapanış animasyonlarında desteklenen isimler.
enum Animations {
  FADE_IN = 'fadeIn',
  FADE_OUT = 'fadeOut',
  SLIDE_IN_DOWN = 'slideInDown',
  SLIDE_OUT_DOWN = 'slideOutDown',
  SLIDE_IN_UP = 'slideInUp',
  SLIDE_OUT_UP = 'slideOutUp',
  SLIDE_IN_LEFT = 'slideInLeft',
  SLIDE_OUT_LEFT = 'slideOutLeft',
  SLIDE_IN_RIGHT = 'slideInRight',
  SLIDE_OUT_RIGHT = 'slideOutRight',
  ZOOM_FADE_IN = 'zoomFadeIn',
  ZOOM_FADE_OUT = 'zoomFadeOut',
  ZOOM_IN = 'zoomIn',
  ZOOM_OUT = 'zoomOut',
}

interface PortalModalProps {
  children?: ReactNode;
  isVisible: boolean;
  exitingTimeout?: number;
  enteringTimeout?: number;
  onModalHide?: () => void;
  onBackdropPress?: () => void;
  onBackButtonPress?: () => void;
  extraKeyboardHeight?: number;
  keyboardEnteringDuration?: number;
  keyboardExitingDuration?: number;
  disableKeyboardTransforming?: boolean;
  dismissKeyboardOnBackdropPress?: boolean;
  style?: StyleProp<ViewStyle>;
  backdropStyle?: StyleProp<Omit<ViewStyle, 'opacity'>>;
  contentContainerStyle?: StyleProp<Omit<ViewStyle, 'opacity' | 'transform'>>;
  enteringAnimation?:
    | 'fadeIn'
    | 'slideInDown'
    | 'slideInUp'
    | 'slideInLeft'
    | 'slideInRight'
    | 'zoomFadeIn'
    | 'zoomIn';
  exitingAnimation?:
    | 'fadeOut'
    | 'slideOutDown'
    | 'slideOutUp'
    | 'slideOutLeft'
    | 'slideOutRight'
    | 'zoomFadeOut'
    | 'zoomOut';
}

interface PortalModalSwiperProps {
  // Swipe alanında gösterilecek içerik (ör: drag handle veya header)
  children?: ReactNode;
  // Threshold geçildiğinde modal kapatmak için çağrılır
  onDismiss: () => void;
  // Kapatma için gereken minimum sürükleme mesafesi
  threshold?: number;
  style?: StyleProp<ViewStyle>;
  // Swipe davranışını tamamen kapatır
  disabled?: boolean;
  // İç scroll üst sınırda mı? değilse dismiss swipe devreye girmesin
  isScrollAtStart?: boolean;
  // true: önce nested scroll'u koru, sadece niyetli swipe'ta yakala
  prioritizeNestedScroll?: boolean;
  // Hangi yön(ler)de dismiss swipe desteklenecek
  swipeDirections?: SwipeDirection | SwipeDirection[];
  // Dismiss animasyon süresi (ms)
  dismissDuration?: number;
  // Threshold altında kalınca geri dönme animasyon süresi (ms)
  resetDuration?: number;
}

type SwipeDirection = 'left' | 'right' | 'top' | 'bottom';

interface PortalModalSwipeContextValue {
  // Dismiss animasyonunu ekranın dışına göndermek için ekran boyutları
  screenHeight: number;
  screenWidth: number;

  // Swipe sırasında doğrudan UI thread'de güncellenecek değerler
  contentSwipeTranslateX: SharedValue<number>;
  contentSwipeTranslateY: SharedValue<number>;
}

// Swiper ile modal gövdesi arasında iletişim kuran iç context.
const PortalModalSwipeContext =
  createContext<PortalModalSwipeContextValue | null>(null);

interface PortalModalComponent extends FC<PortalModalProps> {
  Swiper: FC<PortalModalSwiperProps>;
  Swipe: FC<PortalModalSwiperProps>;
}

const PortalModalSwiper: FC<PortalModalSwiperProps> = ({
  children,
  onDismiss,
  threshold = 120,
  style,
  disabled = false,
  isScrollAtStart = true,
  prioritizeNestedScroll = true,
  swipeDirections = 'bottom',
  dismissDuration = 150,
  resetDuration = 200,
}) => {
  // Swiper, modalın tamamını taşıyabilmek için parent context'e bağlanır.
  const swipeContext = useContext(PortalModalSwipeContext);

  // API hem string hem dizi kabul etsin diye normalize ediyoruz.
  const directions = useMemo<SwipeDirection[]>(() => {
    const normalized = Array.isArray(swipeDirections)
      ? swipeDirections
      : [swipeDirections];
    return normalized.length ? normalized : ['bottom'];
  }, [swipeDirections]);

  const allowsLeft = useMemo(() => directions.includes('left'), [directions]);
  const allowsRight = useMemo(() => directions.includes('right'), [directions]);
  const allowsTop = useMemo(() => directions.includes('top'), [directions]);
  const allowsBottom = useMemo(
    () => directions.includes('bottom'),
    [directions]
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!disabled)
        .activeOffsetX([-8, 8])
        .activeOffsetY([-8, 8])
        .onBegin(() => {
          if (!swipeContext) return;

          cancelAnimation(swipeContext.contentSwipeTranslateX);
          cancelAnimation(swipeContext.contentSwipeTranslateY);
        })
        .onUpdate((event) => {
          if (!swipeContext || !isScrollAtStart) return;

          const dx = event.translationX;
          const dy = event.translationY;
          const horizontalDominant = Math.abs(dx) >= Math.abs(dy);

          let matchedDirection: SwipeDirection | null = null;
          if (horizontalDominant) {
            if (dx > 0 && allowsRight) matchedDirection = 'right';
            else if (dx < 0 && allowsLeft) matchedDirection = 'left';
          }

          if (!matchedDirection) {
            if (dy > 0 && allowsBottom) matchedDirection = 'bottom';
            else if (dy < 0 && allowsTop) matchedDirection = 'top';
          }

          if (!matchedDirection) {
            if (dx !== 0 || dy !== 0) {
              swipeContext.contentSwipeTranslateX.value = 0;
              swipeContext.contentSwipeTranslateY.value = 0;
            }
            return;
          }

          const distance =
            matchedDirection === 'left' || matchedDirection === 'right'
              ? Math.abs(dx)
              : Math.abs(dy);
          const velocity =
            matchedDirection === 'left' || matchedDirection === 'right'
              ? Math.abs(event.velocityX)
              : Math.abs(event.velocityY);

          if (prioritizeNestedScroll) {
            const isIntentionalDismissSwipe = distance > 16 || velocity > 0.15;
            if (!isIntentionalDismissSwipe) return;
          } else if (distance <= 3) {
            return;
          }

          swipeContext.contentSwipeTranslateX.value =
            matchedDirection === 'left' || matchedDirection === 'right'
              ? dx
              : 0;
          swipeContext.contentSwipeTranslateY.value =
            matchedDirection === 'top' || matchedDirection === 'bottom'
              ? dy
              : 0;
        })
        .onEnd((event) => {
          if (!swipeContext || !isScrollAtStart) return;

          const dx = event.translationX;
          const dy = event.translationY;
          const horizontalDominant = Math.abs(dx) >= Math.abs(dy);

          let matchedDirection: SwipeDirection | null = null;
          if (horizontalDominant) {
            if (dx > 0 && allowsRight) matchedDirection = 'right';
            else if (dx < 0 && allowsLeft) matchedDirection = 'left';
          }

          if (!matchedDirection) {
            if (dy > 0 && allowsBottom) matchedDirection = 'bottom';
            else if (dy < 0 && allowsTop) matchedDirection = 'top';
          }

          if (!matchedDirection) {
            swipeContext.contentSwipeTranslateX.value = withTiming(0, {
              duration: resetDuration,
            });
            swipeContext.contentSwipeTranslateY.value = withTiming(0, {
              duration: resetDuration,
            });
            return;
          }

          const distance =
            matchedDirection === 'left' || matchedDirection === 'right'
              ? Math.abs(dx)
              : Math.abs(dy);

          if (distance >= threshold) {
            const toX =
              matchedDirection === 'left'
                ? -swipeContext.screenWidth
                : matchedDirection === 'right'
                  ? swipeContext.screenWidth
                  : 0;
            const toY =
              matchedDirection === 'top'
                ? -swipeContext.screenHeight
                : matchedDirection === 'bottom'
                  ? swipeContext.screenHeight
                  : 0;

            swipeContext.contentSwipeTranslateX.value = withTiming(
              toX,
              { duration: dismissDuration },
              (finished) => {
                if (finished) {
                  scheduleOnRN(onDismiss);
                }
              }
            );
            swipeContext.contentSwipeTranslateY.value = withTiming(toY, {
              duration: dismissDuration,
            });
            return;
          }

          swipeContext.contentSwipeTranslateX.value = withTiming(0, {
            duration: resetDuration,
          });
          swipeContext.contentSwipeTranslateY.value = withTiming(0, {
            duration: resetDuration,
          });
        }),
    [
      allowsBottom,
      allowsLeft,
      allowsRight,
      allowsTop,
      disabled,
      isScrollAtStart,
      onDismiss,
      prioritizeNestedScroll,
      dismissDuration,
      resetDuration,
      swipeContext,
      threshold,
    ]
  );

  return (
    // Bu wrapper sadece gesture yakalayıcıdır.
    // Asıl hareket PortalModalBase içindeki content'e uygulanır.
    <GestureDetector gesture={panGesture}>
      <View style={style}>{children}</View>
    </GestureDetector>
  );
};

const PortalModalBase: FC<PortalModalProps> = ({
  children,
  isVisible: _isVisible,
  exitingTimeout = 300,
  enteringTimeout = 500,
  onModalHide,
  onBackdropPress,
  onBackButtonPress,
  extraKeyboardHeight = 0,
  keyboardEnteringDuration,
  keyboardExitingDuration,
  disableKeyboardTransforming = false,
  dismissKeyboardOnBackdropPress = false,
  style,
  backdropStyle,
  contentContainerStyle,
  enteringAnimation,
  exitingAnimation,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const isKeyboardVisibleRef = useRef(false);

  const { height, width } = Dimensions.get('screen');

  // Backdrop ve içerik animasyon değerleri
  const backdropOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(1);
  const contentTranslateY = useSharedValue(0);
  const contentTranslateX = useSharedValue(0);
  const contentScale = useSharedValue(1);
  const contentKeyboardTranslateY = useSharedValue(0);

  // Swipe sırasında dinamik taşınan ekstra offset'ler
  const contentSwipeTranslateX = useSharedValue(0);
  const contentSwipeTranslateY = useSharedValue(0);

  const swipeContextValue = useMemo<PortalModalSwipeContextValue>(
    () => ({
      screenHeight: height,
      screenWidth: width,
      contentSwipeTranslateX,
      contentSwipeTranslateY,
    }),
    [contentSwipeTranslateX, contentSwipeTranslateY, height, width]
  );

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
      transform: [
        // Normal enter/exit animasyonu + swipe offset birlikte uygulanır.
        {
          translateY:
            contentTranslateY.value +
            contentSwipeTranslateY.value +
            contentKeyboardTranslateY.value,
        },
        { translateX: contentTranslateX.value + contentSwipeTranslateX.value },
        { scale: contentScale.value },
      ],
    };
  });

  useEffect(() => {
    if (!_isVisible || !dismissKeyboardOnBackdropPress) {
      isKeyboardVisibleRef.current = false;
      return;
    }

    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onKeyboardShow = () => {
      isKeyboardVisibleRef.current = true;
    };

    const onKeyboardHide = () => {
      isKeyboardVisibleRef.current = false;
    };

    const showListener = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideListener = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showListener.remove();
      hideListener.remove();
      isKeyboardVisibleRef.current = false;
    };
  }, [_isVisible, dismissKeyboardOnBackdropPress]);

  const handleBackdropPress = () => {
    if (dismissKeyboardOnBackdropPress && isKeyboardVisibleRef.current) {
      Keyboard.dismiss();
      return;
    }

    onBackdropPress?.();
  };

  useEffect(() => {
    if (_isVisible) {
      cancelAnimation(backdropOpacity);
      cancelAnimation(contentOpacity);
      cancelAnimation(contentTranslateY);
      cancelAnimation(contentTranslateX);
      cancelAnimation(contentScale);
      cancelAnimation(contentKeyboardTranslateY);
      cancelAnimation(contentSwipeTranslateX);
      cancelAnimation(contentSwipeTranslateY);

      // Modal açılırken önce local görünürlüğü aktif et.
      setIsVisible(true);
      backdropOpacity.value = withTiming(1, { duration: enteringTimeout });

      // Yeni açılışta tüm değerleri başlangıç noktasına çek.
      contentOpacity.value = 1;
      contentTranslateY.value = 0;
      contentTranslateX.value = 0;
      contentScale.value = 1;
      contentKeyboardTranslateY.value = 0;
      contentSwipeTranslateX.value = 0;
      contentSwipeTranslateY.value = 0;

      switch (enteringAnimation) {
        // Seçilen açılış animasyonuna göre başlangıç/değer set edilir.
        case Animations.FADE_IN:
          contentOpacity.value = 0;
          contentOpacity.value = withTiming(1, { duration: enteringTimeout });
          break;
        case Animations.SLIDE_IN_DOWN:
          contentTranslateY.value = height;
          contentTranslateY.value = withTiming(0, {
            duration: enteringTimeout,
          });
          break;
        case Animations.SLIDE_IN_UP:
          contentTranslateY.value = -height;
          contentTranslateY.value = withTiming(0, {
            duration: enteringTimeout,
          });
          break;
        case Animations.SLIDE_IN_LEFT:
          contentTranslateX.value = -width;
          contentTranslateX.value = withTiming(0, {
            duration: enteringTimeout,
          });
          break;
        case Animations.SLIDE_IN_RIGHT:
          contentTranslateX.value = width;
          contentTranslateX.value = withTiming(0, {
            duration: enteringTimeout,
          });
          break;
        case Animations.ZOOM_FADE_IN:
          contentOpacity.value = 0;
          contentScale.value = 0.85;
          contentOpacity.value = withTiming(1, { duration: enteringTimeout });
          contentScale.value = withTiming(1, { duration: enteringTimeout });
          break;
        case Animations.ZOOM_IN:
          contentScale.value = 0.85;
          contentScale.value = withTiming(1, { duration: enteringTimeout });
          break;
        default:
          break;
      }

      return undefined;
    } else {
      cancelAnimation(backdropOpacity);
      cancelAnimation(contentOpacity);
      cancelAnimation(contentTranslateY);
      cancelAnimation(contentTranslateX);
      cancelAnimation(contentScale);
      cancelAnimation(contentKeyboardTranslateY);
      cancelAnimation(contentSwipeTranslateX);
      cancelAnimation(contentSwipeTranslateY);

      // Modal kapanışında backdrop'u fade-out yap.
      backdropOpacity.value = withTiming(0, { duration: exitingTimeout });

      // Baz state'leri normalize et, çıkış animasyonunu ayrı uygula.
      contentOpacity.value = 1;
      contentTranslateY.value = 0;
      contentTranslateX.value = 0;
      contentScale.value = 1;
      contentKeyboardTranslateY.value = 0;

      switch (exitingAnimation) {
        // Seçilen kapanış animasyonuna göre içerik çıkış hareketi.
        case Animations.FADE_OUT:
          contentOpacity.value = withTiming(0, { duration: exitingTimeout });
          break;
        case Animations.SLIDE_OUT_DOWN:
          contentTranslateY.value = withTiming(height, {
            duration: exitingTimeout,
          });
          break;
        case Animations.SLIDE_OUT_UP:
          contentTranslateY.value = withTiming(-height, {
            duration: exitingTimeout,
          });
          break;
        case Animations.SLIDE_OUT_LEFT:
          contentTranslateX.value = withTiming(-width, {
            duration: exitingTimeout,
          });
          break;
        case Animations.SLIDE_OUT_RIGHT:
          contentTranslateX.value = withTiming(width, {
            duration: exitingTimeout,
          });
          break;
        case Animations.ZOOM_FADE_OUT:
          contentOpacity.value = withTiming(0, { duration: exitingTimeout });
          contentScale.value = withTiming(0.85, { duration: exitingTimeout });
          break;
        case Animations.ZOOM_OUT:
          contentScale.value = withTiming(0.85, { duration: exitingTimeout });
          break;
        default:
          break;
      }

      const timeout = setTimeout(() => {
        setIsVisible(false);
        onModalHide?.();
      }, exitingTimeout);
      return () => clearTimeout(timeout);
    }
  }, [
    _isVisible,
    backdropOpacity,
    contentOpacity,
    contentTranslateY,
    contentTranslateX,
    contentScale,
    contentKeyboardTranslateY,
    contentSwipeTranslateX,
    contentSwipeTranslateY,
    enteringAnimation,
    exitingAnimation,
    enteringTimeout,
    exitingTimeout,
    onModalHide,
    height,
    width,
  ]);

  useEffect(() => {
    if (!_isVisible || disableKeyboardTransforming) {
      contentKeyboardTranslateY.value = 0;
      return;
    }

    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const animateKeyboardOffset = (toValue: number, duration: number) => {
      cancelAnimation(contentKeyboardTranslateY);
      contentKeyboardTranslateY.value = withTiming(toValue, { duration });
    };

    const onKeyboardShow = (event: KeyboardEvent) => {
      const keyboardHeight = Math.max(event?.endCoordinates?.height || 0, 0);
      const extraHeight = Math.max(extraKeyboardHeight || 0, 0);
      const animationDuration =
        typeof keyboardEnteringDuration === 'number'
          ? keyboardEnteringDuration
          : Platform.OS === 'ios' && typeof event?.duration === 'number'
            ? event.duration
            : 250;

      animateKeyboardOffset(-(keyboardHeight + extraHeight), animationDuration);
    };

    const onKeyboardHide = (event: KeyboardEvent) => {
      const animationDuration =
        typeof keyboardExitingDuration === 'number'
          ? keyboardExitingDuration
          : Platform.OS === 'ios' && typeof event?.duration === 'number'
            ? event.duration
            : 250;

      animateKeyboardOffset(0, animationDuration);
    };

    const showListener = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideListener = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [
    _isVisible,
    contentKeyboardTranslateY,
    disableKeyboardTransforming,
    extraKeyboardHeight,
    keyboardEnteringDuration,
    keyboardExitingDuration,
  ]);

  useEffect(() => {
    // Modal kapalıysa back handler gerekmez.
    if (!_isVisible) return;

    const handleBackPress = () => {
      // Önce explicit back callback varsa onu çalıştır.
      if (onBackButtonPress) {
        onBackButtonPress();
        return true;
      }

      // Yoksa backdrop callback'i fallback olarak kullan.
      if (onBackdropPress) {
        onBackdropPress();
        return true;
      }

      return false;
    };

    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => {
      backSubscription.remove();
    };
  }, [_isVisible, onBackdropPress, onBackButtonPress]);

  // Local görünürlük false ise portal host'a hiçbir şey render etmeyiz.
  if (!isVisible) return null;

  return (
    <Portal>
      {/* Modal root container */}
      <View style={[styles.container, style]}>
        {/* Arkaplan katmanı */}
        <Animated.View
          pointerEvents={isVisible ? 'auto' : 'none'}
          style={[styles.backdrop, backdropStyle, backdropAnimatedStyle]}
          onTouchStart={handleBackdropPress}
        />

        {/* Modal içerik katmanı */}
        <Animated.View
          style={[
            styles.contentContainer,
            contentContainerStyle,
            contentAnimatedStyle,
          ]}
        >
          {/*
            Swiper alt bileşenleri bu provider üzerinden modal gövdesini taşır.
            Böylece swipe trigger alanı küçük olsa bile tüm modal birlikte hareket eder.
          */}
          <PortalModalSwipeContext.Provider value={swipeContextValue}>
            {children}
          </PortalModalSwipeContext.Provider>
        </Animated.View>
      </View>
    </Portal>
  );
};

const PortalModal = PortalModalBase as PortalModalComponent;
const MemoizedPortalModalSwiper = memo(PortalModalSwiper);
PortalModal.Swiper = MemoizedPortalModalSwiper;
PortalModal.Swipe = MemoizedPortalModalSwiper;

export default PortalModal;

const styles = StyleSheet.create({
  container: { flex: 1 },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#00000066',
  },
  contentContainer: {},
});
