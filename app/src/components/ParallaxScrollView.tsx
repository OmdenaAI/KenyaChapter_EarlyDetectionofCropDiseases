import type { PropsWithChildren, ReactElement } from "react";
import { StyleProp, StyleSheet, useColorScheme, ViewStyle } from "react-native";
import Animated, {
	interpolate,
	useAnimatedRef,
	useAnimatedStyle,
	useScrollViewOffset,
} from "react-native-reanimated";

import ThemedView from "@/components/ThemedView";

const HEADER_HEIGHT = 250;

type Props = PropsWithChildren<{
	childrenStyle?: StyleProp<ViewStyle>;
	headerImage?: ReactElement;
	headerBackgroundColor?: { dark: string; light: string };
}>;

export default function ParallaxScrollView({
	children,
	childrenStyle,
	headerImage,
	headerBackgroundColor = { light: "#D0D0D0", dark: "#353636" },
}: Props) {
	const colorScheme = useColorScheme() ?? "light";
	const scrollRef = useAnimatedRef<Animated.ScrollView>();
	const scrollOffset = useScrollViewOffset(scrollRef);

	const headerAnimatedStyle = useAnimatedStyle(() => {
		return {
			transform: [
				{
					translateY: interpolate(
						scrollOffset.value,
						[-HEADER_HEIGHT, 0, HEADER_HEIGHT],
						[-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75]
					),
				},
				{
					scale: interpolate(
						scrollOffset.value,
						[-HEADER_HEIGHT, 0, HEADER_HEIGHT],
						[2, 1, 1]
					),
				},
			],
		};
	});

	let animatedHeaderImage = null;
	if (headerImage)
		animatedHeaderImage = (
			<Animated.View
				style={[
					styles.header,
					{ backgroundColor: headerBackgroundColor[colorScheme] },
					headerAnimatedStyle,
				]}
			>
				{headerImage}
			</Animated.View>
		);

	if (!childrenStyle) childrenStyle = styles.content;

	return (
		<ThemedView style={styles.container}>
			<Animated.ScrollView ref={scrollRef} scrollEventThrottle={16}>
				{animatedHeaderImage}
				<ThemedView style={childrenStyle}>{children}</ThemedView>
			</Animated.ScrollView>
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
