# react-native-portal-modal

Bu paket, React Native'deki modal kullanımında yaşanan sorunlara karşı minimal bir çözüm olarak geliştirildi.

React Native'in modal'ı tüm proje katmanının üzerinde bir katman üzerinde çalışırken bu paket JS düzeyinde portal açarak üst katmanlara ulaşma mantığını kullanır. (Not: RNModal bileeninde portal kullanımına gerek yoktur.)

Paket tek başına portal mantığı için de kullanılabileceği gibi asıl amacı modal'dır.


## Paket İçeriği

- `PortalProvider`: Portal'ın açıldığı katmanını oluşturur.
- `Portal`: Verilen `children` içeriğinin `PortalProvider` düzeyinde render edilmesini sağlar.
- `PortalModal`: Portal üzerinde modal açmak için kullanılır.
- `RNModal`: React Native `Modal` tabanlı alternatif; `PortalProvider` gerektirmez.

## Bağımlılıklar

Bu portal sistemi aşağıdaki paketleri kullanır:

- `react`
- `react-native`
- `react-native-reanimated` (**v4+**)
- `react-native-gesture-handler`
- `react-native-worklets`

## Kurulum

Bu paket artık `react-native-reanimated` **v4** API'lerine bağımlıdır; v3 desteklenmez.

Kurulumdan önce aşağıdaki bağımlılıkların proje tarafında kurulu ve yapılandırılmış olduğundan emin olun:

- `react-native-reanimated@^4`
- `react-native-gesture-handler`
- `react-native-worklets`

Kurulum için resmi dokümanlar:

- Reanimated: https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/#installation
- Gesture Handler: https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/installation
- Worklets: https://docs.swmansion.com/react-native-worklets/docs/#installation

Özellikle `React Native Community CLI` kullanan projelerde aşağıdaki adımlar zorunludur:

1. `babel.config.js` içinde `react-native-worklets/plugin` eklensin.
2. `react-native-worklets/plugin` **plugins dizisinde en sonda** olsun.
3. Gesture'ların stabil çalışması için uygulama kökü `GestureHandlerRootView` ile sarılsın.
4. Native bağımlılıklar güncellendikten sonra iOS için pod kurulumu ve Metro cache temizliği yapılsın.

Bağımlılıklar hazırsa paketimizi kurabilirsiniz:

```sh
npm install @ebykdrms/react-native-portal-modal
```

## Kullanım

Portal yapısının çalışması için uygulama ağacında (tercihen üst seviyelerde) bir `PortalProvider` olmalıdır.

Örnek:

```tsx
import {PortalProvider} from '@ebykdrms/react-native-portal-modal';

export default function AppRoot() {
	return <PortalProvider>{/* uygulamanız */}</PortalProvider>;
}
```

## React Navigation ile Doğru Kullanım

`react-navigation` kullanıyorsanız `navigation.navigate(...)` gibi komutların sorunsuz çalışması için `PortalProvider` yerleşimi önemlidir.

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

## Temel Kullanım

### 1) `Portal` kullanımı

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

### 3) `RNModal` kullanımı (Provider gerektirmez)
Bu bileşen PortalModal'a alternatif olarak doğrudan react-native'in Modal bileşenini kullanır. Böylece en üst katmanda görüntülenme konusunu çözer. Ancak tüm swipe, backdrop, açılma/kapanma animasyonları yine reanimated ile gerçekleştirilmiştir.

```tsx
import {RNModal} from '@ebykdrms/react-native-portal-modal';

<RNModal
	isVisible={isVisible}
	onBackdropPress={() => setIsVisible(false)}
	onBackButtonPress={() => setIsVisible(false)}
	enteringAnimation="slideInDown"
	exitingAnimation="slideOutDown">
	<View>{/* modal içeriği */}</View>
</RNModal>;
```

## `PortalModal` Props

| Prop | Açıklama | Varsayılan / Notlar |
| --- | --- | --- |
| `isVisible` | Modal açık/kapalı durumu. | **zorunlu** |
| `enteringTimeout` | Açılış animasyon süresi (ms). | `500` |
| `exitingTimeout` | Kapanış animasyon süresi (ms). | `300` |
| `onModalHide` | Kapanış animasyonu sonrası callback. | - |
| `onBackdropPress` | Backdrop dokunma callback'i. | - |
| `onBackButtonPress` | Android geri tuşu callback'i. | - |
| `style` | Modal kök container stili. | - |
| `backdropStyle` | Backdrop stili (opacity hariç). | - |
| `contentContainerStyle` | İçerik container stili (opacity ve transform hariç). | - |
| `enteringAnimation` | Açılış animasyonu. | `fadeIn`, `slideInDown`, `slideInUp`, `slideInLeft`, `slideInRight`, `zoomFadeIn`, `zoomIn` |
| `exitingAnimation` | Kapanış animasyonu. | `fadeOut`, `slideOutDown`, `slideOutUp`, `slideOutLeft`, `slideOutRight`, `zoomFadeOut`, `zoomOut` |

## `PortalModal.Swiper`

`PortalModal.Swiper`, Modal'a swipe özelliği kazandırır. Kullanıcı bu bileşenin bulunduğu alana basılı tutarak modal'ı kaydırabilir.

### Özellikler

- Swipe alanı tüm modal content'ini sarabileceği gibi belli bir alanda da olabilir (ör: yalnızca header).
- Hangi yönde kaydırma yapacağı `swipeDirections` prop'unda belirtilmelidir.
- Threshold geçilince `onDismiss` prop'u tetiklenir.
- İç scroll ile çakışmayı azaltmak için nested scroll önceliği sunar.

### Props

| Prop | Açıklama | Varsayılan / Notlar |
| --- | --- | --- |
| `onDismiss` | Swipe dismiss tetiklenince çağrılır. | **zorunlu** |
| `threshold` | Kapatma eşiği (piksel). | `120` |
| `style` | Swipe yakalama alanı stili. | - |
| `disabled` | Swipe davranışını kapatır. | - |
| `isScrollAtStart` | İç scroll sınır kontrolü için dışarıdan bayrak. | - |
| `prioritizeNestedScroll` | `true` ise küçük hareketlerde iç scroll öncelikli. | - |
| `swipeDirections` | Kaydırma yönleri; tek değer veya dizi alır. | Tek: `"right"`; Çoklu örnek: `["right", "bottom"]`; Varsayılan: `"bottom"` |

### Örnek

```tsx
<PortalModal isVisible={visible} onBackdropPress={close} onBackButtonPress={close}>
	<PortalModal.Swiper onDismiss={close} swipeDirections={['right', 'bottom']} threshold={100} style={{paddingTop: 12}}>
		<View><Text>---</Text></View>
	</PortalModal.Swiper>
	<View>{/* modal body */}</View>
</PortalModal>
```

`RNModal.Swiper` API'si `PortalModal.Swiper` ile aynıdır.

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
- `RNModal` kullanıyorsanız `PortalProvider` gerekmez.
- Swipe çalışmıyorsa: `PortalModal.Swiper` gerçekten modal içinde mi ve `disabled` false mu kontrol edin.
- Scroll ile çakışıyorsa: `prioritizeNestedScroll` değerini ve `isScrollAtStart` akışını kontrol edin.
- Context `undefined` ise: ilgili context'i modal içinde tekrar provider ile köprüleyin.
- React Navigation kullanıyorsanız ve `navigation.navigate` çalışmıyorsa: `PortalProvider` konumunu kontrol edin; `NavigationContainer` içinde navigator'ı saracak şekilde yerleştirin.