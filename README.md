# react-native-portal-modal

Bu paket, React Native'deki modal kullanımında yaşanan sorunlara karşı minimal bir çözüm olarak geliştirildi.

React Native'in modal'ı tüm proje katmanının üzerinde bir katman üzerinde çalışırken bu paket JS düzeyinde portal açarak üst katmanlara ulaşma mantığını kullanır.

Paket tek başına portal mantığı için de kullanılabileceği gibi asıl amacı bunun üzerine inşa edilen modal'dır.


## Paket İçeriği

- `PortalProvider`: Portal'ın açıldığı katmanını oluşturur.
- `Portal`: Verilen `children` içeriğinin `PortalProvider` düzeyinde render edilmesini sağlar.
- `PortalModal`: Portal üzerinde modal açmak için kullanılır.

## Bağımlılıklar

Bu portal sistemi aşağıdaki paketleri kullanır:

- `react`
- `react-native`
- `react-native-reanimated` (min v3)

## Kurulum

Projenizde `react-native-reanimated` paketinin kurulu olduğundan emin olun. V3 ve V4 için farklı kurulum yönergeleri olduğundan doğrudan [projenin dokümantasyonu](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started)ndaki yönergeleri izlemelisiniz.

Projede basit Reanimated fonksiyonları kullanıldığı için v3-v4 versiyon farkından etkilenmeyecektir.

Reanimated kuruluysa bizim paketimizi doğrduan kurabilir ve doğrudan kullanabilirsiniz. Ek bir kurulum gerektirmez:

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

## `PortalModal` Props

| Prop | Açıklama | Varsayılan / Notlar |
| --- | --- | --- |
| `isVisible` | Modal açık/kapalı durumu. | **zorunlu** |
| `enteringTimeout` | Açılış animasyon süresi (ms). | `300` |
| `exitingTimeout` | Kapanış animasyon süresi (ms). | `300` |
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
- React Navigation kullanıyorsanız ve `navigation.navigate` çalışmıyorsa: `PortalProvider` konumunu kontrol edin; `NavigationContainer` içinde navigator'ı saracak şekilde yerleştirin.