# Portal Sistemi (React Native)

Bu paket, uygulamada ekranın üst katmanına içerik taşıyarak (overlay katmanı) modal benzeri yapıları yönetmek için kullanılır.

## Paket İçeriği

- `PortalProvider`: Portal host katmanını oluşturur, portal kayıtlarını yönetir.
- `Portal`: Verilen `children` içeriğini provider host'una mount eder.
- `PortalModal`: Portal üzerinde animasyonlu modal gösterir.

## Bağımlılıklar

Bu portal sistemi aşağıdaki paketleri kullanır:

- `react`
- `react-native`
- `react-native-reanimated` (animasyonlar için)

## Kurulum

```sh
npm install @ebykdrms/react-native-portal-modal react-native-reanimated
```

Portal yapısının çalışması için uygulama ağacında (tercihen üst seviyede) bir `PortalProvider` olmalıdır.

Örnek:

```tsx
import {PortalProvider} from '@ebykdrms/react-native-portal-modal';

export default function AppRoot() {
	return <PortalProvider>{/* uygulamanız */}</PortalProvider>;
}
```

## React Native Reanimated kurulumu

Uygulamanızda Reanimated yoksa resmi kurulum adımlarını tamamlayın:

- https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/

Minimum gerekenler:

1. Babel config içinde `react-native-reanimated/plugin` son plugin olmalıdır.
2. Kurulumdan sonra uygulamayı yeniden build edin (iOS için gerekirse `pod install`).

## React Navigation ile Doğru Kullanım

`navigation.navigate(...)` gibi komutların sorunsuz çalışması için `PortalProvider` yerleşimi önemlidir.

### Doğru Konum (önerilen)

`PortalProvider`'ı `NavigationContainer` içinde ve navigator ağacını saracak şekilde konumlandırın.

```tsx
import {NavigationContainer} from '@react-navigation/native';
import {PortalProvider} from '@ebykdrms/react-native-portal-modal';

export default function Root() {
	return (
		<NavigationContainer>
			<PortalProvider>
				<Tab.Navigator>{/* ekranlar */}</Tab.Navigator>
			</PortalProvider>
		</NavigationContainer>
	);
}
```

Bu yapı, portal içinden açılan modal içeriklerinin navigation lifecycle'ına ve navigator bağlamına erişimini daha güvenli hale getirir.

> Not: Portal altyapısı `@react-navigation/native` bağımlı değildir; bu yerleşim önerisi navigation akışınızla uyumluluk için best-practice olarak kalır.

### Yanlış / Riskli Konum Örneği

`PortalProvider` farklı bir seviyede, navigator ağacından kopuk konumlandırılırsa portal içeriğinde navigation davranışı beklenmedik hale gelebilir.

```tsx
// Riskli örnek (temsilidir)
<PortalProvider>
	<NavigationContainer>
		<Tab.Navigator />
	</NavigationContainer>
</PortalProvider>
```

> Not: Bazı projelerde bu yapı çalışabilir; ancak portal içeriğinin render katmanı değiştiği için navigation ve screen-level context akışında tutarsızlık riski artar.

## Temel Kullanım

### 1) Düşük seviye `Portal` kullanımı

```tsx
import {Portal} from '@ebykdrms/react-native-portal-modal';

function ExampleOverlay({visible}: {visible: boolean}) {
	if (!visible) return null;

	return (
		<Portal>
			<View style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}>
				<Text>Overlay İçeriği</Text>
			</View>
		</Portal>
	);
}
```

### 2) `PortalModal` kullanımı

```tsx
import {PortalModal} from '@ebykdrms/react-native-portal-modal';

<PortalModal
	isVisible={isVisible}
	onBackdropPress={() => setIsVisible(false)}
	onBackButtonPress={() => setIsVisible(false)}
	enteringAnimation="slideInDown"
	exitingAnimation="slideOutDown">
	<View>{/* modal içeriği */}</View>
</PortalModal>;
```

