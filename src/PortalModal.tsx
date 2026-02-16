import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { FC, ReactNode } from 'react';
import {
  BackHandler,
  Dimensions,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Portal from './Portal';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

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
  onBackdropPress?: () => void;
  onBackButtonPress?: () => void;
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
}

type SwipeDirection = 'left' | 'right' | 'top' | 'bottom';

interface PortalModalSwipeContextValue {
  // Dismiss animasyonunu ekranın dışına göndermek için ekran boyutları
  screenHeight: number;
  screenWidth: number;

  // Kullanıcı parmağını hareket ettirirken modal içeriğini anlık taşır
  setContentSwipeTranslation: (x: number, y: number) => void;

  // Parmak bırakıldığında yaylanma veya dismiss için animasyonlu taşıma
  animateContentSwipeTranslation: (
    x: number,
    y: number,
    duration: number
  ) => void;
}

// Swiper ile modal gövdesi arasında iletişim kuran iç context.
const PortalModalSwipeContext =
  createContext<PortalModalSwipeContextValue | null>(null);

interface PortalModalComponent extends FC<PortalModalProps> {
  Swiper: FC<PortalModalSwiperProps>;
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

  // Hızlı direction kontrolü için Set.
  const allowedDirectionSet = useMemo(() => new Set(directions), [directions]);

  // Gelen dx/dy değerinden aktif swipe yönünü çıkarır.
  // Yön izinli değilse null döner.
  const getMatchedDirection = useCallback(
    (dx: number, dy: number): SwipeDirection | null => {
      const horizontalDominant = Math.abs(dx) >= Math.abs(dy);

      if (horizontalDominant) {
        if (dx > 0 && allowedDirectionSet.has('right')) return 'right';
        if (dx < 0 && allowedDirectionSet.has('left')) return 'left';
      }

      if (dy > 0 && allowedDirectionSet.has('bottom')) return 'bottom';
      if (dy < 0 && allowedDirectionSet.has('top')) return 'top';

      return null;
    },
    [allowedDirectionSet]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // İlk touch anında hemen sahiplenme; move anında karar veriyoruz.
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Context yoksa veya disabled ise hiç devreye girme.
          if (disabled || !swipeContext) return false;

          // İç scroll hareketine öncelik için dışarıdan kontrol noktası.
          if (!isScrollAtStart) return false;

          const matchedDirection = getMatchedDirection(
            gestureState.dx,
            gestureState.dy
          );
          if (!matchedDirection) return false;

          // Nested scroll önceliği kapalıysa daha küçük mesafede yakala.
          if (!prioritizeNestedScroll) {
            const distance =
              matchedDirection === 'left' || matchedDirection === 'right'
                ? Math.abs(gestureState.dx)
                : Math.abs(gestureState.dy);
            return distance > 3;
          }

          // Nested scroll önceliği açıksa kullanıcı niyeti belirgin olmalı.
          const velocity =
            matchedDirection === 'left' || matchedDirection === 'right'
              ? Math.abs(gestureState.vx)
              : Math.abs(gestureState.vy);
          const distance =
            matchedDirection === 'left' || matchedDirection === 'right'
              ? Math.abs(gestureState.dx)
              : Math.abs(gestureState.dy);
          const isIntentionalDismissSwipe = distance > 16 || velocity > 0.15;
          return isIntentionalDismissSwipe;
        },
        // Parent/child responder çatışmasında devri mümkün kıl.
        onPanResponderTerminationRequest: () => true,
        // Native scroll responder'larını bloklama.
        onShouldBlockNativeResponder: () => false,
        onPanResponderMove: (_, gestureState) => {
          // Parmak hareket ederken modal gövdesini aynı yönde taşı.
          const matchedDirection = getMatchedDirection(
            gestureState.dx,
            gestureState.dy
          );
          if (!matchedDirection) {
            swipeContext?.setContentSwipeTranslation(0, 0);
            return;
          }

          const nextTranslateX =
            matchedDirection === 'left' || matchedDirection === 'right'
              ? gestureState.dx
              : 0;
          const nextTranslateY =
            matchedDirection === 'top' || matchedDirection === 'bottom'
              ? gestureState.dy
              : 0;
          swipeContext?.setContentSwipeTranslation(
            nextTranslateX,
            nextTranslateY
          );
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!swipeContext) return;

          // Bırakıldığında yön tespit edilemediyse başlangıca dön.
          const matchedDirection = getMatchedDirection(
            gestureState.dx,
            gestureState.dy
          );
          if (!matchedDirection) {
            swipeContext.animateContentSwipeTranslation(0, 0, 200);
            return;
          }

          const distance =
            matchedDirection === 'left' || matchedDirection === 'right'
              ? Math.abs(gestureState.dx)
              : Math.abs(gestureState.dy);

          if (distance >= threshold) {
            // Seçilen yöne göre ekran dışına göndererek dismiss hissi ver.
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
            swipeContext.animateContentSwipeTranslation(toX, toY, 150);
            onDismiss();
            return;
          }

