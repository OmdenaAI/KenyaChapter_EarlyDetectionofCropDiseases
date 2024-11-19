import { Tabs } from "expo-router";
import React from "react";
import { useColorScheme } from "react-native";

import TabBarIcon from "@/components/navigation/TabBarIcon";
import Colors from "@/constants/Colors";

const CameraTabIcon = ({ color, focused }: { color: any; focused: any }) => (
	<TabBarIcon name={focused ? "eye" : "eye-outline"} color={color} />
);

export default function TabLayout() {
	const colorScheme = useColorScheme();

	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
				headerShown: false,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
					tabBarIcon: CameraTabIcon,
				}}
			/>
		</Tabs>
	);
}
