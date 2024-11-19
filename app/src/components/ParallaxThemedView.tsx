import type { PropsWithChildren, ReactElement } from "react";
import { StyleProp, StyleSheet, useColorScheme, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

import ThemedView from "@/components/ThemedView";

type Props = PropsWithChildren<{
	childrenStyle?: StyleProp<ViewStyle>;
	headerImage?: ReactElement;
	headerBackgroundColor?: { dark: string; light: string };
	headerStyle?: StyleProp<ViewStyle>;
}>;

export default function ParallaxThemedView({
	children,
	childrenStyle,
	headerImage,
	headerBackgroundColor = { light: "#D0D0D0", dark: "#353636" },
	headerStyle,
}: Props) {
	if (!childrenStyle) childrenStyle = styles.content;
	if (!headerStyle) headerStyle = styles.header;

	const colorScheme = useColorScheme() ?? "light";

	let HeaderImage = null;
	if (headerImage && headerBackgroundColor)
		HeaderImage = (
			<Animated.View
				style={[
					headerStyle,
					{ backgroundColor: headerBackgroundColor[colorScheme] },
				]}
			>
				{headerImage}
			</Animated.View>
		);

	return (
		<ThemedView style={styles.container}>
			{HeaderImage}
			<ThemedView style={childrenStyle}>{children}</ThemedView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		height: 250,
		overflow: "hidden",
	},
	content: {
		flex: 1,
		padding: 32,
		gap: 16,
		overflow: "hidden",
	},
});