          // Threshold geçilmediyse modalı eski yerine geri getir.
          swipeContext.animateContentSwipeTranslation(0, 0, 200);
        },
        onPanResponderTerminate: (_, gestureState) => {
          if (!swipeContext) return;

          const matchedDirection = getMatchedDirection(
            gestureState.dx,
            gestureState.dy
          );
          if (!matchedDirection) {
            swipeContext.animateContentSwipeTranslation(0, 0, 200);
            return;
          }

          const distance =
            matchedDirection === 'left' || matchedDirection === 'right'
              ? Math.abs(gestureState.dx)
              : Math.abs(gestureState.dy);

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
            swipeContext.animateContentSwipeTranslation(toX, toY, 150);
            onDismiss();
            return;
          }
          swipeContext.animateContentSwipeTranslation(0, 0, 200);
        },
      }),
    [
      disabled,
      getMatchedDirection,
      isScrollAtStart,
      onDismiss,
      prioritizeNestedScroll,
      swipeContext,
      threshold,
    ]
  );

  return (
    // Bu wrapper sadece gesture yakalayıcıdır.
    // Asıl hareket PortalModalBase içindeki content'e uygulanır.
    <View style={style} {...panResponder.panHandlers}>
      {children}
    </View>
  );
};

const PortalModalBase: FC<PortalModalProps> = ({
  children,
  isVisible: _isVisible,
  exitingTimeout = 300,
  enteringTimeout = 300,
  onBackdropPress,
  onBackButtonPress,
  style,
  backdropStyle,
  contentContainerStyle,
  enteringAnimation,
  exitingAnimation,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const { height, width } = Dimensions.get('screen');

  // Backdrop ve içerik animasyon değerleri
  const backdropOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(1);
  const contentTranslateY = useSharedValue(0);
  const contentTranslateX = useSharedValue(0);
  const contentScale = useSharedValue(1);

  // Swipe sırasında dinamik taşınan ekstra offset'ler
  const contentSwipeTranslateX = useSharedValue(0);
  const contentSwipeTranslateY = useSharedValue(0);

  const setContentSwipeTranslation = useCallback(
    (x: number, y: number) => {
      contentSwipeTranslateX.value = x;
      contentSwipeTranslateY.value = y;
    },
    [contentSwipeTranslateX, contentSwipeTranslateY]
  );

  const animateContentSwipeTranslation = useCallback(
    (x: number, y: number, duration: number) => {
      contentSwipeTranslateX.value = withTiming(x, { duration });
      contentSwipeTranslateY.value = withTiming(y, { duration });
    },
    [contentSwipeTranslateX, contentSwipeTranslateY]
  );

  const swipeContextValue = useMemo<PortalModalSwipeContextValue>(
    () => ({
      screenHeight: height,
      screenWidth: width,
      setContentSwipeTranslation,
      animateContentSwipeTranslation,
    }),
    [animateContentSwipeTranslation, height, setContentSwipeTranslation, width]
  );

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,

    // Modal kapalıyken backdrop touch almaz.
    pointerEvents: isVisible ? 'auto' : 'none',
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
      transform: [
        // Normal enter/exit animasyonu + swipe offset birlikte uygulanır.
        { translateY: contentTranslateY.value + contentSwipeTranslateY.value },
        { translateX: contentTranslateX.value + contentSwipeTranslateX.value },
        { scale: contentScale.value },
      ],
    };
  });

  useEffect(() => {
    if (_isVisible) {
      // Modal açılırken önce local görünürlüğü aktif et.
      setIsVisible(true);
      backdropOpacity.value = withTiming(1, { duration: enteringTimeout });

      // Yeni açılışta tüm değerleri başlangıç noktasına çek.
      contentOpacity.value = 1;
      contentTranslateY.value = 0;
      contentTranslateX.value = 0;
      contentScale.value = 1;
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
      // Modal kapanışında backdrop'u fade-out yap.
      backdropOpacity.value = withTiming(0, { duration: exitingTimeout });

      // Baz state'leri normalize et, çıkış animasyonunu ayrı uygula.
      contentOpacity.value = 1;
      contentTranslateY.value = 0;
      contentTranslateX.value = 0;
      contentScale.value = 1;

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

      const timeout = setTimeout(() => setIsVisible(false), exitingTimeout);
      return () => clearTimeout(timeout);
    }
  }, [
    _isVisible,
    backdropOpacity,
    contentOpacity,
    contentTranslateY,
    contentTranslateX,
    contentScale,
    contentSwipeTranslateX,
    contentSwipeTranslateY,
    enteringAnimation,
    exitingAnimation,
    enteringTimeout,
    exitingTimeout,
    height,
    width,
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
          style={[
            styles.backdrop,
            StyleSheet.flatten(backdropStyle),
            backdropAnimatedStyle,
          ]}
          onTouchStart={onBackdropPress}
        />

        {/* Modal içerik katmanı */}
        <Animated.View
          style={[
            styles.contentContainer,
            StyleSheet.flatten(contentContainerStyle),
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
PortalModal.Swiper = PortalModalSwiper;

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