## `PortalModal` Props

- `isVisible` (**zorunlu**): Modal açık/kapalı durumu.
- `enteringTimeout`: Açılış animasyon süresi (ms), varsayılan `300`.
- `exitingTimeout`: Kapanış animasyon süresi (ms), varsayılan `300`.
- `onBackdropPress`: Backdrop dokunma callback'i.
- `onBackButtonPress`: Android geri tuşu callback'i.
- `style`: Modal kök container stili.
- `backdropStyle`: Backdrop stili (`opacity` hariç).
- `contentContainerStyle`: İçerik container stili (`opacity` ve `transform` hariç).
- `enteringAnimation`: Açılış animasyonu (`fadeIn`, `slideInDown`, `slideInUp`, `slideInLeft`, `slideInRight`, `zoomFadeIn`, `zoomIn`).
- `exitingAnimation`: Kapanış animasyonu (`fadeOut`, `slideOutDown`, `slideOutUp`, `slideOutLeft`, `slideOutRight`, `zoomFadeOut`, `zoomOut`).

## `PortalModal.Swiper`

`PortalModal.Swiper`, swipe hareketini belirli bir alandan yakalayıp tüm modal içeriğini birlikte taşır.

### Özellikler

- Swipe alanı lokal olabilir (ör: yalnızca header), ama hareket tüm modal gövdesine uygulanır.
- Çoklu yön destekler.
- Threshold geçilince `onDismiss` tetikler.
- İç scroll ile çakışmayı azaltmak için nested scroll önceliği sunar.

### Props

- `onDismiss` (**zorunlu**): Swipe dismiss tetiklenince çağrılır.
- `threshold`: Kapatma eşiği, varsayılan `120`.
- `style`: Swipe yakalama alanı stili.
- `disabled`: Swipe davranışını kapatır.
- `isScrollAtStart`: İç scroll sınır kontrolü için dışarıdan bayrak.
- `prioritizeNestedScroll`: `true` ise küçük hareketlerde iç scroll öncelikli.
- `swipeDirections`: Tek veya çoklu yön.
	- Tek yön: `"right"`
	- Çoklu yön: `["right", "bottom"]`
	- Varsayılan: `"bottom"`

### Örnek

```tsx
<PortalModal isVisible={visible} onBackdropPress={close} onBackButtonPress={close}>
	<PortalModal.Swiper onDismiss={close} swipeDirections={['right', 'bottom']} threshold={100} style={{paddingTop: 12}}>
		<DragHandle />
	</PortalModal.Swiper>

	<View>{/* modal body */}</View>
</PortalModal>
```

## Context ile İlgili Önemli Not

Portal host, içeriği uygulama ağacında farklı bir katmanda render eder. Bu nedenle bazı ekran-spesifik context'ler portal içinde `undefined` olabilir.

Bu durumda modal içeriğini ilgili context provider ile tekrar sarmalayarak context köprüsü kurabilirsiniz:

```tsx
const value = useContext(MyContext);

<PortalModal isVisible={visible} onBackdropPress={close}>
	<MyContext.Provider value={value}>
		<ModalContent />
	</MyContext.Provider>
</PortalModal>;
```

## Sorun Giderme

- Modal görünmüyorsa: `PortalProvider` üst ağaçta tanımlı mı kontrol edin.
- Swipe çalışmıyorsa: `PortalModal.Swiper` gerçekten modal içinde mi ve `disabled` false mu kontrol edin.
- Scroll ile çakışıyorsa: `prioritizeNestedScroll` değerini ve `isScrollAtStart` akışını kontrol edin.
- Context `undefined` ise: ilgili context'i modal içinde tekrar provider ile köprüleyin.
- `navigation.navigate` çalışmıyorsa: `PortalProvider` konumunu kontrol edin; `NavigationContainer` içinde navigator'ı saracak şekilde yerleştirin.
