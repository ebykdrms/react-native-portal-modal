# @ebykdrms/react-native-portal-modal

JS düzeyinde portal ve reanimated destekli bir modalBir portal ve reanimated ile desteklenen modal

## Installation


```sh
npm install @ebykdrms/react-native-portal-modal react-native-reanimated
```


## Usage


```tsx
import React, { useState } from 'react';
import { Button, Text, View } from 'react-native';
import { PortalProvider, PortalModal } from '@ebykdrms/react-native-portal-modal';

export default function App() {
	const [visible, setVisible] = useState(false);

	return (
		<PortalProvider>
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
				<Button title="Open modal" onPress={() => setVisible(true)} />
			</View>

			<PortalModal
				isVisible={visible}
				onBackdropPress={() => setVisible(false)}
				enteringAnimation="fadeIn"
				exitingAnimation="fadeOut"
			>
				<View style={{ margin: 24, padding: 16, borderRadius: 12, backgroundColor: '#fff' }}>
					<Text>Portal modal content</Text>
				</View>
			</PortalModal>
		</PortalProvider>
	);
}
```


## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
