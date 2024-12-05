import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import { RootSiblingParent } from "react-native-root-siblings";

import { useThemeColor } from "@/hooks/useThemeColor";
import { StatusBar } from "expo-status-bar";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
	const [loaded] = useFonts({
		SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
	});

	const headerStyle = { backgroundColor: useThemeColor({}, "background") };

	useEffect(() => {
		if (loaded) {
			SplashScreen.hideAsync();
		}
	}, [loaded]);

	if (!loaded) {
		return null;
	}

	return (
		<RootSiblingParent>
			<StatusBar />
			<Stack screenOptions={{ headerStyle: headerStyle }}>
				<Stack.Screen name="index" options={{ headerShown: false }} />
				<Stack.Screen name="+not-found" />
			</Stack>
		</RootSiblingParent>
	);
}
